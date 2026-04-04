import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-balance-card',
  standalone: true,
  templateUrl: './balance-card.html',
  styleUrl: './balance-card.scss',
})
export class BalanceCardComponent {
  readonly consumed = input(0);
  readonly burned = input(0);

  protected readonly net = computed(() => this.consumed() - this.burned());
  protected readonly isDeficit = computed(() => this.net() < 0);
  protected readonly label = computed(() => (this.isDeficit() ? 'Deficit' : 'Surplus'));
  protected readonly barPct = computed(() => {
    const total = this.burned();
    if (total === 0) return 0;
    return Math.min(100, Math.round((this.consumed() / total) * 100));
  });
}
