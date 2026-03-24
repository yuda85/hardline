import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { Nutrition } from './nutrition.actions';
import { NutritionStateModel, NUTRITION_STATE_DEFAULTS } from './nutrition.model';
import { MealRepository } from '../../data/repositories/meal.repository';
import { AuthState } from '../auth/auth.state';
import { ProfileState } from '../profile/profile.state';
import { DailyNutritionSummary, Meal } from '../../core/models';

@State<NutritionStateModel>({
  name: 'nutrition',
  defaults: NUTRITION_STATE_DEFAULTS,
})
@Injectable()
export class NutritionState {
  private readonly mealRepo = inject(MealRepository);
  private readonly store = inject(Store);

  @Selector()
  static todaysMeals(state: NutritionStateModel): Meal[] {
    return state.todaysMeals;
  }

  @Selector()
  static dailySummary(state: NutritionStateModel): DailyNutritionSummary | null {
    return state.dailySummary;
  }

  @Selector()
  static totalCalories(state: NutritionStateModel): number {
    return state.dailySummary?.totalCalories ?? 0;
  }

  @Selector()
  static totalProtein(state: NutritionStateModel): number {
    return state.dailySummary?.totalProtein ?? 0;
  }

  @Selector()
  static selectedDate(state: NutritionStateModel): string {
    return state.selectedDate;
  }

  @Selector()
  static loading(state: NutritionStateModel): boolean {
    return state.loading;
  }

  @Action(Nutrition.FetchMeals)
  fetchMeals(ctx: StateContext<NutritionStateModel>, action: Nutrition.FetchMeals) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true, selectedDate: action.date });

    const start = new Date(action.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(action.date);
    end.setHours(23, 59, 59, 999);

    return this.mealRepo.getByDateRange(uid, start, end).pipe(
      take(1),
      tap(meals => {
        const summary = this.calculateSummary(meals, action.date);
        ctx.patchState({ todaysMeals: meals, dailySummary: summary, loading: false });
      }),
    );
  }

  @Action(Nutrition.AddMeal)
  async addMeal(ctx: StateContext<NutritionStateModel>, action: Nutrition.AddMeal) {
    await this.mealRepo.create(action.meal);
    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Nutrition.FetchMeals(date));
  }

  @Action(Nutrition.RemoveMeal)
  async removeMeal(ctx: StateContext<NutritionStateModel>, action: Nutrition.RemoveMeal) {
    await this.mealRepo.remove(action.mealId);
    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Nutrition.FetchMeals(date));
  }

  @Action(Nutrition.UpdateMeal)
  async updateMeal(ctx: StateContext<NutritionStateModel>, action: Nutrition.UpdateMeal) {
    await this.mealRepo.update(action.mealId, action.changes);
    const date = ctx.getState().selectedDate;
    ctx.dispatch(new Nutrition.FetchMeals(date));
  }

  @Action(Nutrition.SetDate)
  setDate(ctx: StateContext<NutritionStateModel>, action: Nutrition.SetDate) {
    ctx.dispatch(new Nutrition.FetchMeals(action.date));
  }

  @Action(Nutrition.Reset)
  reset(ctx: StateContext<NutritionStateModel>) {
    ctx.setState(NUTRITION_STATE_DEFAULTS);
  }

  private calculateSummary(meals: Meal[], date: string): DailyNutritionSummary {
    return {
      date,
      totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
      totalProtein: meals.reduce((sum, m) => sum + m.totalProtein, 0),
      totalCarbs: meals.reduce((sum, m) => sum + m.totalCarbs, 0),
      totalFat: meals.reduce((sum, m) => sum + m.totalFat, 0),
      mealCount: meals.length,
    };
  }
}
