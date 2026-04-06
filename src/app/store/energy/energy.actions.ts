import { GoalSettings, Meal, CardioEntry, MealType, MealItem, MealSource } from '../../core/models/energy.model';

export namespace Energy {
  export class LoadGoalSettings {
    static readonly type = '[Energy] Load Goal Settings';
  }

  export class SaveGoalSettings {
    static readonly type = '[Energy] Save Goal Settings';
    constructor(public settings: Omit<GoalSettings, 'id' | 'createdAt' | 'updatedAt'>) {}
  }

  export class SetDate {
    static readonly type = '[Energy] Set Date';
    constructor(public date: string) {}
  }

  export class FetchDayData {
    static readonly type = '[Energy] Fetch Day Data';
    constructor(public date: string) {}
  }

  export class AddMeal {
    static readonly type = '[Energy] Add Meal';
    constructor(public meal: {
      date: string;
      mealType: MealType;
      items: MealItem[];
      totalCalories: number;
      totalProtein: number;
      totalCarbs: number;
      totalFat: number;
      source: MealSource;
      confidence: number;
      notes?: string;
    }) {}
  }

  export class RemoveMeal {
    static readonly type = '[Energy] Remove Meal';
    constructor(public mealId: string) {}
  }

  export class AddCardio {
    static readonly type = '[Energy] Add Cardio';
    constructor(public entry: {
      date: string;
      type: string;
      durationMinutes: number;
      distanceKm?: number;
      avgHeartRate?: number;
      caloriesBurned: number;
    }) {}
  }

  export class RemoveCardio {
    static readonly type = '[Energy] Remove Cardio';
    constructor(public entryId: string) {}
  }

  export class UpdateSteps {
    static readonly type = '[Energy] Update Steps';
    constructor(public date: string, public steps: number) {}
  }

  export class RecalculateDailySummary {
    static readonly type = '[Energy] Recalculate Daily Summary';
  }

  export class FetchWeeklySummary {
    static readonly type = '[Energy] Fetch Weekly Summary';
    constructor(public weekStart: string) {}
  }

  export class RecalculateWeeklySummary {
    static readonly type = '[Energy] Recalculate Weekly Summary';
    constructor(public weekStart: string, public weekEnd: string) {}
  }

  export class FetchWeeklyDailySummaries {
    static readonly type = '[Energy] Fetch Weekly Daily Summaries';
    constructor(public weekStart: string, public weekEnd: string) {}
  }

  export class FetchCalorieDays {
    static readonly type = '[Energy] Fetch Calorie Days';
    constructor(public startDate: string, public endDate: string) {}
  }

  export class Reset {
    static readonly type = '[Energy] Reset';
  }
}
