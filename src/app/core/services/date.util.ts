/** Convert any date-like value (JS Date, Firestore Timestamp, string, object with seconds) to a JS Date */
export function toDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  // Firestore Timestamp has seconds and nanoseconds
  if (typeof value === 'object' && 'seconds' in (value as Record<string, unknown>)) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  // Firestore Timestamp with toDate()
  if (typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

/** Convert any date-like value to YYYY-MM-DD string in local timezone */
export function toDateString(value: unknown): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Inclusive week range covering `date`. `startDay` is 0=Sunday, 1=Monday, etc.
 * Returns `{ start, end }` as YYYY-MM-DD strings (start = startDay, end = startDay + 6).
 */
export function getWeekRange(date: Date, startDay: 0 | 1 = 0): { start: string; end: string } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() - startDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

/** Day-of-week label for a date string in local time. 0=Sunday. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
}
