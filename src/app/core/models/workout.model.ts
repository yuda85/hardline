import { FirestoreDoc } from './common.model';

// ── Exercise Library ──

export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  Shoulders = 'shoulders',
  UpperLegs = 'upper_legs',
  Hamstrings = 'hamstrings',
  Glutes = 'glutes',
  LowerLegs = 'lower_legs',
  Biceps = 'biceps',
  Triceps = 'triceps',
  Core = 'core',
  FullBody = 'full_body',
}

export interface Exercise extends FirestoreDoc {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  tags: string[];
  instructions?: string;
  imageUrl?: string;
}

// ── Plan Structure: Plan → Days → ExerciseGroups → Exercises → Sets ──

export type ExerciseGroupType = 'single' | 'superset' | 'circuit';

export interface PlanSet {
  targetReps: number;
}

export interface PlanExercise {
  exerciseId: string;
  exerciseName: string;
  sets: PlanSet[];
  notes?: string;
}

export interface ExerciseGroup {
  type: ExerciseGroupType;
  exercises: PlanExercise[];
  restSeconds: number;
}

export interface WorkoutDay {
  dayNumber: number;
  name: string;
  exerciseGroups: ExerciseGroup[];
}

export interface WorkoutPlan extends FirestoreDoc {
  userId: string;
  name: string;
  description?: string;
  days: WorkoutDay[];
}

// ── Session Structure (mirrors plan but with actual logged data) ──

export interface SessionSet {
  targetReps: number;
  actualReps: number;
  weight: number;
  completed: boolean;
  completedAt?: Date;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSet[];
}

export interface SessionExerciseGroup {
  type: ExerciseGroupType;
  exercises: SessionExercise[];
  restSeconds: number;
}

export interface WorkoutSession extends FirestoreDoc {
  userId: string;
  planId: string;
  dayNumber: number;
  startedAt: Date;
  completedAt?: Date;
  exerciseGroups: SessionExerciseGroup[];
}

// ── Personal Records ──

export interface PersonalRecord extends FirestoreDoc {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  oneRepMax: number;
  weight: number;
  reps: number;
  date: Date;
}

// ── Shared Plans ──

export interface SharedPlanSnapshot {
  name: string;
  description?: string;
  days: WorkoutDay[];
}

export interface SharedPlan extends FirestoreDoc {
  shareId: string;
  planId: string;
  sharedByUserId: string;
  sharedByName: string;
  expiresAt: Date;
  planSnapshot: SharedPlanSnapshot;
}
