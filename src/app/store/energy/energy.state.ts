import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take, switchMap } from 'rxjs/operators';
import { forkJoin, from, of } from 'rxjs';
import { Energy } from './energy.actions';
import { EnergyStateModel, ENERGY_STATE_DEFAULTS, LiveWeeklyIntake, LiveWeeklyIntakeDay } from './energy.model';
import { GoalSettingsRepository } from '../../data/repositories/goal-settings.repository';
import { MealRepository } from '../../data/repositories/meal.repository';
import { CardioRepository } from '../../data/repositories/cardio.repository';
import { StepsRepository } from '../../data/repositories/steps.repository';
import { DailySummaryRepository } from '../../data/repositories/daily-summary.repository';
import { WeeklySummaryRepository } from '../../data/repositories/weekly-summary.repository';
import { SessionRepository } from '../../data/repositories/session.repository';
import { EnergyCalcService } from '../../core/services/energy-calc.service';
import { AuthState } from '../auth/auth.state';
import { toDateString, dayOfWeek } from '../../core/services/date.util';
import {
  GoalSettings,
  Meal,
  CardioEntry,
  DailySteps,
  DailySummary,
  WeeklySummary,
  CalorieDay,
  EnergyBudget,
  DEFAULT_GOAL_SETTINGS,
} from '../../core/models/energy.model';

@State<EnergyStateModel>({
  name: 'energy',
  defaults: ENERGY_STATE_DEFAULTS,
})
@Injectable()
export class EnergyState {
  private readonly goalRepo = inject(GoalSettingsRepository);
  private readonly mealRepo = inject(MealRepository);
  private readonly cardioRepo = inject(CardioRepository);
  private readonly stepsRepo = inject(StepsRepository);
  private readonly dailySummaryRepo = inject(DailySummaryRepository);
  private readonly weeklySummaryRepo = inject(WeeklySummaryRepository);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly calcService = inject(EnergyCalcService);
  private readonly store = inject(Store);

  // ── Selectors ──

  @Selector()
  static goalSettings(state: EnergyStateModel): GoalSettings | null {
    return state.goalSettings;
  }

  @Selector()
  static selectedDate(state: EnergyStateModel): string {
    return state.selectedDate;
  }

  @Selector()
  static todaysMeals(state: EnergyStateModel): Meal[] {
    return state.todaysMeals;
  }

  @Selector()
  static todaysCardio(state: EnergyStateModel): CardioEntry[] {
    return state.todaysCardio;
  }

  @Selector()
  static todaysSteps(state: EnergyStateModel): DailySteps | null {
    return state.todaysSteps;
  }

  @Selector()
  static dailySummary(state: EnergyStateModel): DailySummary | null {
    return state.dailySummary;
  }

  @Selector()
  static weeklySummary(state: EnergyStateModel): WeeklySummary | null {
    return state.weeklySummary;
  }

  @Selector()
  static loading(state: EnergyStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static dailyCalorieTarget(state: EnergyStateModel): number {
    return state.goalSettings?.dailyCalories ?? 2000;
  }

  @Selector()
  static dailyProteinTarget(state: EnergyStateModel): number {
    return state.goalSettings?.dailyProtein ?? 150;
  }

  @Selector()
  static weeklyDailySummaries(state: EnergyStateModel): DailySummary[] {
    return state.weeklyDailySummaries;
  }

  @Selector()
  static calorieDays(state: EnergyStateModel): CalorieDay[] {
    return state.calorieDays;
  }

  @Selector()
  static liveWeeklyIntake(state: EnergyStateModel): LiveWeeklyIntake | null {
    return state.liveWeeklyIntake;
  }

  // ── Actions ──

  @Action(Energy.LoadGoalSettings)
  loadGoalSettings(ctx: StateContext<EnergyStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.goalRepo.getByUser(uid).pipe(
      take(1),
      tap(settings => {
        ctx.patchState({ goalSettings: settings ?? null });
      }),
    );
  }

  @Action(Energy.SaveGoalSettings)
  async saveGoalSettings(ctx: StateContext<EnergyStateModel>, action: Energy.SaveGoalSettings) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    await this.goalRepo.save(uid, action.settings);
    ctx.patchState({ goalSettings: action.settings as GoalSettings });
  }

  @Action(Energy.SetDate)
  setDate(ctx: StateContext<EnergyStateModel>, action: Energy.SetDate) {
    ctx.patchState({ selectedDate: action.date });
    ctx.dispatch(new Energy.FetchDayData(action.date));
  }

