import { Component, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Weight } from '../../../store/weight/weight.actions';
import { WeightState } from '../../../store/weight/weight.state';
import { computeGoalProgress } from '../../../store/weight/weight.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { EnergyState } from '../../../store/energy/energy.state';
import { Energy } from '../../../store/energy/energy.actions';
import { CardComponent, ButtonComponent, IconButtonComponent, SkeletonComponent } from '../../../shared/components';
import { WeightChartComponent } from '../shared/weight-chart/weight-chart';
import { GoalRingComponent } from '../shared/goal-ring/goal-ring';
import { PredictionCardComponent } from '../shared/prediction-card/prediction-card';
import { WeeklyRecapComponent } from '../shared/weekly-recap/weekly-recap';
import { MilestoneBadgeComponent } from '../shared/milestone-badge/milestone-badge';
import type { ViewRange } from '../../../store/weight/weight.model';

@Component({
  selector: 'app-weight-home',
  standalone: true,
  imports: [
    CardComponent, ButtonComponent, IconButtonComponent, SkeletonComponent,
    WeightChartComponent, GoalRingComponent, PredictionCardComponent,
    WeeklyRecapComponent, MilestoneBadgeComponent,
  ],
  templateUrl: './weight-home.html',
  styleUrl: './weight-home.scss',
})
export class WeightHomeComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly entries = this.store.selectSignal(WeightState.entries);
  protected readonly visibleEntries = this.store.selectSignal(WeightState.visibleEntries);
  protected readonly todayEntry = this.store.selectSignal(WeightState.todayEntry);
  protected readonly loading = this.store.selectSignal(WeightState.loading);
  protected readonly viewRange = this.store.selectSignal(WeightState.viewRange);
  protected readonly streak = this.store.selectSignal(WeightState.currentStreak);
  protected readonly movingAvg = this.store.selectSignal(WeightState.movingAverage7);
  protected readonly latestWeight = this.store.selectSignal(WeightState.latestWeight);
  protected readonly startWeight = this.store.selectSignal(WeightState.startWeight);
  protected readonly goals = this.store.selectSignal(ProfileState.goals);
  protected readonly dailySummary = this.store.selectSignal(EnergyState.dailySummary);

  protected readonly ranges: { value: ViewRange; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
  ];

  protected readonly chartPoints = computed(() =>
    this.visibleEntries().map(e => ({ date: e.date, weight: e.weightKg })),
  );

  protected readonly trendPoints = computed(() => {
    const avg = this.movingAvg();
    const visible = this.visibleEntries();
    const visibleDates = new Set(visible.map(e => e.date));
    return avg.filter(a => visibleDates.has(a.date));
  });

  protected readonly goalProgress = computed(() => {
    const current = this.latestWeight();
    const start = this.startWeight();
    const target = this.goals()?.targetWeight ?? null;
    if (current === null || start === null) return null;
    return computeGoalProgress(current, start, target);
  });

  protected readonly recentDailySummaries = computed(() => {
    const summary = this.dailySummary();
    return summary ? [summary] : [];
  });

  ngOnInit() {
    this.store.dispatch(new Weight.LoadHistory());

    // Load energy data for prediction card
    const today = new Date().toISOString().split('T')[0];
    this.store.dispatch(new Energy.FetchDayData(today));
  }

  protected setRange(range: ViewRange) {
    this.store.dispatch(new Weight.SetViewRange(range));
  }

  protected goToHistory() { this.router.navigate(['/weight', 'history']); }
  protected goToSettings() { this.router.navigate(['/weight', 'settings']); }
}
