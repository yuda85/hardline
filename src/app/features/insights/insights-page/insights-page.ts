import { Component, inject, signal, OnInit, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { toDate, toDateString } from '../../../core/services/date.util';
import { Store } from '@ngxs/store';
import { CardComponent, BadgeComponent } from '../../../shared/components';
import { RecoveryMapComponent } from '../shared/recovery-map/recovery-map';
import { AuthState } from '../../../store/auth/auth.state';
import { SparklineComponent } from '../shared/sparkline/sparkline';
import {
  InsightsService,
  RecoveryStatus,
  PRBoardEntry,
  WeeklyVolume,
  HeatmapDay,
  WeightMomentum,
  WeeklyCalories,
  WeeklyMuscleSets,
  CardioTotalsBundle,
  CardioTotal,
  EMPTY_CARDIO_TOTALS,
} from '../../../core/services/insights.service';

type TimeRange = 'week' | 'month' | '3months';

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CardComponent, BadgeComponent, RecoveryMapComponent, SparklineComponent],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
})
export class InsightsPageComponent implements OnInit, AfterViewInit {
  private readonly insights = inject(InsightsService);
  private readonly store = inject(Store);

  @ViewChild('calendarScroll') calendarScrollRef?: ElementRef<HTMLElement>;

  protected readonly timeRange = signal<TimeRange>('month');
  protected readonly recovery = signal<RecoveryStatus[]>([]);
  protected readonly prBoard = signal<PRBoardEntry[]>([]);
  protected readonly weeklyVolume = signal<WeeklyVolume[]>([]);
  protected readonly heatmap = signal<HeatmapDay[]>([]);
  protected readonly allTimeHeatmap = signal<HeatmapDay[]>([]);
  protected readonly momentum = signal<WeightMomentum | null>(null);
  protected readonly weeklyCalories = signal<WeeklyCalories[]>([]);
  protected readonly weeklyMuscleSets = signal<WeeklyMuscleSets[]>([]);
  protected readonly cardioTotals = signal<CardioTotalsBundle>(EMPTY_CARDIO_TOTALS);
  protected readonly cardioBucket = signal<'week' | 'month' | 'threeMonths' | 'lifetime'>('week');

  protected readonly cardioBuckets: Array<{ key: 'week' | 'month' | 'threeMonths' | 'lifetime'; label: string; sublabel: string }> = [
    { key: 'week', label: 'Week', sublabel: 'Last 7 days' },
    { key: 'month', label: 'Month', sublabel: 'Last 30 days' },
    { key: 'threeMonths', label: '3 Months', sublabel: 'Last 90 days' },
    { key: 'lifetime', label: 'Lifetime', sublabel: 'All sessions' },
  ];

  protected readonly currentCardioTotal = computed<CardioTotal>(() => {
    return this.cardioTotals()[this.cardioBucket()];
  });

  protected readonly cardioMovingTimeLabel = computed(() => {
    const mins = this.currentCardioTotal().movingMinutes;
    if (mins === 0) return '—';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  });

  protected readonly maxVolume = computed(() => {
    const vols = this.weeklyVolume().map(w => w.volume);
    return Math.max(...vols, 1);
  });

  protected readonly currentWeekVolume = computed(() => {
    return this.weeklyVolume().find(w => w.isCurrent)?.volume ?? 0;
  });

  protected readonly volumeChange = computed(() => {
    const vols = this.weeklyVolume();
    if (vols.length < 2) return null;
    const current = vols[vols.length - 1]?.volume ?? 0;
    const prev = vols[vols.length - 2]?.volume ?? 0;
    if (prev === 0) return null;
    return Math.round(((current - prev) / prev) * 100);
  });

