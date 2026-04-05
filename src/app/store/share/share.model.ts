import { SharedPlan } from '../../core/models';

export interface ShareStateModel {
  previewPlan: SharedPlan | null;
  lastShareId: string | null;
  loading: boolean;
  error: string | null;
}

export const SHARE_STATE_DEFAULTS: ShareStateModel = {
  previewPlan: null,
  lastShareId: null,
  loading: false,
  error: null,
};
