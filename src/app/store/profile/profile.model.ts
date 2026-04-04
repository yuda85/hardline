import { UserGoals, UserPreferences } from '../../core/models';

export interface ProfileStateModel {
  goals: UserGoals | null;
  preferences: UserPreferences | null;
  activePlanId: string | null;
  loading: boolean;
}

export const PROFILE_STATE_DEFAULTS: ProfileStateModel = {
  goals: null,
  preferences: null,
  activePlanId: null,
  loading: false,
};
