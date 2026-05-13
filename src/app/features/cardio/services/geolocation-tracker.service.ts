import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { RawTrackPoint } from '../../../core/models/cardio-session.model';
import { RouteEncodingService } from './route-encoding.service';

/** Drop points worse than this for distance/elevation accumulation. */
const MIN_ACCURACY_M = 30;
/** Mark UI as "weak signal" once accuracy exceeds this. */
export const WEAK_SIGNAL_ACCURACY_M = 100;
/** Floor for elevation deltas to reject GPS noise. */
const ELEVATION_NOISE_FLOOR_M = 3;
/** Window for auto-pause detection. */
const AUTO_PAUSE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_PAUSE_DISPLACEMENT_M = 10;
const AUTO_PAUSE_RESUME_M = 15;
const SPEED_SMOOTHING_WINDOW = 5;

export interface TrackerTick {
  point: RawTrackPoint;
  /** Smoothed speed in m/s. May fall back to point.spd if unavailable. */
  smoothedSpeedMs: number | null;
  /** Distance increment from last accepted point, in meters. */
  deltaDistanceM: number;
  /** Elevation increment from last accepted point. Positive = climb. */
  deltaElevationM: number;
  /** True if accuracy exceeds the configured weak signal threshold. */
  weakSignal: boolean;
}

/**
 * Wraps the browser Geolocation API into an Observable<TrackerTick> stream
 * plus derived metrics (distance, elevation gain, smoothed speed) and an
 * auto-pause detector.
 */
@Injectable({ providedIn: 'root' })
export class GeolocationTrackerService {
  private watchId: number | null = null;
  private lastAcceptedPoint: RawTrackPoint | null = null;
  private speedWindow: number[] = [];
  private autoPauseBuffer: RawTrackPoint[] = [];
  private pauseAnchor: { lat: number; lng: number } | null = null;
  private autoPaused = false;
  private active = false;

  readonly tick$ = new Subject<TrackerTick>();
  readonly autoPause$ = new Subject<void>();
  readonly autoResume$ = new Subject<void>();
  readonly error$ = new Subject<GeolocationPositionError>();

  constructor(private readonly encoder: RouteEncodingService) {}

  start(): void {
    if (this.active) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.error$.next({
        code: 2,
        message: 'Geolocation API not available',
      } as GeolocationPositionError);
      return;
    }
    this.active = true;
    this.lastAcceptedPoint = null;
    this.speedWindow = [];
    this.autoPauseBuffer = [];
    this.pauseAnchor = null;
    this.autoPaused = false;
    this.watchId = navigator.geolocation.watchPosition(
      pos => this.onPosition(pos),
      err => this.error$.next(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }

  stop(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.active = false;
    this.autoPaused = false;
    this.autoPauseBuffer = [];
  }

  /**
   * One-shot permission probe. Resolves once a position is delivered or
   * rejects if denied/unavailable. Use in the onboarding step.
   */
  async requestPermission(): Promise<GeolocationPosition> {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation API not available'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }

  isActive(): boolean {
    return this.active;
  }

  private onPosition(pos: GeolocationPosition): void {
    const point: RawTrackPoint = {
      t: pos.timestamp,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      ele: pos.coords.altitude ?? null,
      acc: pos.coords.accuracy,
      spd: typeof pos.coords.speed === 'number' && !isNaN(pos.coords.speed) ? pos.coords.speed : null,
    };

    const weakSignal = point.acc > WEAK_SIGNAL_ACCURACY_M;
    const accepted = point.acc <= MIN_ACCURACY_M;

    let deltaDistanceM = 0;
    let deltaElevationM = 0;

    if (accepted) {
      if (this.lastAcceptedPoint) {
        deltaDistanceM = this.encoder.haversineMeters(this.lastAcceptedPoint, point);
        if (point.ele !== null && this.lastAcceptedPoint.ele !== null) {
          const dEle = point.ele - this.lastAcceptedPoint.ele;
          if (Math.abs(dEle) >= ELEVATION_NOISE_FLOOR_M) {
            deltaElevationM = dEle;
          }
        }
      }
      this.lastAcceptedPoint = point;
    }

    const smoothedSpeedMs = this.smoothSpeed(point.spd);
    this.handleAutoPause(point);

    if (this.autoPaused) {
      point.paused = 1;
    }

    this.tick$.next({
      point,
      smoothedSpeedMs,
      deltaDistanceM: this.autoPaused ? 0 : deltaDistanceM,
      deltaElevationM: this.autoPaused ? 0 : deltaElevationM,
      weakSignal,
    });
  }

  private smoothSpeed(spd: number | null): number | null {
    if (spd === null || isNaN(spd)) {
      if (this.speedWindow.length === 0) return null;
    } else {
      this.speedWindow.push(spd);
      if (this.speedWindow.length > SPEED_SMOOTHING_WINDOW) this.speedWindow.shift();
    }
    if (this.speedWindow.length === 0) return null;
    const sum = this.speedWindow.reduce((a, b) => a + b, 0);
    return sum / this.speedWindow.length;
  }

  private handleAutoPause(point: RawTrackPoint): void {
    const now = point.t;
    this.autoPauseBuffer.push(point);
    while (
      this.autoPauseBuffer.length > 1 &&
      now - this.autoPauseBuffer[0].t > AUTO_PAUSE_WINDOW_MS
    ) {
      this.autoPauseBuffer.shift();
    }

    if (!this.autoPaused) {
      if (
        this.autoPauseBuffer.length >= 2 &&
        now - this.autoPauseBuffer[0].t >= AUTO_PAUSE_WINDOW_MS
      ) {
        const maxDisp = this.maxDisplacement(this.autoPauseBuffer);
        if (maxDisp < AUTO_PAUSE_DISPLACEMENT_M) {
          this.autoPaused = true;
          this.pauseAnchor = { lat: point.lat, lng: point.lng };
          this.autoPause$.next();
        }
      }
    } else if (this.pauseAnchor) {
      const dist = this.encoder.haversineMeters(this.pauseAnchor, point);
      if (dist >= AUTO_PAUSE_RESUME_M) {
        this.autoPaused = false;
        this.pauseAnchor = null;
        this.autoResume$.next();
      }
    }
  }

  private maxDisplacement(points: RawTrackPoint[]): number {
    if (points.length < 2) return 0;
    let max = 0;
    const ref = points[0];
    for (let i = 1; i < points.length; i++) {
      const d = this.encoder.haversineMeters(ref, points[i]);
      if (d > max) max = d;
    }
    return max;
  }
}
