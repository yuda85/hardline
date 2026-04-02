import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-goal-ring',
  standalone: true,
  templateUrl: './goal-ring.html',
  styleUrl: './goal-ring.scss',
})
export class GoalRingComponent {
  readonly currentWeight = input(0);
  readonly startWeight = input(0);
  readonly targetWeight = input<number | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly hasGoal = computed(() => this.targetWeight() !== null && this.startWeight() > 0);

  protected readonly direction = computed(() => {
    const target = this.targetWeight();
    if (target === null) return 'loss';
    return target < this.startWeight() ? 'loss' : 'gain';
  });

  protected readonly progressPct = computed(() => {
    const target = this.targetWeight();
    if (target === null || this.startWeight() === 0) return 0;

    const total = Math.abs(this.startWeight() - target);
    if (total === 0) return 100;

    const achieved = this.direction() === 'loss'
      ? this.startWeight() - this.currentWeight()
      : this.currentWeight() - this.startWeight();

    return Math.max(0, Math.min(100, Math.round((achieved / total) * 100)));
  });

  protected readonly remainingKg = computed(() => {
    const target = this.targetWeight();
    if (target === null) return 0;
    return Math.round(Math.abs(this.currentWeight() - target) * 10) / 10;
  });

  protected readonly strokeDash = computed(() => {
    const circumference = 2 * Math.PI * 42;
    return {
      array: circumference,
      offset: circumference - (circumference * this.progressPct()) / 100,
    };
  });

  protected readonly isComplete = computed(() => this.progressPct() >= 100);
}
