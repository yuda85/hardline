import { FirestoreDoc } from './common.model';

export type MealSource = 'manual' | 'ai_text' | 'ai_image';

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
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  source: MealSource;
  confidence: number;
  timestamp: Date;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
}
