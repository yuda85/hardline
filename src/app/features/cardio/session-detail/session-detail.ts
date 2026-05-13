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
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Store } from '@ngxs/store';

import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioState } from '../../../store/cardio/cardio.state';
import { CARDIO_ACTIVITIES } from '../../../core/models/cardio-session.model';
import { CesiumMapService, ReplayViewerHandle } from '../services/cesium-map.service';
import { ElevationChartComponent } from '../shared/elevation-chart/elevation-chart';
import { SpeedChartComponent } from '../shared/speed-chart/speed-chart';
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatSpeedKmh,
} from '../shared/cardio-calc';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [DatePipe, ElevationChartComponent, SpeedChartComponent],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.scss',
})
export class SessionDetailComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cesium = inject(CesiumMapService);

  protected readonly session = this.store.selectSignal(CardioState.selectedSession);
  protected readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  protected readonly playing = signal(false);

  private replayViewer: ReplayViewerHandle | null = null;
  private mounted = false;

  protected readonly meta = computed(() => {
    const s = this.session();
    return s ? CARDIO_ACTIVITIES[s.activityType] : null;
  });

  protected readonly isPace = computed(() => this.meta()?.primaryMetric === 'pace');

  protected readonly distance = computed(() => formatDistanceKm(this.session()?.distanceM ?? 0));
  protected readonly duration = computed(() => formatDuration(this.session()?.durationSec ?? 0));
  protected readonly totalDuration = computed(() =>
    formatDuration(this.session()?.totalDurationSec ?? 0),
  );
  protected readonly elev = computed(() => Math.round(this.session()?.elevationGainM ?? 0));
  protected readonly elevLoss = computed(() => Math.round(this.session()?.elevationLossM ?? 0));
  protected readonly speedSummary = computed(() => {
    const s = this.session();
    if (!s) return { avg: '—', max: '—', label: 'Speed', unit: 'km/h' };
    if (this.isPace()) {
      return {
        avg: formatPace(s.avgSpeedMs),
        max: formatPace(s.maxSpeedMs),
        label: 'Pace',
        unit: 'min/km',
      };
    }
    return {
      avg: formatSpeedKmh(s.avgSpeedMs),
      max: formatSpeedKmh(s.maxSpeedMs),
      label: 'Speed',
      unit: 'km/h',
    };
  });

  constructor() {
    effect(() => {
      const s = this.session();
      const el = this.mapContainer()?.nativeElement;
      if (!s || !el || this.mounted) return;
      this.mounted = true;
      this.cesium
        .mountReplay(el, s.polyline, s.telemetry, s.bounds)
        .then(handle => {
          this.replayViewer = handle;
        })
        .catch(err => {
          console.warn('Cesium replay viewer failed', err);
          this.mounted = false;
        });
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId');
    if (id) this.store.dispatch(new Cardio.LoadSessionDetail(id));
  }

  ngOnDestroy(): void {
    if (this.replayViewer) {
      this.replayViewer.destroy();
      this.replayViewer = null;
    }
  }

  protected togglePlay(): void {
    if (!this.replayViewer) return;
    if (this.playing()) {
      this.replayViewer.pause();
      this.playing.set(false);
    } else {
      this.replayViewer.play();
      this.playing.set(true);
    }
  }

  protected resetPlayback(): void {
    if (!this.replayViewer) return;
    this.replayViewer.reset();
    this.playing.set(false);
  }

  protected back(): void {
    this.router.navigate(['/cardio']);
  }

  protected delete(): void {
    const id = this.session()?.id;
    if (!id) return;
    if (!confirm('Delete this session permanently?')) return;
    this.store.dispatch(new Cardio.DeleteSession(id));
    this.router.navigate(['/cardio']);
  }
}
