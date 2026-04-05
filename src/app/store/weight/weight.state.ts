import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take, switchMap } from 'rxjs/operators';
import { from, Observable } from 'rxjs';
import { Weight } from './weight.actions';
import { WeightStateModel, WEIGHT_STATE_DEFAULTS, ViewRange } from './weight.model';
import { WeightRepository } from '../../data/repositories/weight.repository';
import { AuthState } from '../auth/auth.state';
import { ProfileState } from '../profile/profile.state';
import { toDateString } from '../../core/services/date.util';
import { WeightEntry } from '../../core/models/energy.model';

const VIEW_RANGE_DAYS: Record<ViewRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

@State<WeightStateModel>({
  name: 'weight',
  defaults: WEIGHT_STATE_DEFAULTS,
})
@Injectable()
export class WeightState {
  private readonly weightRepo = inject(WeightRepository);
  private readonly store = inject(Store);

  // ── Selectors ──

  @Selector()
  static entries(state: WeightStateModel): WeightEntry[] {
    return state.entries;
  }

  @Selector()
  static todayEntry(state: WeightStateModel): WeightEntry | null {
    return state.todayEntry;
  }

  @Selector()
  static loading(state: WeightStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static viewRange(state: WeightStateModel): ViewRange {
    return state.viewRange;
  }

  @Selector()
  static showPrompt(state: WeightStateModel): boolean {
    return state.todayEntry === null && !state.promptDismissed && !state.loading;
  }

  @Selector()
  static visibleEntries(state: WeightStateModel): WeightEntry[] {
    const days = VIEW_RANGE_DAYS[state.viewRange];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return state.entries.filter(e => e.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
  }

  @Selector()
  static latestWeight(state: WeightStateModel): number | null {
    if (state.todayEntry) return state.todayEntry.weightKg;
    if (state.entries.length === 0) return null;
    return state.entries[0].weightKg; // entries are sorted desc
  }

  @Selector()
  static startWeight(state: WeightStateModel): number | null {
    if (state.entries.length === 0) return null;
    return state.entries[state.entries.length - 1].weightKg; // oldest entry
  }

  @Selector()
  static currentStreak(state: WeightStateModel): number {
    const entries = state.entries; // sorted desc by date
    if (entries.length === 0) return 0;

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < entries.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];

      if (entries.find(e => e.date === expectedStr)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  @Selector()
  static movingAverage7(state: WeightStateModel): { date: string; avg: number }[] {
    const sorted = [...state.entries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return [];

    return sorted.map((entry, i) => {
      const windowStart = Math.max(0, i - 6);
      const window = sorted.slice(windowStart, i + 1);
      const avg = window.reduce((sum, e) => sum + e.weightKg, 0) / window.length;
      return { date: entry.date, avg: Math.round(avg * 100) / 100 };
    });
  }

  @Selector()
  static goalProgress(state: WeightStateModel): {
    currentWeight: number;
    startWeight: number;
    targetWeight: number;
    progressPct: number;
    remainingKg: number;
  } | null {
    if (state.entries.length === 0) return null;

    const current = state.todayEntry?.weightKg ?? state.entries[0].weightKg;
    const start = state.entries[state.entries.length - 1].weightKg;

    // targetWeight comes from profile state — injected at component level
    // This selector provides raw weight data; the component combines with profile goal
    return null; // Components use the standalone function below
  }

  // ── Actions ──

  @Action(Weight.LoadHistory)
  loadHistory(ctx: StateContext<WeightStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });

    return this.weightRepo.getHistory(uid, 90).pipe(
      take(1),
      tap(entries => {
        const today = toDateString(new Date());
        const todayEntry = entries.find(e => e.date === today) ?? null;
        ctx.patchState({ entries, todayEntry, loading: false });
      }),
    );
  }

  @Action(Weight.LoadMore)
  loadMore(ctx: StateContext<WeightStateModel>, action: Weight.LoadMore) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const currentCount = ctx.getState().entries.length;
    return this.weightRepo.getHistory(uid, currentCount + action.count).pipe(
      take(1),
      tap(entries => {
        ctx.patchState({ entries });
      }),
    );
  }

  @Action(Weight.CheckToday)
  checkToday(ctx: StateContext<WeightStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const today = toDateString(new Date());

    return this.weightRepo.getByDate(uid, today).pipe(
      take(1),
      tap(entries => {
        ctx.patchState({ todayEntry: entries[0] ?? null });
      }),
    );
  }

  @Action(Weight.LogWeight)
  logWeight(ctx: StateContext<WeightStateModel>, action: Weight.LogWeight) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const today = toDateString(new Date());
    const existing = ctx.getState().todayEntry;

    const save$: Observable<unknown> = existing?.id
      ? from(this.weightRepo.update(existing.id, { weightKg: action.weightKg, notes: action.notes }))
      : from(this.weightRepo.create({ userId: uid, date: today, weightKg: action.weightKg, notes: action.notes }));

    return save$.pipe(
      switchMap(() => this.weightRepo.getByDate(uid, today).pipe(take(1))),
      tap(entries => {
        const todayEntry = entries[0] ?? null;
        const allEntries = [todayEntry!, ...ctx.getState().entries.filter(e => e.date !== today)];
        ctx.patchState({
          todayEntry,
          entries: allEntries,
          promptDismissed: true,
        });
      }),
    );
  }

  @Action(Weight.SetViewRange)
  setViewRange(ctx: StateContext<WeightStateModel>, action: Weight.SetViewRange) {
    ctx.patchState({ viewRange: action.range });

    // Load more data if needed for larger ranges
    const needed = VIEW_RANGE_DAYS[action.range];
    if (ctx.getState().entries.length < needed) {
      return ctx.dispatch(new Weight.LoadMore(needed));
    }
    return;
  }

  @Action(Weight.DismissPrompt)
  dismissPrompt(ctx: StateContext<WeightStateModel>) {
    ctx.patchState({ promptDismissed: true });
  }

  @Action(Weight.Reset)
  reset(ctx: StateContext<WeightStateModel>) {
    ctx.setState(WEIGHT_STATE_DEFAULTS);
  }
}

/** Compute goal progress from weight data + target. Used by components that combine WeightState + ProfileState. */
export function computeGoalProgress(
  currentWeight: number,
  startWeight: number,
  targetWeight: number | null,
): { progressPct: number; remainingKg: number; direction: 'loss' | 'gain' } | null {
  if (targetWeight === null) return null;

  const totalChange = Math.abs(startWeight - targetWeight);
  if (totalChange === 0) return { progressPct: 100, remainingKg: 0, direction: 'loss' };

  const direction: 'loss' | 'gain' = targetWeight < startWeight ? 'loss' : 'gain';
  const achieved = direction === 'loss'
    ? startWeight - currentWeight
    : currentWeight - startWeight;

  const progressPct = Math.max(0, Math.min(100, Math.round((achieved / totalChange) * 100)));
  const remainingKg = Math.round(Math.abs(currentWeight - targetWeight) * 10) / 10;

  return { progressPct, remainingKg, direction };
}
