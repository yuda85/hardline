import { Component, inject, OnInit, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';

@Component({
  selector: 'app-weekly-summary',
  standalone: true,
  imports: [ButtonComponent, CardComponent, BadgeComponent],
  templateUrl: './weekly-summary.html',
  styleUrl: './weekly-summary.scss',
})
export class WeeklySummaryComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly weeklySummary = this.store.selectSignal(EnergyState.weeklySummary);
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly weekLabel = signal('');

  private weekStart = '';
  private weekEnd = '';

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings());
    this.loadCurrentWeek();
  }

  protected prevWeek() {
    const start = new Date(this.weekStart);
    start.setDate(start.getDate() - 7);
    this.setWeek(start);
  }

  protected nextWeek() {
    const start = new Date(this.weekStart);
    start.setDate(start.getDate() + 7);
    const today = new Date();
    if (start <= today) this.setWeek(start);
  }

  protected recalculate() {
    this.store.dispatch(new Energy.RecalculateWeeklySummary(this.weekStart, this.weekEnd));
  }

  private loadCurrentWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    this.setWeek(monday);
  }

  private setWeek(monday: Date) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    this.weekStart = monday.toISOString().split('T')[0];
    this.weekEnd = sunday.toISOString().split('T')[0];

    const startStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    this.weekLabel.set(`${startStr} – ${endStr}`);

    this.store.dispatch(new Energy.FetchWeeklySummary(this.weekStart));
  }
}
