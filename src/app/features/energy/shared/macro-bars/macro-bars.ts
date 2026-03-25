import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-macro-bars',
  standalone: true,
  templateUrl: './macro-bars.html',
  styleUrl: './macro-bars.scss',
})
export class MacroBarsComponent {
  readonly protein = input(0);
  readonly proteinGoal = input(150);
  readonly carbs = input(0);
  readonly carbsGoal = input(200);
  readonly fat = input(0);
  readonly fatGoal = input(70);

  protected readonly proteinPct = computed(() => this.pct(this.protein(), this.proteinGoal()));
  protected readonly carbsPct = computed(() => this.pct(this.carbs(), this.carbsGoal()));
  protected readonly fatPct = computed(() => this.pct(this.fat(), this.fatGoal()));

  private pct(current: number, goal: number): number {
    return Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
  }
}
