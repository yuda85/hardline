import { Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';

import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioState } from '../../../store/cardio/cardio.state';
import { CARDIO_ACTIVITIES, CardioSession } from '../../../core/models/cardio-session.model';
import { SessionThumbnailComponent } from '../shared/session-thumbnail/session-thumbnail';
import { FabComponent } from '../../../shared/components';
import { SkeletonComponent } from '../../../shared/components';

@Component({
  selector: 'app-cardio-hub',
  standalone: true,
  imports: [DatePipe, RouterLink, SessionThumbnailComponent, FabComponent, SkeletonComponent],
  templateUrl: './cardio-hub.html',
  styleUrl: './cardio-hub.scss',
})
export class CardioHubComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly sessions = this.store.selectSignal(CardioState.sessions);
  protected readonly loading = this.store.selectSignal(CardioState.sessionsLoading);
  protected readonly isRecording = this.store.selectSignal(CardioState.isRecording);

  protected readonly totalKm = computed(() => {
    const total = this.sessions().reduce((a, s) => a + (s.distanceM ?? 0), 0);
    return (total / 1000).toFixed(1);
  });

  protected readonly activities = CARDIO_ACTIVITIES;

  ngOnInit(): void {
    this.store.dispatch(new Cardio.LoadSessions());
  }

  protected activityLabel(s: CardioSession): string {
    return this.activities[s.activityType].shortLabel;
  }

  protected activityIcon(s: CardioSession): string {
    return this.activities[s.activityType].icon;
  }

  protected startFlow(): void {
    if (this.isRecording()) {
      this.router.navigate(['/cardio/active']);
      return;
    }
    this.router.navigate(['/cardio/start']);
  }
}
