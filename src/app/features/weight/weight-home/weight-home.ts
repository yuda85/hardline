import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Weight } from '../../../store/weight/weight.actions';
import { WeightState } from '../../../store/weight/weight.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { EnergyState } from '../../../store/energy/energy.state';
import { Energy } from '../../../store/energy/energy.actions';
import { Profile } from '../../../store/profile/profile.actions';
import { WeightChartComponent } from '../shared/weight-chart/weight-chart';
import { GoalRingComponent } from '../shared/goal-ring/goal-ring';
import { PredictionCardComponent } from '../shared/prediction-card/prediction-card';
import { WeeklyRecapComponent } from '../shared/weekly-recap/weekly-recap';
import { MilestoneBadgeComponent } from '../shared/milestone-badge/milestone-badge';
import { WeightPromptComponent } from '../weight-prompt/weight-prompt';
import { toDateString } from '../../../core/services/date.util';
import type { ViewRange } from '../../../store/weight/weight.model';

@Component({
  selector: 'app-weight-home',
  standalone: true,
  imports: [
    WeightChartComponent, GoalRingComponent, PredictionCardComponent,
    WeeklyRecapComponent, MilestoneBadgeComponent, WeightPromptComponent,
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

  protected readonly showPrompt = signal(false);

  protected readonly ranges: { value: ViewRange; label: string }[] = [
    { value: '7d', label: '1W' },
    { value: '30d', label: '1M' },
    { value: '90d', label: '3M' },
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

  protected readonly weeklyChange = computed(() => {
    const visible = this.visibleEntries();
    if (visible.length < 2) return '0.0';
    const latest = visible[visible.length - 1].weightKg;
    const weekAgo = visible[0].weightKg;
    const change = Math.round((latest - weekAgo) * 10) / 10;
    return (change > 0 ? '+' : '') + change;
  });

  protected readonly chartSummary = computed(() => {
    const visible = this.visibleEntries();
    if (visible.length < 2) return null;
    const weights = visible.map(e => e.weightKg);
    const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
    const first = weights[0];
    const last = weights[weights.length - 1];
    const pctChange = Math.round(((last - first) / first) * 1000) / 10;
    return `Averaging ${avg}kg this week. ${pctChange > 0 ? 'Up' : 'Down'} ${Math.abs(pctChange)}% overall.`;
  });

  protected readonly recentDailySummaries = computed(() => {
    const summary = this.dailySummary();
    return summary ? [summary] : [];
  });

  ngOnInit() {
    this.store.dispatch(new Weight.LoadHistory());
    this.store.dispatch(new Profile.FetchGoals());
    const today = toDateString(new Date());
    this.store.dispatch(new Energy.FetchDayData(today));
  }

  protected setRange(range: ViewRange) {
    this.store.dispatch(new Weight.SetViewRange(range));
  }

  protected openPrompt() {
    this.showPrompt.set(true);
  }

  protected onWeightSaved(data: { weightKg: number; notes?: string }) {
    this.store.dispatch(new Weight.LogWeight(data.weightKg, data.notes));
    this.showPrompt.set(false);
  }

  protected onWeightSkipped() {
    this.showPrompt.set(false);
  }

  protected goToHistory() { this.router.navigate(['/weight', 'history']); }
  protected goToSettings() { this.router.navigate(['/weight', 'settings']); }
}
