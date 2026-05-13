import { CardioActivityType, CARDIO_ACTIVITIES } from '../../../core/models/cardio-session.model';

/**
 * MET-based calorie estimate.
 * Formula: kcal = MET × weightKg × hours.
 * MET values come from {@link CARDIO_ACTIVITIES}.
 *
 * Falls back to a 75kg reference body if weight is unknown.
 */
export function estimateCalories(
  activityType: CardioActivityType,
  movingTimeSec: number,
  weightKg: number | null | undefined,
): number {
  const meta = CARDIO_ACTIVITIES[activityType];
  const hours = movingTimeSec / 3600;
  const weight = weightKg && weightKg > 0 ? weightKg : 75;
  return Math.round(meta.met * weight * hours);
}

/** Format seconds as HH:MM:SS or MM:SS. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hh > 0) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}

/** Format meters per second as km/h with one decimal. */
export function formatSpeedKmh(speedMs: number | null | undefined): string {
  if (speedMs === null || speedMs === undefined || isNaN(speedMs)) return '—';
  return (speedMs * 3.6).toFixed(1);
}

/** Format meters per second as pace (min/km) like "5:42". Returns "—" if invalid. */
export function formatPace(speedMs: number | null | undefined): string {
  if (!speedMs || speedMs <= 0 || isNaN(speedMs)) return '—';
  const secPerKm = 1000 / speedMs;
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Format meters as km with one decimal. */
export function formatDistanceKm(distanceM: number): string {
  return (distanceM / 1000).toFixed(2);
}
