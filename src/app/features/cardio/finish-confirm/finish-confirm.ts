import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';

import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioState } from '../../../store/cardio/cardio.state';
import { EnergyState } from '../../../store/energy/energy.state';
import { CARDIO_ACTIVITIES } from '../../../core/models/cardio-session.model';
import { estimateCalories, formatDistanceKm, formatDuration } from '../shared/cardio-calc';

@Component({
  selector: 'app-finish-confirm',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './finish-confirm.html',
  styleUrl: './finish-confirm.scss',
})
export class FinishConfirmComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly session = this.store.selectSignal(CardioState.activeSession);
  protected readonly recordingStatus = this.store.selectSignal(CardioState.recordingStatus);
  protected readonly uploadProgress = this.store.selectSignal(CardioState.uploadProgress);
  protected readonly goalSettings = this.store.selectSignal(EnergyState.goalSettings);

  protected readonly calories = signal<number>(0);
  protected readonly saving = signal(false);

  protected readonly activityMeta = computed(() => {
    const s = this.session();
    return s ? CARDIO_ACTIVITIES[s.activityType] : null;
  });

  protected readonly distance = computed(() => formatDistanceKm(this.session()?.distanceM ?? 0));
  protected readonly elapsed = computed(() => formatDuration(this.session()?.movingTimeSec ?? 0));
  protected readonly elevation = computed(() => Math.round(this.session()?.elevationGainM ?? 0));

  constructor() {
    effect(() => {
      const s = this.session();
      if (!s) return;
      const weight = this.goalSettings()?.weightKg ?? null;
      const est = estimateCalories(s.activityType, s.movingTimeSec, weight);
      // Only seed once when first arriving on the screen.
      if (this.calories() === 0) this.calories.set(est);
    });
  }

  ngOnInit(): void {
    if (!this.session()) {
      this.router.navigate(['/cardio']);
    }
  }

  protected async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.store
      .dispatch(new Cardio.FinishSession({ caloriesBurned: this.calories() }))
      .subscribe({
        next: () => this.router.navigate(['/cardio']),
        error: () => this.saving.set(false),
      });
  }

  protected discard(): void {
    this.store.dispatch(new Cardio.DiscardSession());
    this.router.navigate(['/cardio']);
  }

  protected back(): void {
    this.router.navigate(['/cardio/active']);
  }
}
