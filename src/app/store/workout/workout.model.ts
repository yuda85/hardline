import { WorkoutSession, WorkoutPlan, PersonalRecord } from '../../core/models';

export interface LastSessionData {
  [exerciseId: string]: { weight: number; reps: number }[];
}

export interface WorkoutStateModel {
  plans: WorkoutPlan[];
  activeSession: WorkoutSession | null;
  activePlan: WorkoutPlan | null;
  lastSessionData: LastSessionData;
  prs: Record<string, PersonalRecord>;
  loading: boolean;
}

export const WORKOUT_STATE_DEFAULTS: WorkoutStateModel = {
  plans: [],
  activeSession: null,
  activePlan: null,
  lastSessionData: {},
  prs: {},
  loading: false,
};
