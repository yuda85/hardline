import { Component, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Weight } from '../../../store/weight/weight.actions';
import { WeightState } from '../../../store/weight/weight.state';
import { WeightEntry } from '../../../core/models/energy.model';

@Component({
  selector: 'app-weight-history',
  standalone: true,
  imports: [],
  templateUrl: './weight-history.html',
  styleUrl: './weight-history.scss',
})
export class WeightHistoryComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly entries = this.store.selectSignal(WeightState.entries);
  protected readonly latestWeight = this.store.selectSignal(WeightState.latestWeight);

  protected readonly sortedEntries = computed(() => {
    const all = this.entries();
    return [...all].sort((a, b) => b.date.localeCompare(a.date));
  });

  protected readonly thirtyDayChange = computed(() => {
    const sorted = this.sortedEntries();
    if (sorted.length < 2) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const latest = sorted[0];
    const oldest30d = [...sorted].reverse().find(e => e.date >= cutoffStr);
    if (!oldest30d || oldest30d.id === latest.id) return null;

    return Math.round((latest.weightKg - oldest30d.weightKg) * 10) / 10;
  });

  protected readonly progressPct = computed(() => {
    const sorted = this.sortedEntries();
    if (sorted.length < 2) return 0;
    // Simple: how many of the last 30 days have entries
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const recent = sorted.filter(e => e.date >= cutoffStr);
    return Math.min(100, Math.round((recent.length / 30) * 100));
  });

  protected readonly groupedByMonth = computed(() => {
    const sorted = this.sortedEntries();
    const groups: { month: string; isFirst: boolean; entries: (WeightEntry & { change: number | null })[] }[] = [];

    let currentMonth = '';
    let currentGroup: (WeightEntry & { change: number | null })[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const month = entry.date.substring(0, 7);
      const prevEntry = sorted[i + 1];
      const change = prevEntry ? Math.round((entry.weightKg - prevEntry.weightKg) * 100) / 100 : null;

      if (month !== currentMonth) {
        if (currentGroup.length > 0) {
          groups.push({ month: currentMonth, isFirst: groups.length === 0, entries: currentGroup });
        }
        currentMonth = month;
        currentGroup = [];
      }
      currentGroup.push({ ...entry, change });
    }

    if (currentGroup.length > 0) {
      groups.push({ month: currentMonth, isFirst: groups.length === 0, entries: currentGroup });
    }

    return groups;
  });

  ngOnInit() {
    this.store.dispatch(new Weight.LoadMore(365));
  }

  protected loadMore() {
    this.store.dispatch(new Weight.LoadMore(90));
  }

  protected monthName(yyyymm: string): string {
    const [year, month] = yyyymm.split('-');
    const date = new Date(+year, +month - 1);
    return date.toLocaleDateString('en', { month: 'long' });
  }

  protected formatDateFull(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  }

  protected goBack() { this.router.navigate(['/weight']); }
}
