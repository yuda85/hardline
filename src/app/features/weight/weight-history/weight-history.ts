import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Weight } from '../../../store/weight/weight.actions';
import { WeightState } from '../../../store/weight/weight.state';
import { CardComponent, ButtonComponent, IconButtonComponent } from '../../../shared/components';
import { WeightEntry } from '../../../core/models/energy.model';

@Component({
  selector: 'app-weight-history',
  standalone: true,
  imports: [CardComponent, ButtonComponent, IconButtonComponent],
  templateUrl: './weight-history.html',
  styleUrl: './weight-history.scss',
})
export class WeightHistoryComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly entries = this.store.selectSignal(WeightState.entries);
  protected readonly loading = this.store.selectSignal(WeightState.loading);

  protected readonly sortedEntries = computed(() => {
    const all = this.entries();
    return [...all].sort((a, b) => b.date.localeCompare(a.date));
  });

  protected readonly groupedByMonth = computed(() => {
    const sorted = this.sortedEntries();
    const groups: { month: string; entries: (WeightEntry & { change: number | null })[] }[] = [];

    let currentMonth = '';
    let currentGroup: (WeightEntry & { change: number | null })[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const month = entry.date.substring(0, 7); // YYYY-MM
      const prevEntry = sorted[i + 1];
      const change = prevEntry ? Math.round((entry.weightKg - prevEntry.weightKg) * 100) / 100 : null;

      if (month !== currentMonth) {
        if (currentGroup.length > 0) {
          groups.push({ month: currentMonth, entries: currentGroup });
        }
        currentMonth = month;
        currentGroup = [];
      }
      currentGroup.push({ ...entry, change });
    }

    if (currentGroup.length > 0) {
      groups.push({ month: currentMonth, entries: currentGroup });
    }

    return groups;
  });

  ngOnInit() {
    // Load all available history
    this.store.dispatch(new Weight.LoadMore(365));
  }

  protected loadMore() {
    this.store.dispatch(new Weight.LoadMore(90));
  }

  protected formatMonth(yyyymm: string): string {
    const [year, month] = yyyymm.split('-');
    const date = new Date(+year, +month - 1);
    return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }

  protected formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
  }

  protected goBack() { this.router.navigate(['/weight']); }
}
