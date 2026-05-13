import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { from, of } from 'rxjs';
import { switchMap, take, tap } from 'rxjs/operators';

import { CARDIO_STATE_DEFAULTS, CardioStateModel } from './cardio.model';
import { Cardio } from './cardio.actions';
import { Energy } from '../energy/energy.actions';
import { AuthState } from '../auth/auth.state';
import { EnergyState } from '../energy/energy.state';
import {
  ActiveCardioSession,
  CardioActivityType,
  CardioBounds,
  CardioSession,
  RawTrackPoint,
} from '../../core/models/cardio-session.model';
import { CardioSessionRepository } from '../../data/repositories/cardio-session.repository';
import {
  ActiveCardioBufferService,
} from '../../features/cardio/services/active-cardio-buffer.service';
import {
  DEFAULT_TELEMETRY_INTERVAL_SEC,
  RouteEncodingService,
} from '../../features/cardio/services/route-encoding.service';
import { CardioTrackBlobService } from '../../features/cardio/services/cardio-track-blob.service';
import { estimateCalories } from '../../features/cardio/shared/cardio-calc';
import { toDateString } from '../../core/services/date.util';

/**
 * Caps Firestore-doc-bound telemetry samples to a safe budget that keeps
 * us well under the 1MB per-doc limit even on multi-hour sessions.
 */
const MAX_TELEMETRY_SAMPLES = 1500;

@State<CardioStateModel>({
  name: 'cardio',
  defaults: CARDIO_STATE_DEFAULTS,
})
@Injectable()
export class CardioState {
  private readonly store = inject(Store);
  private readonly buffer = inject(ActiveCardioBufferService);
  private readonly encoder = inject(RouteEncodingService);
  private readonly sessionRepo = inject(CardioSessionRepository);
  private readonly blobService = inject(CardioTrackBlobService);

  // ── Selectors ──

  @Selector()
  static recordingStatus(s: CardioStateModel) {
    return s.recordingStatus;
  }

  @Selector()
  static activeSession(s: CardioStateModel): ActiveCardioSession | null {
    return s.activeSession;
  }

  @Selector()
  static isRecording(s: CardioStateModel): boolean {
    return s.recordingStatus !== 'idle';
  }

  @Selector()
  static weakSignal(s: CardioStateModel): boolean {
    return s.weakSignal;
  }

  @Selector()
  static sessions(s: CardioStateModel): CardioSession[] {
    return s.sessions;
  }

  @Selector()
  static sessionsLoading(s: CardioStateModel): boolean {
    return s.sessionsLoading;
  }

  @Selector()
  static selectedSession(s: CardioStateModel): CardioSession | null {
    return s.selectedSession;
  }

  @Selector()
  static uploadProgress(s: CardioStateModel): number | null {
    return s.uploadProgress;
  }

  // ── Actions ──

  @Action(Cardio.StartSession)
  async startSession(ctx: StateContext<CardioStateModel>, action: Cardio.StartSession) {
    const now = Date.now();
    const sessionLocalId = this.generateLocalId();
    const active: ActiveCardioSession = {
      sessionLocalId,
      activityType: action.activityType,
      startedAt: now,
      movingTimeSec: 0,
      totalTimeSec: 0,
      distanceM: 0,
      elevationGainM: 0,
      elevationLossM: 0,
      currentSpeedMs: null,
      currentElevationM: null,
      lastPoint: null,
      currentAccuracyM: null,
      pointCount: 0,
      autoPauseCount: 0,
      lastAutoPauseAt: null,
    };
    ctx.patchState({
      recordingStatus: 'recording',
      activeSession: active,
      weakSignal: false,
      error: null,
    });
    await this.buffer.start(sessionLocalId, action.activityType);
  }

  @Action(Cardio.PauseSession)
  pauseSession(ctx: StateContext<CardioStateModel>) {
    if (ctx.getState().recordingStatus === 'recording') {
      ctx.patchState({ recordingStatus: 'paused' });
    }
  }

  @Action(Cardio.ResumeSession)
  resumeSession(ctx: StateContext<CardioStateModel>) {
    const status = ctx.getState().recordingStatus;
    if (status === 'paused' || status === 'auto-paused') {
      ctx.patchState({ recordingStatus: 'recording' });
    }
  }

  @Action(Cardio.AutoPaused)
  autoPaused(ctx: StateContext<CardioStateModel>) {
    const s = ctx.getState();
    if (!s.activeSession) return;
    ctx.patchState({
      recordingStatus: 'auto-paused',
      activeSession: {
        ...s.activeSession,
        autoPauseCount: s.activeSession.autoPauseCount + 1,
        lastAutoPauseAt: Date.now(),
      },
    });
  }

