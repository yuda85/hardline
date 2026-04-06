import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-balance-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './balance-card.html',
  styleUrl: './balance-card.scss',
})
export class BalanceCardComponent {
  readonly budget = input(0);
  readonly eaten = input(0);
  readonly tdee = input(0);
  readonly goalAdjustment = input(0);
  readonly goalLabel = input('');

  protected readonly remaining = computed(() => this.budget() - this.eaten());
  protected readonly isDeficit = computed(() => this.remaining() >= 0);
  protected readonly usedPct = computed(() => {
    const b = this.budget();
    if (b === 0) return 0;
    return Math.min(100, Math.round((this.eaten() / b) * 100));
  });
  protected readonly adjustmentSign = computed(() => {
    const adj = this.goalAdjustment();
    return adj >= 0 ? '+' : '';
  });
}
