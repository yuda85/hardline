import { FirestoreDoc } from './common.model';

// ── Enums & Types ──

export type Sex = 'male' | 'female';
export type FitnessGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type RateOfChange = 'slow' | 'moderate' | 'aggressive';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MacroPreference = 'balanced' | 'high_protein' | 'low_carb' | 'custom';
export type MealSource = 'manual' | 'ai_text' | 'ai_image';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ── Goal Settings ──

export interface GoalSettings extends FirestoreDoc {
  userId: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  rateOfChange: RateOfChange;
  weeklyTrainingFrequency: number;
  dailyStepsTarget: number;
  activityLevel: ActivityLevel;
  macroPreference: MacroPreference;
  // Calculated values (stored for quick access)
  bmr: number;
  tdee: number;
  goalAdjustment?: number; // e.g. -500 for fat_loss/moderate, +300 for muscle_gain/moderate
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
}

// ── Energy Budget (computed view model) ──

export interface EnergyBudget {
  tdee: number;
  goalAdjustment: number;
  goalLabel: string;
  budget: number;          // dailyCalories (= tdee + goalAdjustment)
  eaten: number;
  remaining: number;       // budget - eaten
  isOverBudget: boolean;
  usedPct: number;         // 0-100
}

// ── Caloric Intake Calendar Day ──

export interface CalorieDay {
  date: string;
  consumed: number;
  target: number;
  /** 0 = no data, 1 = under, 2 = on target (within 10%), 3 = over */
  intensity: 0 | 1 | 2 | 3;
  dayOfWeek: number;
}

export const DEFAULT_GOAL_SETTINGS: Omit<GoalSettings, 'userId' | keyof FirestoreDoc> = {
  age: 30,
  sex: 'male',
  heightCm: 175,
  weightKg: 80,
  goal: 'maintenance',
  rateOfChange: 'moderate',
  weeklyTrainingFrequency: 4,
  dailyStepsTarget: 8000,
  activityLevel: 'moderate',
  macroPreference: 'balanced',
  bmr: 0,
  tdee: 0,
  goalAdjustment: 0,
  dailyCalories: 2000,
  dailyProtein: 150,
  dailyCarbs: 200,
  dailyFat: 67,
};

// ── Meals ──

export interface MealItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
}

export interface Meal extends FirestoreDoc {
  userId: string;
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
  timestamp: Date;
}

// ── Activity & Burn ──

export interface CardioEntry extends FirestoreDoc {
  userId: string;
  date: string;
  type: string;
  durationMinutes: number;
  distanceKm?: number;
  avgHeartRate?: number;
  caloriesBurned: number;
  timestamp: Date;
  /** Pointer to a GPS-tracked `cardio-sessions/{id}` doc, when applicable. */
  routeSessionId?: string;
  /** Elevation gain in meters, when the entry came from a GPS-tracked session. */
  elevationGainM?: number;
}

export const CARDIO_TYPES = [
  'Running',
  'Walking',
  'Cycling',
  'Swimming',
  'Rowing',
  'Elliptical',
  'Jump Rope',
  'HIIT',
  'Yoga',
  'Other',
] as const;

export interface DailySteps extends FirestoreDoc {
  userId: string;
  date: string;
  steps: number;
  caloriesBurned: number;
}

export interface WeightEntry extends FirestoreDoc {
  userId: string;
  date: string;
  weightKg: number;
  notes?: string;
}

// ── Daily Summary ──

export interface DailySummary extends FirestoreDoc {
  userId: string;
  date: string;
  // Targets
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  // Consumed
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  mealCount: number;
  // Burn
  bmrEstimate: number;
  stepsCalories: number;
  workoutCalories: number;
  cardioCalories: number;
  totalCaloriesOut: number;
  // Balance
  netCalories: number;
  deficitOrSurplus: number;
  // TDEE comparison
  estimatedTdee?: number;  // BMR * activity multiplier (from goal settings)
  actualTdee?: number;     // BMR + actual tracked activity (steps + workout + cardio)
  // Meta
  steps: number;
  weightKg?: number;
  aiInsight?: string;
}

// ── Weekly Summary ──

export interface WeeklySummary extends FirestoreDoc {
  userId: string;
  weekStart: string;
  weekEnd: string;
  avgCalorieIntake: number;
  avgCaloriesBurned: number;
  avgNetBalance: number;
  avgProtein: number;
  proteinAdherence: number;
  workoutsCompleted: number;
  workoutsTarget: number;
  avgSteps: number;
  cardioSessions: number;
  startWeight?: number;
  endWeight?: number;
  weightChange?: number;
  // Extended energy trends
  dailyIntakes?: number[];           // per-day consumed calories (Sun-Sat)
  dailyBudgets?: number[];           // per-day target calories (Sun-Sat)
  cumulativeDeficitSurplus?: number; // sum of (target - consumed) across all days
  adherenceScore?: number;           // % of days within +/- 10% of target
  projectedWeeklyWeightChange?: number; // cumulativeDeficitSurplus / 7700 (kg)
}
