import { Component, input, computed } from '@angular/core';
import { WeightEntry } from '../../../../core/models/energy.model';
import { CardComponent } from '../../../../shared/components';

@Component({
  selector: 'app-weekly-recap',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './weekly-recap.html',
  styleUrl: './weekly-recap.scss',
})
export class WeeklyRecapComponent {
  readonly entries = input<WeightEntry[]>([]);
  readonly streak = input(0);

  protected readonly recap = computed(() => {
    const all = this.entries();
    if (all.length < 2) return null;

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

    const thisWeek = all.filter(e => e.date >= weekAgoStr);
    const lastWeek = all.filter(e => e.date >= twoWeeksAgoStr && e.date < weekAgoStr);

    if (thisWeek.length === 0) return null;

    const avgThis = thisWeek.reduce((s, e) => s + e.weightKg, 0) / thisWeek.length;
    const avgLast = lastWeek.length > 0
      ? lastWeek.reduce((s, e) => s + e.weightKg, 0) / lastWeek.length
      : null;

    const change = avgLast !== null ? Math.round((avgThis - avgLast) * 100) / 100 : null;
    const lowestThis = Math.min(...thisWeek.map(e => e.weightKg));
    const highestThis = Math.max(...thisWeek.map(e => e.weightKg));

    return {
      avgWeight: Math.round(avgThis * 10) / 10,
      change,
      logsThisWeek: thisWeek.length,
      lowest: Math.round(lowestThis * 10) / 10,
      highest: Math.round(highestThis * 10) / 10,
    };
  });
}
