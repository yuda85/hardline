import { GoalSettings, Meal, CardioEntry, DailySteps, DailySummary, WeeklySummary, CalorieDay } from '../../core/models/energy.model';
import { toDateString } from '../../core/services/date.util';

export interface LiveWeeklyIntakeDay {
  date: string;
  /** 0=Sunday … 6=Saturday */
  dayOfWeek: number;
  calories: number;
  budget: number;
}

export interface LiveWeeklyIntake {
  weekStart: string;
  weekEnd: string;
  days: LiveWeeklyIntakeDay[];
  /** Average daily intake across the 7 days (includes 0-cal days). */
  avgIntake: number;
  /** Average daily budget. */
  avgBudget: number;
  /** % of days where intake fell within ±10% of budget. 0 if no budget. */
  adherencePct: number;
}

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
  liveWeeklyIntake: LiveWeeklyIntake | null;
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
  liveWeeklyIntake: null,
  loading: false,
};
