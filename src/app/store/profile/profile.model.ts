import { UserGoals, UserPreferences } from '../../core/models';

export interface ProfileStateModel {
  goals: UserGoals | null;
  preferences: UserPreferences | null;
  loading: boolean;
}

export const PROFILE_STATE_DEFAULTS: ProfileStateModel = {
  goals: null,
  preferences: null,
  loading: false,
};