  @Action(Cardio.AutoResumed)
  autoResumed(ctx: StateContext<CardioStateModel>) {
    if (ctx.getState().recordingStatus === 'auto-paused') {
      ctx.patchState({ recordingStatus: 'recording' });
    }
  }

  @Action(Cardio.WeakSignalChanged)
  weakSignalChanged(ctx: StateContext<CardioStateModel>, action: Cardio.WeakSignalChanged) {
    if (ctx.getState().weakSignal !== action.weakSignal) {
      ctx.patchState({ weakSignal: action.weakSignal });
    }
  }

  @Action(Cardio.PointRecorded)
  pointRecorded(ctx: StateContext<CardioStateModel>, action: Cardio.PointRecorded) {
    const state = ctx.getState();
    const active = state.activeSession;
    if (!active) return;

    this.buffer.append(action.tick.point);

    const isMoving = state.recordingStatus === 'recording';
    const isPaused = state.recordingStatus !== 'recording';

    const dDist = isPaused ? 0 : action.tick.deltaDistanceM;
    const dEle = isPaused ? 0 : action.tick.deltaElevationM;
    const elevGain = dEle > 0 ? dEle : 0;
    const elevLoss = dEle < 0 ? -dEle : 0;
    const speed = action.tick.smoothedSpeedMs;

    const updated: ActiveCardioSession = {
      ...active,
      distanceM: active.distanceM + dDist,
      elevationGainM: active.elevationGainM + elevGain,
      elevationLossM: active.elevationLossM + elevLoss,
      currentSpeedMs: isMoving ? speed : 0,
      currentElevationM: action.tick.point.ele,
      currentAccuracyM: action.tick.point.acc,
      lastPoint: { lat: action.tick.point.lat, lng: action.tick.point.lng },
      pointCount: active.pointCount + 1,
    };

    ctx.patchState({
      activeSession: updated,
      weakSignal: action.tick.weakSignal,
    });
  }

  @Action(Cardio.TickTime)
  tickTime(ctx: StateContext<CardioStateModel>) {
    const state = ctx.getState();
    const active = state.activeSession;
    if (!active) return;
    const isMoving = state.recordingStatus === 'recording';
    const totalTimeSec = Math.floor((Date.now() - active.startedAt) / 1000);
    ctx.patchState({
      activeSession: {
        ...active,
        totalTimeSec,
        movingTimeSec: isMoving ? active.movingTimeSec + 1 : active.movingTimeSec,
      },
    });
  }

  @Action(Cardio.DiscardSession)
  async discardSession(ctx: StateContext<CardioStateModel>) {
    const active = ctx.getState().activeSession;
    if (active) {
      try {
        await this.buffer.clear(active.sessionLocalId);
      } catch {
        /* noop */
      }
    }
    ctx.patchState({
      recordingStatus: 'idle',
      activeSession: null,
      weakSignal: false,
      uploadProgress: null,
    });
  }

  @Action(Cardio.FinishSession)
  finishSession(ctx: StateContext<CardioStateModel>, action: Cardio.FinishSession) {
    const state = ctx.getState();
    const active = state.activeSession;
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!active || !uid) return;

    ctx.patchState({ recordingStatus: 'finishing', uploadProgress: 0 });

