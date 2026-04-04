import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { CalorieRingComponent } from '../shared/calorie-ring/calorie-ring';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import { BalanceCardComponent } from '../shared/balance-card/balance-card';

@Component({
  selector: 'app-energy-home',
  standalone: true,
  imports: [CalorieRingComponent, MacroBarsComponent, BalanceCardComponent],
  templateUrl: './energy-home.html',
  styleUrl: './energy-home.scss',
})
export class EnergyHomeComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly steps = this.store.selectSignal(EnergyState.todaysSteps);
  protected readonly loading = this.store.selectSignal(EnergyState.loading);

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings()).subscribe(() => {
      const today = new Date().toISOString().split('T')[0];
      this.store.dispatch(new Energy.FetchDayData(today)).subscribe(() => {
        this.store.dispatch(new Energy.RecalculateDailySummary());
      });
    });
  }

  protected goToGoals() { this.router.navigate(['/energy', 'goals']); }
  protected goToFood() { this.router.navigate(['/energy', 'food']); }
  protected goToActivity() { this.router.navigate(['/energy', 'activity']); }
  protected goToDaily() { this.router.navigate(['/energy', 'daily']); }
  protected goToWeekly() { this.router.navigate(['/energy', 'weekly']); }
}