  @Action(Energy.FetchDayData)
  fetchDayData(ctx: StateContext<EnergyStateModel>, action: Energy.FetchDayData) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });

    return forkJoin({
      meals: this.mealRepo.getByDate(uid, action.date).pipe(take(1)),
      cardio: this.cardioRepo.getByDate(uid, action.date).pipe(take(1)),
      steps: this.stepsRepo.getByDate(uid, action.date).pipe(take(1)),
      summary: this.dailySummaryRepo.getByDate(uid, action.date).pipe(take(1)),
    }).pipe(
      tap(({ meals, cardio, steps, summary }) => {
        ctx.patchState({
          todaysMeals: meals,
          todaysCardio: cardio,
          todaysSteps: steps[0] ?? null,
          dailySummary: summary[0] ?? null,
          loading: false,
        });
      }),
    );
  }

  @Action(Energy.AddMeal)
  addMeal(ctx: StateContext<EnergyStateModel>, action: Energy.AddMeal) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return from(this.mealRepo.create({
      userId: uid,
      ...action.meal,
      timestamp: new Date(),
    })).pipe(
      switchMap(() => ctx.dispatch(new Energy.FetchDayData(ctx.getState().selectedDate))),
      switchMap(() => ctx.dispatch(new Energy.RecalculateDailySummary())),
    );
  }

  @Action(Energy.RemoveMeal)
  removeMeal(ctx: StateContext<EnergyStateModel>, action: Energy.RemoveMeal) {
    return from(this.mealRepo.remove(action.mealId)).pipe(
      switchMap(() => ctx.dispatch(new Energy.FetchDayData(ctx.getState().selectedDate))),
      switchMap(() => ctx.dispatch(new Energy.RecalculateDailySummary())),
    );
  }

  @Action(Energy.AddCardio)
  addCardio(ctx: StateContext<EnergyStateModel>, action: Energy.AddCardio) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return from(this.cardioRepo.create({
      userId: uid,
      ...action.entry,
      timestamp: new Date(),
    })).pipe(
      switchMap(() => ctx.dispatch(new Energy.FetchDayData(ctx.getState().selectedDate))),
      switchMap(() => ctx.dispatch(new Energy.RecalculateDailySummary())),
    );
  }

  @Action(Energy.RemoveCardio)
  removeCardio(ctx: StateContext<EnergyStateModel>, action: Energy.RemoveCardio) {
    return from(this.cardioRepo.remove(action.entryId)).pipe(
      switchMap(() => ctx.dispatch(new Energy.FetchDayData(ctx.getState().selectedDate))),
      switchMap(() => ctx.dispatch(new Energy.RecalculateDailySummary())),
    );
  }

  @Action(Energy.UpdateSteps)
  updateSteps(ctx: StateContext<EnergyStateModel>, action: Energy.UpdateSteps) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const caloriesBurned = this.calcService.estimateStepCalories(action.steps);
    return from(this.stepsRepo.upsert(uid, action.date, action.steps, caloriesBurned)).pipe(
      tap(() => {
        ctx.patchState({
          todaysSteps: { userId: uid, date: action.date, steps: action.steps, caloriesBurned } as DailySteps,
        });
      }),
      switchMap(() => ctx.dispatch(new Energy.RecalculateDailySummary())),
    );
  }

  @Action(Energy.RecalculateDailySummary)
  recalculateDailySummary(ctx: StateContext<EnergyStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const state = ctx.getState();
    const goals = state.goalSettings;
    if (!goals) return;

    const date = state.selectedDate;

    // Get workout sessions for this date
    return this.sessionRepo.getHistory(uid, 50).pipe(
      take(1),
      switchMap(sessions => {
        const daySessions = sessions.filter(s => {
          return toDateString(s.startedAt) === date && s.completedAt;
        });

        const summary = this.calcService.buildDailySummary(
          date,
          uid,
          goals,
          state.todaysMeals,
          state.todaysCardio,
          state.todaysSteps,
          daySessions,
          state.dailySummary?.weightKg,
        );

        return from(this.dailySummaryRepo.upsert(uid, date, summary)).pipe(
          tap(() => {
            ctx.patchState({ dailySummary: summary as DailySummary });
          }),
        );
      }),
    );
  }

  @Action(Energy.FetchWeeklySummary)
  fetchWeeklySummary(ctx: StateContext<EnergyStateModel>, action: Energy.FetchWeeklySummary) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.weeklySummaryRepo.getByWeek(uid, action.weekStart).pipe(
      take(1),
      tap(summaries => {
        ctx.patchState({ weeklySummary: summaries[0] ?? null });
      }),
    );
  }

  @Action(Energy.RecalculateWeeklySummary)
  recalculateWeeklySummary(ctx: StateContext<EnergyStateModel>, action: Energy.RecalculateWeeklySummary) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const goals = ctx.getState().goalSettings;

    return this.dailySummaryRepo.getByDateRange(uid, action.weekStart, action.weekEnd).pipe(
      take(1),
      switchMap(dailySummaries => {
        const summary = this.calcService.buildWeeklySummary(
          uid,
          action.weekStart,
          action.weekEnd,
          dailySummaries,
          goals?.weeklyTrainingFrequency ?? 4,
        );

        return from(this.weeklySummaryRepo.upsert(uid, action.weekStart, summary)).pipe(
          tap(() => {
            ctx.patchState({ weeklySummary: summary as WeeklySummary });
          }),
        );
      }),
    );
  }

  @Action(Energy.FetchWeeklyDailySummaries)
  fetchWeeklyDailySummaries(ctx: StateContext<EnergyStateModel>, action: Energy.FetchWeeklyDailySummaries) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.dailySummaryRepo.getByDateRange(uid, action.weekStart, action.weekEnd).pipe(
      take(1),
      tap(summaries => {
        ctx.patchState({ weeklyDailySummaries: summaries });
      }),
    );
  }

  @Action(Energy.FetchCalorieDays)
  fetchCalorieDays(ctx: StateContext<EnergyStateModel>, action: Energy.FetchCalorieDays) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.dailySummaryRepo.getByDateRange(uid, action.startDate, action.endDate).pipe(
      take(1),
      tap(summaries => {
        const calorieDays = this.calcService.buildCalorieDays(summaries);
        ctx.patchState({ calorieDays });
      }),
    );
  }

  @Action(Energy.FetchLiveWeeklyIntake)
  fetchLiveWeeklyIntake(ctx: StateContext<EnergyStateModel>, action: Energy.FetchLiveWeeklyIntake) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const budget = ctx.getState().goalSettings?.dailyCalories ?? 0;

    // Build a wide timestamp range covering the entire week start..end (inclusive).
    const [sy, sm, sd] = action.weekStart.split('-').map(Number);
    const [ey, em, ed] = action.weekEnd.split('-').map(Number);
    const startDate = new Date(sy, (sm ?? 1) - 1, sd ?? 1, 0, 0, 0, 0);
    const endDate = new Date(ey, (em ?? 1) - 1, ed ?? 1, 23, 59, 59, 999);

    return this.mealRepo.getByDateRange(uid, startDate, endDate).pipe(
      take(1),
      tap(meals => {
        // Sum calories per local date string. Trust meal.date when present,
        // otherwise fall back to the timestamp's local date.
        const byDate = new Map<string, number>();
        for (const m of meals) {
          const key = m.date ?? toDateString(m.timestamp as unknown);
          if (key < action.weekStart || key > action.weekEnd) continue;
          byDate.set(key, (byDate.get(key) ?? 0) + (m.totalCalories ?? 0));
        }

        // Fill all 7 days of the week (Sun..Sat order matches startDay=0).
        const days: LiveWeeklyIntakeDay[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const key = toDateString(d);
          const calories = Math.round(byDate.get(key) ?? 0);
          days.push({ date: key, dayOfWeek: dayOfWeek(key), calories, budget });
        }

        const totalIntake = days.reduce((s, d) => s + d.calories, 0);
        const avgIntake = Math.round(totalIntake / 7);
        const avgBudget = Math.round(budget); // constant per week for now
        const tolerance = 0.10;
        const onTarget = budget > 0
          ? days.filter(d => d.calories > 0 && Math.abs(d.calories - budget) / budget <= tolerance).length
          : 0;
        const daysWithIntake = days.filter(d => d.calories > 0).length;
        const adherencePct = daysWithIntake > 0 ? Math.round((onTarget / daysWithIntake) * 100) : 0;

        const liveWeeklyIntake: LiveWeeklyIntake = {
          weekStart: action.weekStart,
          weekEnd: action.weekEnd,
          days,
          avgIntake,
          avgBudget,
          adherencePct,
        };
        ctx.patchState({ liveWeeklyIntake });
      }),
    );
  }

  @Action(Energy.Reset)
  reset(ctx: StateContext<EnergyStateModel>) {
    ctx.setState(ENERGY_STATE_DEFAULTS);
  }
}
