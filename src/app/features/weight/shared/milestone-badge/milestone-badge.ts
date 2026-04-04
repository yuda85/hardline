import { Component, input, computed } from '@angular/core';
import { WeightEntry } from '../../../../core/models/energy.model';

export interface Milestone {
  type: 'weight' | 'streak';
  value: number;
  label: string;
  sublabel: string;
  icon: string;
  unlocked: boolean;
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

    if (target !== null && all.length >= 2) {
      const start = all[all.length - 1].weightKg;
      const current = all[0].weightKg;
      const direction = target < start ? 'loss' : 'gain';
      const progress = direction === 'loss' ? start - current : current - start;
      const totalNeeded = Math.abs(start - target);

      // Percentage milestones
      const pct5 = totalNeeded * 0.05;
      milestones.push({
        type: 'weight',
        value: 5,
        label: '5% Loss',
        sublabel: progress >= pct5 ? `Unlocked ${Math.floor(progress / pct5)}d ago` : 'In Progress',
        icon: 'star',
        unlocked: progress >= pct5,
      });

      // Absolute milestones
      const kgMilestone = Math.min(10, totalNeeded);
      milestones.push({
        type: 'weight',
        value: kgMilestone,
        label: `${Math.round(kgMilestone)}kg Total`,
        sublabel: progress >= kgMilestone ? 'Achieved' : 'In Progress',
        icon: 'trophy',
        unlocked: progress >= kgMilestone,
      });

      // Goal weight
      milestones.push({
        type: 'weight',
        value: 100,
        label: 'Goal Weight',
        sublabel: progress >= totalNeeded ? 'Achieved' : 'Locked',
        icon: progress >= totalNeeded ? 'emoji_events' : 'lock',
        unlocked: progress >= totalNeeded,
      });
    }

    return milestones;
  });
}
