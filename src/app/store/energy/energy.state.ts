import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { Energy } from './energy.actions';
import { EnergyStateModel, ENERGY_STATE_DEFAULTS } from './energy.model';
import { GoalSettingsRepository } from '../../data/repositories/goal-settings.repository';
import { MealRepository } from '../../data/repositories/meal.repository';
import { CardioRepository } from '../../data/repositories/cardio.repository';
import { StepsRepository } from '../../data/repositories/steps.repository';
import { DailySummaryRepository } from '../../data/repositories/daily-summary.repository';
import { WeeklySummaryRepository } from '../../data/repositories/weekly-summary.repository';
import { SessionRepository } from '../../data/repositories/session.repository';
import { EnergyCalcService } from '../../core/services/energy-calc.service';
import { AuthState } from '../auth/auth.state';
import { toDateString } from '../../core/services/date.util';
import {
  GoalSettings,
  Meal,
  CardioEntry,
  DailySteps,
  DailySummary,
  WeeklySummary,
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

    const start = new Date(action.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(action.date);
    end.setHours(23, 59, 59, 999);

    return forkJoin({
      meals: this.mealRepo.getByDateRange(uid, start, end).pipe(take(1)),
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
  async addMeal(ctx: StateContext<EnergyStateModel>, action: Energy.AddMeal) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    await this.mealRepo.create({
      userId: uid,
      ...action.meal,
      timestamp: new Date(),
    });

    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Energy.FetchDayData(date));
    ctx.dispatch(new Energy.RecalculateDailySummary());
  }

  @Action(Energy.RemoveMeal)
  async removeMeal(ctx: StateContext<EnergyStateModel>, action: Energy.RemoveMeal) {
    await this.mealRepo.remove(action.mealId);
    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Energy.FetchDayData(date));
    ctx.dispatch(new Energy.RecalculateDailySummary());
  }

  @Action(Energy.AddCardio)
  async addCardio(ctx: StateContext<EnergyStateModel>, action: Energy.AddCardio) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    await this.cardioRepo.create({
      userId: uid,
      ...action.entry,
      timestamp: new Date(),
    });

    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Energy.FetchDayData(date));
    ctx.dispatch(new Energy.RecalculateDailySummary());
  }

  @Action(Energy.RemoveCardio)
  async removeCardio(ctx: StateContext<EnergyStateModel>, action: Energy.RemoveCardio) {
    await this.cardioRepo.remove(action.entryId);
    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Energy.FetchDayData(date));
    ctx.dispatch(new Energy.RecalculateDailySummary());
  }

  @Action(Energy.UpdateSteps)
  async updateSteps(ctx: StateContext<EnergyStateModel>, action: Energy.UpdateSteps) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const caloriesBurned = this.calcService.estimateStepCalories(action.steps);
    await this.stepsRepo.upsert(uid, action.date, action.steps, caloriesBurned);

    ctx.patchState({
      todaysSteps: { userId: uid, date: action.date, steps: action.steps, caloriesBurned } as DailySteps,
    });
    ctx.dispatch(new Energy.RecalculateDailySummary());
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
      tap(async sessions => {
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

        await this.dailySummaryRepo.upsert(uid, date, summary);
        ctx.patchState({ dailySummary: summary as DailySummary });
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
      tap(async dailySummaries => {
        const summary = this.calcService.buildWeeklySummary(
          uid,
          action.weekStart,
          action.weekEnd,
          dailySummaries,
          goals?.weeklyTrainingFrequency ?? 4,
        );

        await this.weeklySummaryRepo.upsert(uid, action.weekStart, summary);
        ctx.patchState({ weeklySummary: summary as WeeklySummary });
      }),
    );
  }

  @Action(Energy.Reset)
  reset(ctx: StateContext<EnergyStateModel>) {
    ctx.setState(ENERGY_STATE_DEFAULTS);
  }
}
