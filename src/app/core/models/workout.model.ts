import { FirestoreDoc } from './common.model';

export enum MuscleGroup {
  Chest = 'chest',
  Back = 'back',
  Shoulders = 'shoulders',
  Legs = 'legs',
  Arms = 'arms',
  Core = 'core',
  FullBody = 'full_body',
}

export interface Exercise extends FirestoreDoc {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  instructions?: string;
  imageUrl?: string;
}

export interface WorkoutPlanExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  restSeconds: number;
  order: number;
}

export interface WorkoutPlan extends FirestoreDoc {
  userId: string;
  name: string;
  exercises: WorkoutPlanExercise[];
  estimatedDuration: number;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
  completedAt?: Date;
}

export interface WorkoutSessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession extends FirestoreDoc {
  userId: string;
  planId: string;
  startedAt: Date;
  completedAt?: Date;
  exercises: WorkoutSessionExercise[];
}
