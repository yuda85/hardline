import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioState } from '../../../store/cardio/cardio.state';
import {
  CARDIO_ACTIVITIES,
  CARDIO_ACTIVITY_TYPES,
  CardioActivityType,
  CardioSession,
} from '../../../core/models/cardio-session.model';
import { SessionThumbnailComponent } from '../shared/session-thumbnail/session-thumbnail';
import { SkeletonComponent } from '../../../shared/components';

@Component({
  selector: 'app-cardio-hub',
  standalone: true,
  imports: [DatePipe, RouterLink, SessionThumbnailComponent, SkeletonComponent],
  templateUrl: './cardio-hub.html',
  styleUrl: './cardio-hub.scss',
})
export class CardioHubComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly sessions = this.store.selectSignal(CardioState.sessions);
  protected readonly loading = this.store.selectSignal(CardioState.sessionsLoading);
  protected readonly isRecording = this.store.selectSignal(CardioState.isRecording);

  protected readonly types = CARDIO_ACTIVITY_TYPES;
  protected readonly activities = CARDIO_ACTIVITIES;
  protected readonly selected = signal<CardioActivityType | null>(null);

  protected readonly totalKm = computed(() => {
    const total = this.sessions().reduce((a, s) => a + (s.distanceM ?? 0), 0);
    return (total / 1000).toFixed(1);
  });

  ngOnInit(): void {
    this.store.dispatch(new Cardio.LoadSessions());
  }

  protected activityLabel(s: CardioSession): string {
    return this.activities[s.activityType].shortLabel;
  }

  protected activityIcon(s: CardioSession): string {
    return this.activities[s.activityType].icon;
  }

  protected pick(t: CardioActivityType): void {
    this.selected.set(t);
  }

  protected confirmDiscard(): void {
    if (!confirm('Discard the current cardio session? All captured GPS data will be lost.')) return;
    this.store.dispatch(new Cardio.DiscardSession());
  }

  protected async start(): Promise<void> {
    if (this.isRecording()) {
      this.router.navigate(['/cardio/active']);
      return;
    }
    const t = this.selected();
    if (!t) return;

    // Silent permissions check — skip onboarding if geolocation is already granted.
    const granted = await this.isGeolocationGranted();
    if (granted) {
      this.store.dispatch(new Cardio.StartSession(t));
      this.router.navigate(['/cardio/active']);
    } else {
      this.router.navigate(['/cardio/permissions'], { queryParams: { type: t } });
    }
  }

  private async isGeolocationGranted(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.permissions) return false;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state === 'granted';
    } catch {
      return false;
    }
  }
}
