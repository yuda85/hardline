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

/** Convert any date-like value to YYYY-MM-DD string */
export function toDateString(value: unknown): string {
  return toDate(value).toISOString().split('T')[0];
}
