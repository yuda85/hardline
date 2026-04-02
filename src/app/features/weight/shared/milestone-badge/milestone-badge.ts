import { Component, input, computed } from '@angular/core';
import { WeightEntry } from '../../../../core/models/energy.model';

export interface Milestone {
  type: 'weight' | 'streak';
  value: number;
  label: string;
  icon: string;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90];

@Component({
  selector: 'app-milestone-badge',
  standalone: true,
  templateUrl: './milestone-badge.html',
  styleUrl: './milestone-badge.scss',
})
export class MilestoneBadgeComponent {
  readonly entries = input<WeightEntry[]>([]);
  readonly streak = input(0);
  readonly targetWeight = input<number | null>(null);

  protected readonly milestones = computed<Milestone[]>(() => {
    const all = this.entries();
    const target = this.targetWeight();
    const currentStreak = this.streak();
    const milestones: Milestone[] = [];

    // Weight milestones: every 1kg toward target
    if (target !== null && all.length >= 2) {
      const start = all[all.length - 1].weightKg;
      const current = all[0].weightKg;
      const direction = target < start ? 'loss' : 'gain';
      const progress = direction === 'loss' ? start - current : current - start;
      const kgsHit = Math.floor(Math.max(0, progress));

      for (let i = 1; i <= kgsHit; i++) {
        milestones.push({
          type: 'weight',
          value: i,
          label: `${i}kg ${direction === 'loss' ? 'lost' : 'gained'}`,
          icon: direction === 'loss' ? 'trending_down' : 'trending_up',
        });
      }
    }

    // Streak milestones
    for (const m of STREAK_MILESTONES) {
      if (currentStreak >= m) {
        milestones.push({
          type: 'streak',
          value: m,
          label: `${m}-day streak`,
          icon: 'local_fire_department',
        });
      }
    }

    return milestones;
  });
}
