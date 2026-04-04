import { FirestoreDoc } from './common.model';
import { Sex, FitnessGoal, RateOfChange, ActivityLevel, MacroPreference } from './energy.model';

export interface UserProfile extends FirestoreDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  goals: UserGoals;
  preferences: UserPreferences;
  onboardingComplete: boolean;
  activePlanId?: string | null;
}

export interface UserGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  targetWeight: number | null;
  weeklyWorkouts: number;
  currentWeight: number;
  heightCm: number;
  age: number;
  sex: Sex;
  fitnessGoal: FitnessGoal;
  rateOfChange: RateOfChange;
  activityLevel: ActivityLevel;
  macroPreference: MacroPreference;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
  weighInReminderTime?: string; // HH:mm format, e.g. '07:00'
}

export const DEFAULT_USER_GOALS: UserGoals = {
  dailyCalories: 2000,
  dailyProtein: 150,
  dailyCarbs: 200,
  dailyFat: 70,
  targetWeight: null,
  weeklyWorkouts: 4,
  currentWeight: 80,
  heightCm: 175,
  age: 30,
  sex: 'male',
  fitnessGoal: 'maintenance',
  rateOfChange: 'moderate',
  activityLevel: 'moderate',
  macroPreference: 'balanced',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  units: 'metric',
};
