import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { AuthState } from '../../../store/auth/auth.state';
import { CalorieRingComponent } from '../shared/calorie-ring/calorie-ring';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import { BalanceCardComponent } from '../shared/balance-card/balance-card';
import { CalorieDay, DailySummary } from '../../../core/models/energy.model';
import { toDate } from '../../../core/services/date.util';

type EnergyTab = 'home' | 'daily' | 'trends';

@Component({
  selector: 'app-energy-home',
  standalone: true,
  imports: [DecimalPipe, CalorieRingComponent, MacroBarsComponent, BalanceCardComponent],
  templateUrl: './energy-home.html',
  styleUrl: './energy-home.scss',
})
export class EnergyHomeComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly calcService = inject(EnergyCalcService);

  protected readonly activeTab = signal<EnergyTab>('home');

  // Shared state
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly steps = this.store.selectSignal(EnergyState.todaysSteps);
  protected readonly loading = this.store.selectSignal(EnergyState.loading);
  protected readonly selectedDate = this.store.selectSignal(EnergyState.selectedDate);
  protected readonly weeklyDailySummaries = this.store.selectSignal(EnergyState.weeklyDailySummaries);
  protected readonly weeklySummary = this.store.selectSignal(EnergyState.weeklySummary);
  protected readonly calorieDays = this.store.selectSignal(EnergyState.calorieDays);
  protected readonly liveWeeklyIntake = this.store.selectSignal(EnergyState.liveWeeklyIntake);
  protected readonly todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  protected readonly Math = Math;

  // Energy budget (computed from goals + summary)
  protected readonly budget = computed(() => {
    const g = this.goals();
    const s = this.summary();
    if (!g) return null;
    return this.calcService.buildEnergyBudget(g, s);
  });

  // ── Daily tab ──

  protected readonly flowBars = computed(() => {
    const b = this.budget();
    if (!b) return [];
    const max = Math.max(b.tdee, b.budget, b.eaten, 1);
    return [
      { label: 'TDEE', value: b.tdee, pct: (b.tdee / max) * 100, accent: false },
      { label: 'Budget', value: b.budget, pct: (b.budget / max) * 100, accent: false },
      { label: 'Eaten', value: b.eaten, pct: (b.eaten / max) * 100, accent: false },
      { label: 'Left', value: Math.max(0, b.remaining), pct: (Math.max(0, b.remaining) / max) * 100, accent: true },
    ];
  });

  // ── Trends tab ──

  protected readonly weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  protected readonly weeklyChartData = computed(() => {
    const summaries = this.weeklyDailySummaries();
    const g = this.goals();
    if (!g || summaries.length === 0) return [];

    // Build a 7-day array (Sun-Sat) for the current week
    const weekStart = this.getWeekStart(new Date());
    const result: { day: string; eaten: number; budget: number; isOver: boolean; isToday: boolean; hasDta: boolean }[] = [];
    const today = this.localDateStr(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = this.localDateStr(d);
      const daySummary = summaries.find(s => s.date === dateStr);
      result.push({
        day: this.weekDayLabels[i],
        eaten: daySummary?.consumedCalories ?? 0,
        budget: daySummary?.targetCalories ?? g.dailyCalories,
        isOver: (daySummary?.consumedCalories ?? 0) > (daySummary?.targetCalories ?? g.dailyCalories),
        isToday: dateStr === today,
        hasDta: !!daySummary && daySummary.consumedCalories > 0,
      });
    }
    return result;
  });

  protected readonly maxChartValue = computed(() => {
    const data = this.weeklyChartData();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => Math.max(d.eaten, d.budget)), 1);
  });

  protected readonly weeklyStats = computed(() => {
    const ws = this.weeklySummary();
    return {
      cumulativeDeficit: ws?.cumulativeDeficitSurplus ?? 0,
      adherence: ws?.adherenceScore ?? 0,
      projectedChange: ws?.projectedWeeklyWeightChange ?? 0,
    };
  });

  // Calendar heatmap for caloric intake
  protected readonly calorieMonths = computed(() => {
    const days = this.calorieDays();
    const consumedMap = new Map(days.map(d => [d.date, d]));

    const now = new Date();
    const todayStr = this.localDateStr(now);

    const user = this.store.selectSnapshot(AuthState.user);
    const createdAt = user?.createdAt ? toDate(user.createdAt) : now;
    const startYear = createdAt.getFullYear();
    const startMonth = createdAt.getMonth();

    const months: { label: string; weeks: { day: number | null; dateStr: string; intensity: CalorieDay['intensity']; isToday: boolean; isFuture: boolean; consumed: number; target: number }[][] }[] = [];

    let y = now.getFullYear();
    let m = now.getMonth();

    while (y > startYear || (y === startYear && m >= startMonth)) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDayOfWeek = new Date(y, m, 1).getDay();
      const label = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const weeks: typeof months[0]['weeks'] = [];
      let currentWeek: typeof weeks[0] = [];

      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ day: null, dateStr: '', intensity: 0, isToday: false, isFuture: false, consumed: 0, target: 0 });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const dateStr = this.localDateStr(date);
        const entry = consumedMap.get(dateStr);
        currentWeek.push({
          day: d,
          dateStr,
          intensity: entry?.intensity ?? 0,
          isToday: dateStr === todayStr,
          isFuture: date > now,
          consumed: entry?.consumed ?? 0,
          target: entry?.target ?? 0,
        });
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ day: null, dateStr: '', intensity: 0, isToday: false, isFuture: false, consumed: 0, target: 0 });
        }
        weeks.push(currentWeek);
      }

      months.push({ label, weeks });

      m--;
      if (m < 0) { m = 11; y--; }
    }

    return months;
  });

  // Weekly averages (Sun-Sat weeks)
  protected readonly weeklyAverages = computed(() => {
    const days = this.calorieDays();
    if (days.length === 0) return [];

    // Group by week starting Sunday
    const weekMap = new Map<string, { consumed: number[]; target: number[] }>();
    for (const day of days) {
      const d = new Date(day.date + 'T12:00:00');
      const weekStart = this.getWeekStart(d);
      const key = this.localDateStr(weekStart);
      if (!weekMap.has(key)) weekMap.set(key, { consumed: [], target: [] });
      const w = weekMap.get(key)!;
      w.consumed.push(day.consumed);
      w.target.push(day.target);
    }

    const result: { weekLabel: string; avgConsumed: number; avgTarget: number; days: number }[] = [];
    const sortedKeys = [...weekMap.keys()].sort().reverse();

    for (const key of sortedKeys) {
      const w = weekMap.get(key)!;
      const weekDate = new Date(key + 'T12:00:00');
      result.push({
        weekLabel: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgConsumed: Math.round(w.consumed.reduce((a, b) => a + b, 0) / w.consumed.length),
        avgTarget: Math.round(w.target.reduce((a, b) => a + b, 0) / w.target.length),
        days: w.consumed.length,
      });
    }

    return result;
  });

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings()).subscribe(() => {
      const today = this.localDateStr(new Date());
      this.store.dispatch(new Energy.FetchDayData(today)).subscribe(() => {
        this.store.dispatch(new Energy.RecalculateDailySummary());
      });
      this.loadTrendsData();
    });
  }

  protected setTab(tab: EnergyTab) {
    this.activeTab.set(tab);
  }

  // ── Daily tab navigation ──

  protected prevDay() {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() - 1);
    this.store.dispatch(new Energy.SetDate(this.localDateStr(current)));
  }

  protected nextDay() {
    const current = new Date(this.selectedDate());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + 1);
    if (current <= today) {
      this.store.dispatch(new Energy.SetDate(this.localDateStr(current)));
    }
  }

  protected formatDate(dateStr: string): string {
    const target = new Date(dateStr); const today = new Date();
    today.setHours(0, 0, 0, 0); target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) return 'Today';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // ── Navigation ──

  protected goToDate(dateStr: string) {
    if (!dateStr) return;
    this.store.dispatch(new Energy.SetDate(dateStr));
    this.activeTab.set('daily');
  }

  protected goToGoals() { this.router.navigate(['/energy', 'goals']); }
  protected goToFood() { this.router.navigate(['/energy', 'food']); }
  protected goToActivity() { this.router.navigate(['/energy', 'activity']); }

  // ── Helpers ──

  private loadTrendsData() {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const wsStr = this.localDateStr(weekStart);
    const weStr = this.localDateStr(weekEnd);

    this.store.dispatch(new Energy.FetchWeeklyDailySummaries(wsStr, weStr));
    this.store.dispatch(new Energy.FetchLiveWeeklyIntake(wsStr, weStr));
    this.store.dispatch(new Energy.RecalculateWeeklySummary(wsStr, weStr));

    // Fetch calorie days for calendar (all time from signup)
    const user = this.store.selectSnapshot(AuthState.user);
    const createdAt = user?.createdAt ? toDate(user.createdAt) : new Date();
    const startStr = this.localDateStr(createdAt);
    const todayStr = this.localDateStr(now);
    this.store.dispatch(new Energy.FetchCalorieDays(startStr, todayStr));
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day);
    return d;
  }

  private localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
