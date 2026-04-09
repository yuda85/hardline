import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { DecimalPipe } from '@angular/common';
import { EnergyState } from '../../store/energy/energy.state';
import { AuthState } from '../../store/auth/auth.state';
import { Energy } from '../../store/energy/energy.actions';
import { Profile } from '../../store/profile/profile.actions';
import { Weight } from '../../store/weight/weight.actions';
import { WeightState } from '../../store/weight/weight.state';
import { computeGoalProgress } from '../../store/weight/weight.state';
import { ProfileState } from '../../store/profile/profile.state';
import { SessionRepository } from '../../data/repositories/session.repository';
import { EnergyCalcService } from '../../core/services/energy-calc.service';
import { toDateString } from '../../core/services/date.util';
import { CardComponent, ButtonComponent, BadgeComponent, SkeletonComponent } from '../../shared/components';
import { CalorieRingComponent } from '../energy/shared/calorie-ring/calorie-ring';
import { MacroBarsComponent } from '../energy/shared/macro-bars/macro-bars';
import { BalanceCardComponent } from '../energy/shared/balance-card/balance-card';
import { WorkoutSession } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, CardComponent, ButtonComponent, BadgeComponent, SkeletonComponent, CalorieRingComponent, MacroBarsComponent, BalanceCardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly calcService = inject(EnergyCalcService);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly energyLoading = this.store.selectSignal(EnergyState.loading);

  protected readonly latestWeight = this.store.selectSignal(WeightState.latestWeight);
  protected readonly startWeight = this.store.selectSignal(WeightState.startWeight);
  protected readonly profileGoals = this.store.selectSignal(ProfileState.goals);
  protected readonly weightStreak = this.store.selectSignal(WeightState.currentStreak);

  protected readonly weightProgress = computed(() => {
    const current = this.latestWeight();
    const start = this.startWeight();
    const target = this.profileGoals()?.targetWeight ?? null;
    if (current === null || start === null) return null;
    return computeGoalProgress(current, start, target);
  });

  protected readonly budget = computed(() => {
    const g = this.goals();
    const s = this.summary();
    if (!g) return null;
    return this.calcService.buildEnergyBudget(g, s);
  });

  protected readonly recentSessions = signal<WorkoutSession[]>([]);
  protected readonly sessionsLoading = signal(true);

  ngOnInit() {
    this.store.dispatch([
      new Energy.LoadGoalSettings(),
      new Profile.FetchGoals(),
      new Weight.LoadHistory(),
    ]);
    const today = toDateString(new Date());
    this.store.dispatch(new Energy.FetchDayData(today));
    this.loadRecentSessions();
  }

  protected goToEnergy() { this.router.navigate(['/energy']); }
  protected goToWorkouts() { this.router.navigate(['/workouts']); }
  protected goToWeight() { this.router.navigate(['/weight']); }
  protected goToSmartWorkout() { this.router.navigate(['/workouts', 'smart-workout']); }
  protected goToBuilder() { this.router.navigate(['/workouts', 'generate']); }

  protected getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  protected formatSessionDate(date: Date | unknown): string {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date as string);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  protected getSessionVolume(session: WorkoutSession): number {
    let volume = 0;
    for (const g of session.exerciseGroups ?? []) {
      for (const ex of g.exercises) {
        for (const set of ex.sets) {
          if (set.completed) volume += set.weight * set.actualReps;
        }
      }
    }
    return volume;
  }

  protected getSessionSets(session: WorkoutSession): number {
    let count = 0;
    for (const g of session.exerciseGroups ?? []) {
      for (const ex of g.exercises) {
        count += ex.sets.filter(s => s.completed).length;
      }
    }
    return count;
  }

  private loadRecentSessions() {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) { this.sessionsLoading.set(false); return; }
    this.sessionRepo.getHistory(uid, 5).pipe(take(1)).subscribe(sessions => {
      this.recentSessions.set(sessions.filter(s => s.completedAt));
      this.sessionsLoading.set(false);
    });
  }
}
