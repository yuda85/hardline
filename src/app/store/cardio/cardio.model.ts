import {
  ActiveCardioSession,
  CardioRecordingStatus,
  CardioSession,
} from '../../core/models/cardio-session.model';

export interface CardioStateModel {
  recordingStatus: CardioRecordingStatus;
  activeSession: ActiveCardioSession | null;
  weakSignal: boolean;
  sessions: CardioSession[];
  selectedSession: CardioSession | null;
  sessionsLoading: boolean;
  uploadProgress: number | null;
  error: string | null;
}

export const CARDIO_STATE_DEFAULTS: CardioStateModel = {
  recordingStatus: 'idle',
  activeSession: null,
  weakSignal: false,
  sessions: [],
  selectedSession: null,
  sessionsLoading: false,
  uploadProgress: null,
  error: null,
};
