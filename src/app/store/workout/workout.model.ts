import { WorkoutSession, WorkoutPlan, PersonalRecord } from '../../core/models';
import { DailyWorkoutResult } from '../../core/models/ai-workout.model';

export interface LastSessionData {
  [exerciseId: string]: { weight: number; reps: number }[];
}

export interface ExerciseHistoryEntry {
  date: Date;
  dayName: string;
  sets: { weight: number; reps: number }[];
  best1RM: number;
}

export interface WorkoutStateModel {
  plans: WorkoutPlan[];
  activeSession: WorkoutSession | null;
  activePlan: WorkoutPlan | null;
  lastSessionData: LastSessionData;
  exerciseHistory: Record<string, ExerciseHistoryEntry[]>;
  prs: Record<string, PersonalRecord>;
  loading: boolean;
  generatedPlan: WorkoutPlan | null;
  dailyWorkout: DailyWorkoutResult | null;
  generating: boolean;
  generateError: string | null;
  savedPlanId: string | null;
}

export const WORKOUT_STATE_DEFAULTS: WorkoutStateModel = {
  plans: [],
  activeSession: null,
  activePlan: null,
  lastSessionData: {},
  exerciseHistory: {},
  prs: {},
  loading: false,
  generatedPlan: null,
  dailyWorkout: null,
  generating: false,
  generateError: null,
  savedPlanId: null,
};
