import { Component, input, computed } from '@angular/core';
import { DailySummary } from '../../../../core/models/energy.model';

const KCAL_PER_KG = 7700;

@Component({
  selector: 'app-prediction-card',
  standalone: true,
  imports: [],
  templateUrl: './prediction-card.html',
  styleUrl: './prediction-card.scss',
})
export class PredictionCardComponent {
  readonly dailySummaries = input<DailySummary[]>([]);
  readonly currentWeight = input<number | null>(null);
  readonly targetWeight = input<number | null>(null);

  protected readonly weeklyRate = computed(() => {
    const summaries = this.dailySummaries();
    if (summaries.length < 3) return null;

    const totalSurplus = summaries.reduce((sum, s) => sum + (s.deficitOrSurplus ?? 0), 0);
    const avgDaily = totalSurplus / summaries.length;
    const weeklyChangeKg = (avgDaily * 7) / KCAL_PER_KG;
    return Math.round(weeklyChangeKg * 100) / 100;
  });

  protected readonly estimatedDate = computed(() => {
    const current = this.currentWeight();
    const target = this.targetWeight();
    const rate = this.weeklyRate();

    if (current === null || target === null || rate === null) return null;

    const remaining = current - target; // positive if losing, negative if gaining
    if (rate === 0) return null;

    // Rate is negative when losing weight (deficit), positive when gaining
    const weeksNeeded = remaining / Math.abs(rate);
    if (weeksNeeded <= 0) return null; // already at or past goal

    const date = new Date();
    date.setDate(date.getDate() + Math.round(weeksNeeded * 7));
    return date;
  });

  protected readonly formattedDate = computed(() => {
    const date = this.estimatedDate();
    if (!date) return null;
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  protected readonly status = computed<'on_track' | 'behind' | 'ahead' | null>(() => {
    const rate = this.weeklyRate();
    const target = this.targetWeight();
    const current = this.currentWeight();
    if (rate === null || target === null || current === null) return null;

    const isLossGoal = target < current;
    const expectedWeekly = isLossGoal ? -0.5 : 0.3; // moderate defaults

    if (isLossGoal) {
      if (rate <= expectedWeekly * 1.2) return 'on_track';
      if (rate <= expectedWeekly * 0.5) return 'ahead';
      return 'behind';
    } else {
      if (rate >= expectedWeekly * 0.8) return 'on_track';
      if (rate >= expectedWeekly * 1.5) return 'ahead';
      return 'behind';
    }
  });

  protected readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'on_track': return 'On Track';
      case 'ahead': return 'Ahead of Schedule';
      case 'behind': return 'Behind Schedule';
      default: return null;
    }
  });

  protected readonly hasData = computed(() => this.estimatedDate() !== null);
}
