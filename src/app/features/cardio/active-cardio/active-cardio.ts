import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';

import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioState } from '../../../store/cardio/cardio.state';
import { CARDIO_ACTIVITIES } from '../../../core/models/cardio-session.model';
import { GeolocationTrackerService } from '../services/geolocation-tracker.service';
import { WakeLockService } from '../services/wake-lock.service';
import { CesiumMapService, LiveViewerHandle } from '../services/cesium-map.service';
import { MetricTileComponent } from '../shared/metric-tile/metric-tile';
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from '../shared/cardio-calc';

@Component({
  selector: 'app-active-cardio',
  standalone: true,
  imports: [MetricTileComponent],
  templateUrl: './active-cardio.html',
  styleUrl: './active-cardio.scss',
})
export class ActiveCardioComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly tracker = inject(GeolocationTrackerService);
  private readonly wakeLock = inject(WakeLockService);
  private readonly cesium = inject(CesiumMapService);

  protected readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private liveViewer: LiveViewerHandle | null = null;

  protected readonly session = this.store.selectSignal(CardioState.activeSession);
  protected readonly recordingStatus = this.store.selectSignal(CardioState.recordingStatus);
  protected readonly weakSignal = this.store.selectSignal(CardioState.weakSignal);
  protected readonly wakeLockActive = this.wakeLock.active;

  protected readonly showWakeLockToast = signal(false);
  protected readonly showDiscardConfirm = signal(false);

  protected readonly activityMeta = computed(() => {
    const s = this.session();
    return s ? CARDIO_ACTIVITIES[s.activityType] : null;
  });

  protected readonly distance = computed(() => formatDistanceKm(this.session()?.distanceM ?? 0));
  protected readonly elapsed = computed(() => formatDuration(this.session()?.totalTimeSec ?? 0));
  protected readonly elevation = computed(() => Math.round(this.session()?.elevationGainM ?? 0));
  protected readonly speedOrPace = computed(() => {
    const s = this.session();
    if (!s) return '—';
    const speed = s.currentSpeedMs ?? 0;
    return this.activityMeta()?.primaryMetric === 'pace'
      ? formatPace(speed)
      : formatSpeedKmh(speed);
  });
  protected readonly speedOrPaceLabel = computed(() => {
    return this.activityMeta()?.primaryMetric === 'pace' ? 'Pace' : 'Speed';
  });
  protected readonly speedOrPaceUnit = computed(() => {
    return this.activityMeta()?.primaryMetric === 'pace' ? 'min/km' : 'km/h';
  });

  protected readonly accuracyTier = computed(() => {
    const acc = this.session()?.currentAccuracyM ?? null;
    if (acc === null) return { label: 'Locating', dots: 0, level: 'low' as const };
    if (acc <= 15) return { label: 'Strong', dots: 3, level: 'strong' as const };
    if (acc <= 40) return { label: 'Fair', dots: 2, level: 'fair' as const };
    return { label: 'Weak', dots: 1, level: 'weak' as const };
  });

  private subs: Subscription[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const s = this.session();
      if (!s) {
        // No active session — bounce to hub.
        queueMicrotask(() => this.router.navigate(['/cardio']));
      }
    });
  }

  async ngOnInit() {
    if (!this.session()) return;

    this.subs.push(
      this.tracker.tick$.subscribe(tick => {
        this.store.dispatch(new Cardio.PointRecorded(tick));
        if (this.liveViewer) {
          this.liveViewer.push({
            lat: tick.point.lat,
            lng: tick.point.lng,
            ele: tick.point.ele,
          });
        }
      }),
    );
    this.subs.push(this.tracker.autoPause$.subscribe(() => this.store.dispatch(new Cardio.AutoPaused())));
    this.subs.push(this.tracker.autoResume$.subscribe(() => this.store.dispatch(new Cardio.AutoResumed())));
    this.subs.push(this.wakeLock.released$.subscribe(() => this.flashWakeLockToast()));

    this.tracker.start();
    await this.wakeLock.acquire();
    this.tickInterval = setInterval(() => this.store.dispatch(new Cardio.TickTime()), 1000);

    // Mount Cesium after the view paints. Tolerate failure — the metric tiles
    // remain fully functional without the map.
    queueMicrotask(async () => {
      const el = this.mapContainer()?.nativeElement;
      if (!el) return;
      try {
        this.liveViewer = await this.cesium.mountLive(el);
      } catch (err) {
        console.warn('Cesium live viewer failed to mount', err);
      }
    });
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.tracker.stop();
    void this.wakeLock.release();
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.liveViewer) {
      this.liveViewer.destroy();
      this.liveViewer = null;
    }
  }

  protected togglePause(): void {
    const status = this.recordingStatus();
    if (status === 'recording') {
      this.store.dispatch(new Cardio.PauseSession());
    } else if (status === 'paused' || status === 'auto-paused') {
      this.store.dispatch(new Cardio.ResumeSession());
    }
  }

  protected goFinish(): void {
    this.router.navigate(['/cardio/finish']);
  }

  protected discard(): void {
    this.showDiscardConfirm.set(true);
  }

  protected confirmDiscard(): void {
    this.showDiscardConfirm.set(false);
    this.store.dispatch(new Cardio.DiscardSession());
    this.router.navigate(['/cardio']);
  }

  protected cancelDiscard(): void {
    this.showDiscardConfirm.set(false);
  }

  protected async reacquireWakeLock(): Promise<void> {
    await this.wakeLock.acquire();
    this.showWakeLockToast.set(false);
  }

  private flashWakeLockToast(): void {
    this.showWakeLockToast.set(true);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showWakeLockToast.set(false), 6000);
  }
}
