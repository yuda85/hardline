import { FirestoreDoc } from './common.model';

export interface UserProfile extends FirestoreDoc {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  goals: UserGoals;
  preferences: UserPreferences;
}

export interface UserGoals {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  targetWeight: number | null;
  weeklyWorkouts: number;
}

export interface UserPreferences {
  units: 'metric' | 'imperial';
}

export const DEFAULT_USER_GOALS: UserGoals = {
  dailyCalories: 2000,
  dailyProtein: 150,
  dailyCarbs: 200,
  dailyFat: 70,
  targetWeight: null,
  weeklyWorkouts: 4,
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  units: 'metric',
};
