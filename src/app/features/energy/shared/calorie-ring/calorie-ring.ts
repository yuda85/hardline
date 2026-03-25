import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-calorie-ring',
  standalone: true,
  templateUrl: './calorie-ring.html',
  styleUrl: './calorie-ring.scss',
})
export class CalorieRingComponent {
  readonly consumed = input(0);
  readonly target = input(2000);
  readonly burned = input(0);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly remaining = computed(() => this.target() - this.consumed());
  protected readonly pct = computed(() => Math.min(100, Math.round((this.consumed() / Math.max(1, this.target())) * 100)));
  protected readonly strokeDash = computed(() => {
    const circumference = 2 * Math.PI * 42;
    return { array: circumference, offset: circumference - (circumference * this.pct()) / 100 };
  });
  protected readonly isOver = computed(() => this.consumed() > this.target());
}
