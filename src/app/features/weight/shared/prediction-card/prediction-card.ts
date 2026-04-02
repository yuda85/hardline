import { Component, input, computed } from '@angular/core';
import { DailySummary } from '../../../../core/models/energy.model';
import { CardComponent, BadgeComponent } from '../../../../shared/components';

const KCAL_PER_KG = 7700;

export interface WeightPrediction {
  predictedChangeKg: number;
  direction: 'gain' | 'loss';
  avgDailySurplus: number;
  daysAnalyzed: number;
}

@Component({
  selector: 'app-prediction-card',
  standalone: true,
  imports: [CardComponent, BadgeComponent],
  templateUrl: './prediction-card.html',
  styleUrl: './prediction-card.scss',
})
export class PredictionCardComponent {
  readonly dailySummaries = input<DailySummary[]>([]);
  readonly currentWeight = input<number | null>(null);

  protected readonly prediction = computed<WeightPrediction | null>(() => {
    const summaries = this.dailySummaries();
    if (summaries.length < 3) return null;

    const totalSurplus = summaries.reduce((sum, s) => sum + (s.deficitOrSurplus ?? 0), 0);
    const predictedChangeKg = Math.round((totalSurplus / KCAL_PER_KG) * 100) / 100;
    const avgDailySurplus = Math.round(totalSurplus / summaries.length);

    return {
      predictedChangeKg: Math.abs(predictedChangeKg),
      direction: totalSurplus >= 0 ? 'gain' : 'loss',
      avgDailySurplus,
      daysAnalyzed: summaries.length,
    };
  });

  protected readonly predictedWeight = computed(() => {
    const current = this.currentWeight();
    const pred = this.prediction();
    if (current === null || pred === null) return null;
    const change = pred.direction === 'gain' ? pred.predictedChangeKg : -pred.predictedChangeKg;
    return Math.round((current + change) * 10) / 10;
  });
}
