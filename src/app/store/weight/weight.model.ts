import { WeightEntry } from '../../core/models/energy.model';

export type ViewRange = '7d' | '30d' | '90d';

export interface WeightStateModel {
  entries: WeightEntry[];
  todayEntry: WeightEntry | null;
  loading: boolean;
  promptDismissed: boolean;
  viewRange: ViewRange;
}

export const WEIGHT_STATE_DEFAULTS: WeightStateModel = {
  entries: [],
  todayEntry: null,
  loading: false,
  promptDismissed: false,
  viewRange: '7d',
};
