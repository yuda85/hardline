import { MuscleGroup, WorkoutDay } from './workout.model';
import { FitnessGoal } from './energy.model';
import { RecoveryStatus } from '../services/insights.service';

// ── Builder Input (from UI form) ──

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentType =
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight';
export type TrainingStyle =
  | 'strength'
  | 'hypertrophy'
  | 'powerbuilding'
  | 'athletic'
  | 'endurance';
export type RepRangePreference = 'low' | 'medium' | 'high' | 'mixed';
export type SplitPreference =
  | 'auto'
  | 'ppl'
  | 'upper_lower'
  | 'full_body'
  | 'bro_split';

export interface BuilderConstraints {
  injuries?: string[];
  weakPoints?: MuscleGroup[];
  excludeExercises?: string[];
}

export interface WorkoutBuilderInput {
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  availableEquipment: EquipmentType[];
  daysPerWeek: number;
  minutesPerWorkout: number;
  trainingStyle: TrainingStyle;
  repRangePreference: RepRangePreference;
  splitPreference: SplitPreference;
  freeTextGoal?: string;
  constraints?: BuilderConstraints;
}

// ── Rule Engine Output ──

export interface MuscleGroupBudget {
  muscleGroup: MuscleGroup;
  minSets: number;
  maxSets: number;
  frequency: number;
}

export interface DaySkeleton {
  dayNumber: number;
  name: string;
  muscleGroups: MuscleGroup[];
  minExercises: number;
  maxExercises: number;
  maxSets: number;
}

export interface BuilderConfig {
  input: WorkoutBuilderInput;
  budgets: MuscleGroupBudget[];
  daySplitName: string;
  daySkeletons: DaySkeleton[];
  availableExerciseIds: string[];
}

// ── AI Response Shape ──

export interface AIExerciseSpec {
  exerciseId: string;
  sets: number[];
  notes?: string;
}

export interface AIGroupSpec {
  type: 'single' | 'superset';
  exercises: AIExerciseSpec[];
  restSeconds: number;
}

export interface AIDaySpec {
  dayNumber: number;
  name: string;
  exerciseGroups: AIGroupSpec[];
}

export interface AIBuilderResponse {
  planName: string;
  description: string;
  days: AIDaySpec[];
}

// ── Daily Workout Models ──

export interface WeeklyMuscleVolume {
  muscleGroup: MuscleGroup;
  setsCompleted: number;
  setsTarget: number;
  deficit: number;
}

export interface DailyWorkoutContext {
  recoveryStatuses: RecoveryStatus[];
  weeklyVolumes: WeeklyMuscleVolume[];
  trainableMuscles: MuscleGroup[];
  priorityMuscles: MuscleGroup[];
  fitnessGoal: FitnessGoal;
  availableMinutes: number;
  availableEquipment: EquipmentType[];
}

export interface DailyWorkoutResult {
  workout: WorkoutDay;
  reasoning: string;
  estimatedMinutes: number;
  musclesCovered: MuscleGroup[];
}

// ── Validation ──

export interface BuilderValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
  warnings: string[];
}
