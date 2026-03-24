import { UserProfile } from '../../core/models';

export interface AuthStateModel {
  user: UserProfile | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

export const AUTH_STATE_DEFAULTS: AuthStateModel = {
  user: null,
  initialized: false,
  loading: false,
  error: null,
};
