import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { AuthState } from '../../../store/auth/auth.state';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { SessionRepository } from '../../../data/repositories/session.repository';
import { CARDIO_TYPES, CardioEntry } from '../../../core/models/energy.model';
import { toDateString } from '../../../core/services/date.util';
import { WorkoutSession } from '../../../core/models/workout.model';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './activity.html',
  styleUrl: './activity.scss',
})
export class ActivityComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly calcService = inject(EnergyCalcService);

  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly cardio = this.store.selectSignal(EnergyState.todaysCardio);
  protected readonly steps = this.store.selectSignal(EnergyState.todaysSteps);
  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly selectedDate = this.store.selectSignal(EnergyState.selectedDate);

  protected readonly workoutSessions = signal<WorkoutSession[]>([]);
  protected readonly showAddCardio = signal(false);
  protected readonly stepsInput = signal(0);
  protected readonly cardioTypes = CARDIO_TYPES;

  // Cardio form
  protected readonly cardioType = signal(CARDIO_TYPES[0]);
  protected readonly cardioDuration = signal(30);
  protected readonly cardioDistance = signal<number | null>(null);
  protected readonly cardioCalories = signal(200);
  protected readonly savingCardio = signal(false);

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings());
    const today = toDateString(new Date());
    this.store.dispatch(new Energy.FetchDayData(today)).subscribe(() => {
      this.loadWorkoutSessions();
      this.store.dispatch(new Energy.RecalculateDailySummary());
      const currentSteps = this.steps();
      if (currentSteps) this.stepsInput.set(currentSteps.steps);
    });
  }

  protected updateSteps() {
    const date = this.selectedDate();
    this.store.dispatch(new Energy.UpdateSteps(date, this.stepsInput()));
  }

  protected saveCardio() {
    this.savingCardio.set(true);
    const date = this.selectedDate();

    this.store.dispatch(new Energy.AddCardio({
      date,
      type: this.cardioType(),
      durationMinutes: this.cardioDuration(),
      ...(this.cardioDistance() ? { distanceKm: this.cardioDistance()! } : {}),
      caloriesBurned: this.cardioCalories(),
    })).subscribe(() => {
      this.savingCardio.set(false);
      this.showAddCardio.set(false);
    });
  }

  protected removeCardio(entryId: string | undefined) {
    if (entryId) this.store.dispatch(new Energy.RemoveCardio(entryId));
  }

  protected getWorkoutCalories(session: WorkoutSession): number {
    return this.calcService.estimateWorkoutCalories(session);
  }

  private loadWorkoutSessions() {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    this.sessionRepo.getHistory(uid, 20).pipe(take(1)).subscribe(sessions => {
      const date = this.selectedDate();
      this.workoutSessions.set(sessions.filter(s => toDateString(s.startedAt) === date && s.completedAt));
    });
  }
}
