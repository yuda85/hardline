import { Injectable } from '@angular/core';
import {
  Sex,
  ActivityLevel,
  FitnessGoal,
  RateOfChange,
  MacroPreference,
  GoalSettings,
  Meal,
  CardioEntry,
  DailySteps,
  DailySummary,
  WeeklySummary,
  EnergyBudget,
  CalorieDay,
} from '../models/energy.model';
import { WorkoutSession } from '../models/workout.model';
import { toDate } from './date.util';

// ── Activity Multipliers ──
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ── Calorie Adjustments ──
const CALORIE_ADJUSTMENTS: Record<FitnessGoal, Record<RateOfChange, number>> = {
  fat_loss: { slow: -250, moderate: -500, aggressive: -750 },
  maintenance: { slow: 0, moderate: 0, aggressive: 0 },
  muscle_gain: { slow: 150, moderate: 300, aggressive: 500 },
};

// ── Macro Ratios (protein%, carbs%, fat%) ──
const MACRO_RATIOS: Record<Exclude<MacroPreference, 'custom'>, { protein: number; carbs: number; fat: number }> = {
  balanced: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  high_protein: { protein: 0.4, carbs: 0.3, fat: 0.3 },
  low_carb: { protein: 0.35, carbs: 0.25, fat: 0.4 },
};

// ── Cal per gram ──
const CAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

// ── Steps cal estimate ──
const CAL_PER_STEP = 0.04;

@Injectable({ providedIn: 'root' })
export class EnergyCalcService {
  // ────── BMR (Mifflin-St Jeor) ──────

  calculateBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(sex === 'male' ? base + 5 : base - 161);
  }

  // ────── TDEE ──────

  calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  }

  // ────── Calorie Target ──────

  calculateCalorieTarget(tdee: number, goal: FitnessGoal, rate: RateOfChange): number {
    return Math.max(1200, tdee + CALORIE_ADJUSTMENTS[goal][rate]);
  }

  // ────── Macro Targets ──────

  calculateMacros(
    calories: number,
    preference: MacroPreference,
    customRatios?: { protein: number; carbs: number; fat: number },
  ): { protein: number; carbs: number; fat: number } {
    const ratios = preference === 'custom' && customRatios ? customRatios : MACRO_RATIOS[preference as Exclude<MacroPreference, 'custom'>] ?? MACRO_RATIOS['balanced'];

    return {
      protein: Math.round((calories * ratios.protein) / CAL_PER_GRAM.protein),
      carbs: Math.round((calories * ratios.carbs) / CAL_PER_GRAM.carbs),
      fat: Math.round((calories * ratios.fat) / CAL_PER_GRAM.fat),
    };
  }

  // ────── Goal Adjustment ──────

  calculateGoalAdjustment(goal: FitnessGoal, rate: RateOfChange): number {
    return CALORIE_ADJUSTMENTS[goal][rate];
  }

  // ────── Goal Label ──────

  goalLabel(goal: FitnessGoal): string {
    switch (goal) {
      case 'fat_loss': return 'Fat Loss';
      case 'maintenance': return 'Maintenance';
      case 'muscle_gain': return 'Muscle Gain';
    }
  }

  // ────── Energy Budget ──────

  buildEnergyBudget(goals: GoalSettings, summary: DailySummary | null): EnergyBudget {
    const adjustment = goals.goalAdjustment ?? (goals.dailyCalories - goals.tdee);
    const budget = goals.dailyCalories;
    const eaten = summary?.consumedCalories ?? 0;
    const remaining = budget - eaten;

    return {
      tdee: goals.tdee,
      goalAdjustment: adjustment,
      goalLabel: this.goalLabel(goals.goal),
      budget,
      eaten,
      remaining,
      isOverBudget: remaining < 0,
      usedPct: budget > 0 ? Math.min(100, Math.round((eaten / budget) * 100)) : 0,
    };
  }

  // ────── Caloric Intake Calendar ──────

  buildCalorieDays(summaries: DailySummary[]): CalorieDay[] {
    return summaries.map(s => {
      const ratio = s.targetCalories > 0 ? s.consumedCalories / s.targetCalories : 0;
      let intensity: CalorieDay['intensity'] = 0;
      if (s.consumedCalories > 0) {
        if (ratio > 1.1) intensity = 3;         // over
        else if (ratio >= 0.9) intensity = 2;    // on target
        else intensity = 1;                       // under
      }
      return {
        date: s.date,
        consumed: s.consumedCalories,
        target: s.targetCalories,
        intensity,
        dayOfWeek: new Date(s.date + 'T12:00:00').getDay(),
      };
    });
  }

  // ────── Full Goal Calculation ──────

  calculateFullGoals(input: {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: Sex;
    activityLevel: ActivityLevel;
    goal: FitnessGoal;
    rateOfChange: RateOfChange;
    macroPreference: MacroPreference;
  }): { bmr: number; tdee: number; dailyCalories: number; dailyProtein: number; dailyCarbs: number; dailyFat: number } {
    const bmr = this.calculateBMR(input.weightKg, input.heightCm, input.age, input.sex);
    const tdee = this.calculateTDEE(bmr, input.activityLevel);
    const dailyCalories = this.calculateCalorieTarget(tdee, input.goal, input.rateOfChange);
    const macros = this.calculateMacros(dailyCalories, input.macroPreference);

    return { bmr, tdee, dailyCalories, dailyProtein: macros.protein, dailyCarbs: macros.carbs, dailyFat: macros.fat };
  }

  // ────── Dynamic Macro Calculator ──────
  // When calories change, recalculate macros maintaining current ratios
  // When one macro changes, adjust others to maintain calorie total

  recalcMacrosFromCalories(
    newCalories: number,
    currentProtein: number,
    currentCarbs: number,
    currentFat: number,
  ): { protein: number; carbs: number; fat: number } {
    const currentCal = currentProtein * CAL_PER_GRAM.protein + currentCarbs * CAL_PER_GRAM.carbs + currentFat * CAL_PER_GRAM.fat;
    if (currentCal === 0) return this.calculateMacros(newCalories, 'balanced');

    const ratio = newCalories / currentCal;
    return {
      protein: Math.round(currentProtein * ratio),
      carbs: Math.round(currentCarbs * ratio),
      fat: Math.round(currentFat * ratio),
    };
  }

  recalcCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
    return Math.round(protein * CAL_PER_GRAM.protein + carbs * CAL_PER_GRAM.carbs + fat * CAL_PER_GRAM.fat);
  }

  adjustMacroKeepCalories(
    calories: number,
    changedField: 'protein' | 'carbs' | 'fat',
    newValue: number,
    currentProtein: number,
    currentCarbs: number,
    currentFat: number,
  ): { protein: number; carbs: number; fat: number } {
    const result = { protein: currentProtein, carbs: currentCarbs, fat: currentFat };
    result[changedField] = newValue;

    const usedCal = result[changedField] * CAL_PER_GRAM[changedField];
    const remainingCal = calories - usedCal;

    // Distribute remaining calories between the other two macros proportionally
    const others = (['protein', 'carbs', 'fat'] as const).filter(f => f !== changedField);
    const otherTotal = others.reduce((sum, f) => sum + result[f] * CAL_PER_GRAM[f], 0);

    if (otherTotal > 0) {
      for (const field of others) {
        const proportion = (result[field] * CAL_PER_GRAM[field]) / otherTotal;
        result[field] = Math.max(0, Math.round((remainingCal * proportion) / CAL_PER_GRAM[field]));
      }
    } else {
      // Equal split if others are zero
      for (const field of others) {
        result[field] = Math.max(0, Math.round(remainingCal / others.length / CAL_PER_GRAM[field]));
      }
    }

    return result;
  }

  // ────── Burn Estimates ──────

  estimateStepCalories(steps: number): number {
    return Math.round(steps * CAL_PER_STEP);
  }

  estimateWorkoutCalories(session: WorkoutSession): number {
    // Rough estimate: ~5 cal per completed set + duration-based estimate
    let completedSets = 0;
    for (const group of session.exerciseGroups ?? []) {
      for (const ex of group.exercises) {
        completedSets += ex.sets.filter(s => s.completed).length;
      }
    }

    const startTime = toDate(session.startedAt);
    const endTime = session.completedAt ? toDate(session.completedAt) : new Date();
    const durationMin = Math.max(1, (endTime.getTime() - startTime.getTime()) / 60000);

    // ~6 cal/min for moderate weight training + volume bonus
    return Math.round(durationMin * 6 + completedSets * 3);
  }

  // ────── Daily Summary Aggregation ──────

  buildDailySummary(
    date: string,
    userId: string,
    goals: GoalSettings,
    meals: Meal[],
    cardioEntries: CardioEntry[],
    steps: DailySteps | null,
    workoutSessions: WorkoutSession[],
    weightKg?: number,
  ): Omit<DailySummary, 'id' | 'createdAt' | 'updatedAt'> {
    const consumedCalories = meals.reduce((s, m) => s + m.totalCalories, 0);
    const consumedProtein = meals.reduce((s, m) => s + m.totalProtein, 0);
    const consumedCarbs = meals.reduce((s, m) => s + m.totalCarbs, 0);
    const consumedFat = meals.reduce((s, m) => s + m.totalFat, 0);

    const bmrEstimate = goals.bmr;
    const stepsCalories = steps ? this.estimateStepCalories(steps.steps) : 0;
    const workoutCalories = workoutSessions.reduce((s, ws) => s + this.estimateWorkoutCalories(ws), 0);
    const cardioCalories = cardioEntries.reduce((s, c) => s + c.caloriesBurned, 0);
    const totalCaloriesOut = bmrEstimate + stepsCalories + workoutCalories + cardioCalories;
    const netCalories = consumedCalories - totalCaloriesOut;

    return {
      userId,
      date,
      targetCalories: goals.dailyCalories,
      targetProtein: goals.dailyProtein,
      targetCarbs: goals.dailyCarbs,
      targetFat: goals.dailyFat,
      consumedCalories,
      consumedProtein,
      consumedCarbs,
      consumedFat,
      mealCount: meals.length,
      bmrEstimate,
      stepsCalories,
      workoutCalories,
      cardioCalories,
      totalCaloriesOut,
      netCalories,
      deficitOrSurplus: netCalories,
      estimatedTdee: goals.tdee,
      actualTdee: totalCaloriesOut,
      steps: steps?.steps ?? 0,
      ...(weightKg !== undefined ? { weightKg } : {}),
    };
  }

  // ────── Weekly Summary Aggregation ──────

  buildWeeklySummary(
    userId: string,
    weekStart: string,
    weekEnd: string,
    dailySummaries: DailySummary[],
    workoutsTarget: number,
  ): Omit<WeeklySummary, 'id' | 'createdAt' | 'updatedAt'> {
    const count = dailySummaries.length || 1;
    const avgCalorieIntake = Math.round(dailySummaries.reduce((s, d) => s + d.consumedCalories, 0) / count);
    const avgCaloriesBurned = Math.round(dailySummaries.reduce((s, d) => s + d.totalCaloriesOut, 0) / count);
    const avgNetBalance = Math.round(dailySummaries.reduce((s, d) => s + d.netCalories, 0) / count);
    const avgProtein = Math.round(dailySummaries.reduce((s, d) => s + d.consumedProtein, 0) / count);
    const avgSteps = Math.round(dailySummaries.reduce((s, d) => s + d.steps, 0) / count);

    const daysWithProteinMet = dailySummaries.filter(d => d.consumedProtein >= d.targetProtein * 0.9).length;
    const proteinAdherence = Math.round((daysWithProteinMet / count) * 100);

    const workoutsCompleted = dailySummaries.filter(d => d.workoutCalories > 0).length;
    const cardioSessions = dailySummaries.reduce((s, d) => s + (d.cardioCalories > 0 ? 1 : 0), 0);

    const weights = dailySummaries.filter(d => d.weightKg).map(d => d.weightKg!);

    // Extended energy trends
    const dailyIntakes = dailySummaries.map(d => d.consumedCalories);
    const dailyBudgets = dailySummaries.map(d => d.targetCalories);
    const cumulativeDeficitSurplus = dailySummaries.reduce((s, d) => s + (d.targetCalories - d.consumedCalories), 0);
    const daysOnTarget = dailySummaries.filter(d => {
      if (d.targetCalories === 0) return false;
      const ratio = d.consumedCalories / d.targetCalories;
      return ratio >= 0.9 && ratio <= 1.1;
    }).length;
    const adherenceScore = Math.round((daysOnTarget / count) * 100);
    const projectedWeeklyWeightChange = Math.round((cumulativeDeficitSurplus / 7700) * 100) / 100;

    return {
      userId,
      weekStart,
      weekEnd,
      avgCalorieIntake,
      avgCaloriesBurned,
      avgNetBalance,
      avgProtein,
      proteinAdherence,
      workoutsCompleted,
      workoutsTarget,
      avgSteps,
      cardioSessions,
      dailyIntakes,
      dailyBudgets,
      cumulativeDeficitSurplus,
      adherenceScore,
      projectedWeeklyWeightChange,
      ...(weights.length > 0 ? { startWeight: weights[0], endWeight: weights[weights.length - 1], weightChange: Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 } : {}),
    };
  }
}
