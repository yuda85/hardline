import { GoalSettings, Meal, CardioEntry, DailySteps, DailySummary, WeeklySummary, CalorieDay } from '../../core/models/energy.model';
import { toDateString } from '../../core/services/date.util';

export interface EnergyStateModel {
  goalSettings: GoalSettings | null;
  selectedDate: string;
  todaysMeals: Meal[];
  todaysCardio: CardioEntry[];
  todaysSteps: DailySteps | null;
  dailySummary: DailySummary | null;
  weeklySummary: WeeklySummary | null;
  weeklyDailySummaries: DailySummary[];
  calorieDays: CalorieDay[];
  loading: boolean;
}

export const ENERGY_STATE_DEFAULTS: EnergyStateModel = {
  goalSettings: null,
  selectedDate: toDateString(new Date()),
  todaysMeals: [],
  todaysCardio: [],
  todaysSteps: null,
  dailySummary: null,
  weeklySummary: null,
  weeklyDailySummaries: [],
  calorieDays: [],
  loading: false,
};
