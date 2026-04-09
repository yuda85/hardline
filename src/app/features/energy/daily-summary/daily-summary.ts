import { Component, inject, computed, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { CalorieRingComponent } from '../shared/calorie-ring/calorie-ring';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import { BalanceCardComponent } from '../shared/balance-card/balance-card';
import { toDateString } from '../../../core/services/date.util';

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [CalorieRingComponent, MacroBarsComponent, BalanceCardComponent],
  templateUrl: './daily-summary.html',
  styleUrl: './daily-summary.scss',
})
export class DailySummaryComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly calcService = inject(EnergyCalcService);

  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly selectedDate = this.store.selectSignal(EnergyState.selectedDate);

  protected readonly budget = computed(() => {
    const g = this.goals();
    const s = this.summary();
    if (!g) return null;
    return this.calcService.buildEnergyBudget(g, s);
  });

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings());
    const today = toDateString(new Date());
    this.store.dispatch(new Energy.FetchDayData(today));
    this.store.dispatch(new Energy.RecalculateDailySummary());
  }

  protected prevDay() {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() - 1);
    this.store.dispatch(new Energy.SetDate(toDateString(current)));
  }

  protected nextDay() {
    const current = new Date(this.selectedDate());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + 1);
    if (current <= today) {
      this.store.dispatch(new Energy.SetDate(toDateString(current)));
    }
  }

  protected formatDate(dateStr: string): string {
    const target = new Date(dateStr); const today = new Date();
    today.setHours(0, 0, 0, 0); target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) return 'Today';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