  // Heatmap organized as weeks of 7 days
  protected readonly heatmapWeeks = computed(() => {
    const days = this.heatmap();
    if (days.length === 0) return [];

    const weeks: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    // Pad start to Monday
    const firstDay = days[0];
    if (firstDay) {
      const dow = firstDay.dayOfWeek === 0 ? 6 : firstDay.dayOfWeek - 1; // Mon=0
      for (let i = 0; i < dow; i++) {
        currentWeek.push({ date: '', dayOfWeek: i + 1, volume: 0, intensity: 0 });
      }
    }

    for (const day of days) {
      const dow = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1;
      currentWeek.push(day);
      if (dow === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return weeks;
  });

  protected readonly heatmapStats = computed(() => {
    const days = this.allTimeHeatmap();
    const workoutDays = days.filter(d => d.intensity > 0).length;
    const totalWeeks = Math.max(1, this.heatmapWeeks().length);
    const avgPerWeek = Math.round(workoutDays / totalWeeks * 10) / 10;

    // Current streak
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].intensity > 0) streak++;
      else break;
    }

    // Longest streak
    let longestStreak = 0;
    let currentRun = 0;
    for (const day of days) {
      if (day.intensity > 0) {
        currentRun++;
        if (currentRun > longestStreak) longestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    return { workoutDays, avgPerWeek, streak, longestStreak };
  });

  /** All months from user signup to now, each with a calendar grid */
  /** Format a local date as YYYY-MM-DD (local timezone, not UTC) */
  private localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  protected readonly allMonths = computed(() => {
    const heatmapDays = this.allTimeHeatmap();
    const trainedDates = new Set(heatmapDays.filter(d => d.intensity > 0).map(d => d.date));

    const now = new Date();
    const todayLocal = this.localDateStr(now);

    // Determine start month from user's createdAt
    const user = this.store.selectSnapshot(AuthState.user);
    const createdAt = user?.createdAt ? toDate(user.createdAt) : now;
    const startYear = createdAt.getFullYear();
    const startMonth = createdAt.getMonth();

    const months: { label: string; weeks: { day: number | null; trained: boolean; isToday: boolean; isFuture: boolean }[][] }[] = [];

    let y = now.getFullYear();
    let m = now.getMonth();

    // Build months from current back to signup month
    while (y > startYear || (y === startYear && m >= startMonth)) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDayOfWeek = new Date(y, m, 1).getDay();
      const label = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const weeks: typeof months[0]['weeks'] = [];
      let currentWeek: typeof weeks[0] = [];

      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ day: null, trained: false, isToday: false, isFuture: false });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const localStr = this.localDateStr(date);
        // Check both local and UTC formats since heatmap data uses UTC
        const utcStr = toDateString(date);
        currentWeek.push({
          day: d,
          trained: trainedDates.has(utcStr) || trainedDates.has(localStr),
          isToday: localStr === todayLocal,
          isFuture: date > now,
        });
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ day: null, trained: false, isToday: false, isFuture: false });
        }
        weeks.push(currentWeek);
      }

      months.push({ label, weeks });

      // Go to previous month
      m--;
      if (m < 0) { m = 11; y--; }
    }

    return months; // newest first
  });

  protected readonly sortedRecovery = computed(() => {
    return [...this.recovery()].sort((a, b) => {
      if (a.hoursAgo === null) return 1;
      if (b.hoursAgo === null) return -1;
      return a.hoursAgo - b.hoursAgo;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // Scroll starts at top (current month) — no action needed since newest is first
  }

  protected setTimeRange(range: TimeRange) {
    this.timeRange.set(range);
    this.loadTimeRangeData();
  }

  protected setCardioBucket(bucket: 'week' | 'month' | 'threeMonths' | 'lifetime') {
    this.cardioBucket.set(bucket);
  }

  private loadData() {
    this.insights.getRecoveryStatus().subscribe(data => this.recovery.set(data));
    this.insights.getPRBoard().subscribe(data => this.prBoard.set(data));
    this.insights.getWeightMomentum().subscribe(data => this.momentum.set(data));
    this.insights.getCardioTotals().subscribe(data => this.cardioTotals.set(data));
    this.loadTimeRangeData();

    // Load all-time heatmap for the frequency calendar
    const user = this.store.selectSnapshot(AuthState.user);
    const createdAt = user?.createdAt ? toDate(user.createdAt) : new Date();
    const daysSinceSignup = Math.ceil((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000)) + 2;
    this.insights.getTrainingHeatmap(Math.max(daysSinceSignup, 60)).subscribe(data => this.allTimeHeatmap.set(data));
  }

  private loadTimeRangeData() {
    const range = this.timeRange();
    const weeks = range === 'week' ? 4 : range === 'month' ? 8 : 12;
    const days = range === 'week' ? 28 : range === 'month' ? 60 : 90;

    this.insights.getWeeklyVolume(weeks).subscribe(data => this.weeklyVolume.set(data));
    this.insights.getTrainingHeatmap(days).subscribe(data => this.heatmap.set(data));
    this.insights.getWeeklyCaloriesVsBudget(weeks).subscribe(data => this.weeklyCalories.set(data));
    this.insights.getWeeklyMuscleSets(weeks).subscribe(data => this.weeklyMuscleSets.set(data));
  }

  protected readonly currentWeekCalories = computed(() => {
    return this.weeklyCalories().find(w => w.isCurrent) ?? null;
  });

  protected readonly currentWeekMuscleSets = computed(() => {
    return this.weeklyMuscleSets().find(w => w.isCurrent) ?? null;
  });

  protected caloriesChartMax(weekData: WeeklyCalories): number {
    return Math.max(weekData.avgBudget, ...weekData.days, 1);
  }

  protected musclePct(actual: number, planned: number): number {
    if (planned <= 0) return actual > 0 ? 100 : 0;
    return Math.min(100, Math.round((actual / planned) * 100));
  }

  protected formatVolume(vol: number): string {
    if (vol >= 1000) return Math.round(vol / 1000) + 'k';
    return vol.toString();
  }

  protected timeAgo(date: Date | null): string {
    if (!date) return 'Never';
    const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    if (hours < 1) return 'Just now';
    if (hours < 24) return Math.floor(hours) + 'h ago';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return days + ' days ago';
  }

  protected statusColor(status: RecoveryStatus['status']): string {
    switch (status) {
      case 'recovering': return '#ef6719';
      case 'sore': return '#ffb595';
      case 'ready': return '#66d9a0';
      case 'undertrained': return '#414755';
    }
  }

  protected momentumColor(): string {
    const m = this.momentum();
    if (!m) return 'var(--on-surface-variant)';
    switch (m.status) {
      case 'positive': return '#66d9a0';
      case 'neutral': return '#3cd7ff';
      case 'negative': return '#ffb595';
    }
  }
}
