import { WorkoutSession, WorkoutPlan } from '../../core/models';

export interface WorkoutStateModel {
  activeSession: WorkoutSession | null;
  activePlan: WorkoutPlan | null;
  loading: boolean;
}

export const WORKOUT_STATE_DEFAULTS: WorkoutStateModel = {
  activeSession: null,
  activePlan: null,
  loading: false,
};
