import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { getWeekRange } from '../../../core/services/date.util';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

@Component({
  selector: 'app-weekly-summary',
  standalone: true,
  imports: [],
  templateUrl: './weekly-summary.html',
  styleUrl: './weekly-summary.scss',
})
export class WeeklySummaryComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly weeklySummary = this.store.selectSignal(EnergyState.weeklySummary);
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly liveWeeklyIntake = this.store.selectSignal(EnergyState.liveWeeklyIntake);
  protected readonly weekLabel = signal('');
  protected readonly dayLabels = DAY_LABELS;

  /** Max bar value for the daily intake chart — at least the budget so bars scale correctly. */
  protected readonly chartMax = computed(() => {
    const live = this.liveWeeklyIntake();
    if (!live) return 1;
    const max = Math.max(live.avgBudget, ...live.days.map(d => d.calories));
    return max > 0 ? max : 1;
  });

  private weekStart = '';
  private weekEnd = '';

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings()).subscribe(() => {
      this.loadCurrentWeek();
    });
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
    this.setWeek(new Date());
  }

  private setWeek(date: Date) {
    const range = getWeekRange(date, 0); // Sun–Sat
    this.weekStart = range.start;
    this.weekEnd = range.end;

    const start = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T00:00:00`);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    this.weekLabel.set(`${startStr} – ${endStr}`);

    this.store.dispatch(new Energy.FetchWeeklySummary(this.weekStart));
    this.store.dispatch(new Energy.FetchLiveWeeklyIntake(this.weekStart, this.weekEnd));
  }
}
