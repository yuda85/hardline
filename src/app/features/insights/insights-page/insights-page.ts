import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Store } from '@ngxs/store';
import { CardComponent, BadgeComponent } from '../../../shared/components';
import { RecoveryMapComponent } from '../shared/recovery-map/recovery-map';
import { SparklineComponent } from '../shared/sparkline/sparkline';
import {
  InsightsService,
  RecoveryStatus,
  PRBoardEntry,
  WeeklyVolume,
  HeatmapDay,
  WeightMomentum,
} from '../../../core/services/insights.service';

type TimeRange = 'week' | 'month' | '3months';

@Component({
  selector: 'app-insights-page',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CardComponent, BadgeComponent, RecoveryMapComponent, SparklineComponent],
  templateUrl: './insights-page.html',
  styleUrl: './insights-page.scss',
})
export class InsightsPageComponent implements OnInit {
  private readonly insights = inject(InsightsService);

  protected readonly timeRange = signal<TimeRange>('month');
  protected readonly recovery = signal<RecoveryStatus[]>([]);
  protected readonly prBoard = signal<PRBoardEntry[]>([]);
  protected readonly weeklyVolume = signal<WeeklyVolume[]>([]);
  protected readonly heatmap = signal<HeatmapDay[]>([]);
  protected readonly momentum = signal<WeightMomentum | null>(null);

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
    const days = this.heatmap();
    const workoutDays = days.filter(d => d.intensity > 0).length;
    const totalWeeks = Math.max(1, this.heatmapWeeks().length);
    const avgPerWeek = Math.round(workoutDays / totalWeeks * 10) / 10;

    // Current streak
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].intensity > 0) streak++;
      else break;
    }

    return { workoutDays, avgPerWeek, streak };
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

  protected setTimeRange(range: TimeRange) {
    this.timeRange.set(range);
    this.loadTimeRangeData();
  }

  private loadData() {
    this.insights.getRecoveryStatus().subscribe(data => this.recovery.set(data));
    this.insights.getPRBoard().subscribe(data => this.prBoard.set(data));
    this.insights.getWeightMomentum().subscribe(data => this.momentum.set(data));
    this.loadTimeRangeData();
  }

  private loadTimeRangeData() {
    const range = this.timeRange();
    const weeks = range === 'week' ? 4 : range === 'month' ? 8 : 12;
    const days = range === 'week' ? 28 : range === 'month' ? 60 : 90;

    this.insights.getWeeklyVolume(weeks).subscribe(data => this.weeklyVolume.set(data));
    this.insights.getTrainingHeatmap(days).subscribe(data => this.heatmap.set(data));
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
