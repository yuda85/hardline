import { FirestoreDoc } from './common.model';

export type CardioActivityType = 'mtb' | 'emtb' | 'run' | 'hike';

export interface ActivityMeta {
  label: string;
  shortLabel: string;
  icon: string;
  /** MET (Metabolic Equivalent of Task) value used for calorie estimation. */
  met: number;
  primaryMetric: 'speed' | 'pace';
  /** Short tagline for the picker card. */
  tagline: string;
}

export const CARDIO_ACTIVITIES: Record<CardioActivityType, ActivityMeta> = {
  mtb: {
    label: 'Mountain Biking',
    shortLabel: 'MTB',
    icon: 'directions_bike',
    met: 8.5,
    primaryMetric: 'speed',
    tagline: 'Gravity • Trail',
  },
  emtb: {
    label: 'eMTB',
    shortLabel: 'eMTB',
    icon: 'electric_bike',
    met: 6.0,
    primaryMetric: 'speed',
    tagline: 'Electric Assist',
  },
  run: {
    label: 'Running',
    shortLabel: 'Run',
    icon: 'directions_run',
    met: 9.8,
    primaryMetric: 'pace',
    tagline: 'Pavement • Track',
  },
  hike: {
    label: 'Hiking',
    shortLabel: 'Hike',
    icon: 'hiking',
    met: 5.3,
    primaryMetric: 'speed',
    tagline: 'Backcountry',
  },
};

export const CARDIO_ACTIVITY_TYPES: CardioActivityType[] = ['mtb', 'emtb', 'run', 'hike'];

/** A single raw GPS point as recorded in the local IndexedDB buffer at ~1 Hz. */
export interface RawTrackPoint {
  /** Unix epoch ms. */
  t: number;
  lat: number;
  lng: number;
  /** Elevation in meters (null if unavailable). */
  ele: number | null;
  /** GPS horizontal accuracy in meters. */
  acc: number;
  /** Instantaneous speed in m/s from the Geolocation API (null if unavailable). */
  spd: number | null;
  /** Set to 1 if this point was captured during an auto-pause. */
  paused?: 1;
}

/** A downsampled telemetry sample (~every 5s) inlined into the Firestore doc. */
export interface TelemetrySample {
  /** Seconds elapsed from session start. */
  t: number;
  /** Cumulative distance in meters at this point. */
  d: number;
  ele: number | null;
  /** Instantaneous speed in m/s. */
  spd: number | null;
}

/** Recording-status state machine for the active session. */
export type CardioRecordingStatus = 'idle' | 'recording' | 'paused' | 'auto-paused' | 'finishing';

export interface CardioBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * One persisted cardio session — the Firestore document.
 * Stays under Firestore's 1MB-per-doc limit even for multi-hour rides
 * via polyline encoding + downsampled telemetry. The full 1Hz raw track
 * lives in Firebase Storage at `fullTrackPath`.
 */
export interface CardioSession extends FirestoreDoc {
  userId: string;
  activityType: CardioActivityType;
  /** Local YYYY-MM-DD on which the session ended. */
  date: string;
  startedAt: Date;
  endedAt: Date;

  // ── Aggregates ──
  /** Moving time in seconds (excludes auto-paused / manually-paused spans). */
  durationSec: number;
  /** Total elapsed time including paused spans. */
  totalDurationSec: number;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  /** Avg speed over moving time, m/s. */
  avgSpeedMs: number;
  maxSpeedMs: number;
  caloriesBurned: number;
  pointCount: number;
  autoPauseCount: number;

  // ── Geometry ──
  /** Google polyline-encoded lat/lng pairs, precision 5. */
  polyline: string;
  /** Google polyline-encoded elevation values, precision 1 (1m). */
  elevationPolyline: string;
  bounds: CardioBounds;

  // ── Charts data ──
  /** Downsampled samples for charts; usually every 5s. */
  telemetry: TelemetrySample[];
  telemetryIntervalSec: number;

  // ── Pointer to full raw track in Storage ──
  fullTrackPath: string | null;

  /** Optional cached SVG path for the hub list thumbnail. */
  thumbnailSvg?: string;
}

/** Live, in-memory running totals for the recording screen. */
export interface ActiveCardioSession {
  /** Local UUID, also drives the IndexedDB buffer key. */
  sessionLocalId: string;
  activityType: CardioActivityType;
  startedAt: number;
  movingTimeSec: number;
  totalTimeSec: number;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  currentSpeedMs: number | null;
  currentElevationM: number | null;
  lastPoint: { lat: number; lng: number } | null;
  currentAccuracyM: number | null;
  pointCount: number;
  autoPauseCount: number;
  lastAutoPauseAt: number | null;
}