    return from(this.persistSession(uid, active, action.overrides?.caloriesBurned)).pipe(
      tap(() => {
        ctx.patchState({
          recordingStatus: 'idle',
          activeSession: null,
          uploadProgress: null,
          weakSignal: false,
        });
      }),
      switchMap(() => ctx.dispatch(new Cardio.LoadSessions())),
    );
  }

  @Action(Cardio.LoadSessions)
  loadSessions(ctx: StateContext<CardioStateModel>, action: Cardio.LoadSessions) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;
    ctx.patchState({ sessionsLoading: true });
    return this.sessionRepo.listByUser(uid, action.limit).pipe(
      take(1),
      tap(rows => {
        ctx.patchState({
          sessions: rows.map(r => this.normalizeDates(r)),
          sessionsLoading: false,
        });
      }),
    );
  }

  @Action(Cardio.LoadSessionDetail)
  loadSessionDetail(ctx: StateContext<CardioStateModel>, action: Cardio.LoadSessionDetail) {
    ctx.patchState({ selectedSession: null });
    return this.sessionRepo.getById(action.id).pipe(
      take(1),
      tap(row => {
        ctx.patchState({ selectedSession: row ? this.normalizeDates(row) : null });
      }),
    );
  }

  @Action(Cardio.DeleteSession)
  deleteSession(ctx: StateContext<CardioStateModel>, action: Cardio.DeleteSession) {
    return from(this.sessionRepo.remove(action.id)).pipe(
      switchMap(() => ctx.dispatch(new Cardio.LoadSessions())),
    );
  }

  // ── Helpers ──

  private async persistSession(
    uid: string,
    active: ActiveCardioSession,
    caloriesOverride: number | undefined,
  ): Promise<void> {
    const points = await this.buffer.readAll(active.sessionLocalId);
    if (points.length === 0) {
      await this.buffer.clear(active.sessionLocalId);
      return;
    }

    const acceptedPoints = points.filter(p => p.acc <= 30);
    const polyline = this.encoder.encodePolyline(
      acceptedPoints.map(p => ({ lat: p.lat, lng: p.lng })),
    );
    const elevations = acceptedPoints
      .filter(p => p.ele !== null)
      .map(p => p.ele as number);
    const elevationPolyline = this.encoder.encodeIntegers(elevations);

    // Adapt telemetry interval to keep doc under the limit.
    let interval = DEFAULT_TELEMETRY_INTERVAL_SEC;
    const durationSec = active.totalTimeSec || Math.max(1, points.length);
    if (durationSec / interval > MAX_TELEMETRY_SAMPLES) {
      interval = Math.ceil(durationSec / MAX_TELEMETRY_SAMPLES);
    }
    const telemetry = this.encoder.downsample(points, interval);

    const bounds = this.computeBounds(acceptedPoints);
    const startedAt = new Date(active.startedAt);
    const endedAt = new Date(active.startedAt + active.totalTimeSec * 1000);
    const date = toDateString(endedAt);
    const movingTime = Math.max(1, active.movingTimeSec);
    const avgSpeed = active.distanceM / movingTime;
    const maxSpeed = points.reduce((m, p) => (p.spd && p.spd > m ? p.spd : m), 0);
    const weightKg =
      this.store.selectSnapshot(EnergyState.goalSettings)?.weightKg ?? null;
    const estimatedCalories =
      caloriesOverride !== undefined
        ? Math.round(caloriesOverride)
        : estimateCalories(active.activityType, movingTime, weightKg);

    // Persist Firestore doc first (small, fast). Storage upload follows.
    const docPayload: Omit<CardioSession, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: uid,
      activityType: active.activityType,
      date,
      startedAt,
      endedAt,
      durationSec: movingTime,
      totalDurationSec: active.totalTimeSec,
      distanceM: Math.round(active.distanceM),
      elevationGainM: Math.round(active.elevationGainM),
      elevationLossM: Math.round(active.elevationLossM),
      avgSpeedMs: Math.round(avgSpeed * 100) / 100,
      maxSpeedMs: Math.round(maxSpeed * 100) / 100,
      caloriesBurned: estimatedCalories,
      pointCount: points.length,
      autoPauseCount: active.autoPauseCount,
      polyline,
      elevationPolyline,
      bounds,
      telemetry,
      telemetryIntervalSec: interval,
      fullTrackPath: null,
    };

    const sessionId = await this.sessionRepo.create(docPayload);

    // Upload raw blob to Storage; tolerate failure (we already have a usable doc).
    try {
      const path = await this.blobService.uploadFullTrack(uid, sessionId, points);
      await this.sessionRepo.update(sessionId, { fullTrackPath: path });
    } catch {
      // Falls back to embedded telemetry — full-fidelity replay will be unavailable.
    }

    // Roll up into the existing CardioEntry stream so dashboard / energy stay consistent.
    await this.store
      .dispatch(
        new Energy.AddCardio({
          date,
          type: this.activityTypeLabel(active.activityType),
          durationMinutes: Math.round(movingTime / 60),
          distanceKm: Math.round((active.distanceM / 1000) * 100) / 100,
          caloriesBurned: estimatedCalories,
          routeSessionId: sessionId,
          elevationGainM: Math.round(active.elevationGainM),
        }),
      )
      .toPromise();

    await this.buffer.clear(active.sessionLocalId);
  }

  private computeBounds(points: RawTrackPoint[]): CardioBounds {
    if (points.length === 0) {
      return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    }
    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    return { minLat, maxLat, minLng, maxLng };
  }

  private activityTypeLabel(t: CardioActivityType): string {
    switch (t) {
      case 'mtb':
        return 'Mountain Biking';
      case 'emtb':
        return 'eMTB';
      case 'run':
        return 'Running';
      case 'hike':
        return 'Hiking';
    }
  }

  private normalizeDates(row: CardioSession): CardioSession {
    const asDate = (v: unknown): Date => {
      if (v instanceof Date) return v;
      // Firestore Timestamp duck-typing
      const maybe = v as { toDate?: () => Date } | null | undefined;
      if (maybe && typeof maybe.toDate === 'function') return maybe.toDate();
      return new Date(v as string | number);
    };
    return {
      ...row,
      startedAt: asDate(row.startedAt),
      endedAt: asDate(row.endedAt),
    };
  }

  private generateLocalId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `cs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
