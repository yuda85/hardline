import { Meal, DailyNutritionSummary } from '../../core/models';

export interface NutritionStateModel {
  todaysMeals: Meal[];
  dailySummary: DailyNutritionSummary | null;
  selectedDate: string;
  loading: boolean;
}

export const NUTRITION_STATE_DEFAULTS: NutritionStateModel = {
  todaysMeals: [],
  dailySummary: null,
  selectedDate: new Date().toISOString().split('T')[0],
  loading: false,
};
