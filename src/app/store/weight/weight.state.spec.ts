import { WeightState } from './weight.state';
import { computeGoalProgress } from './weight.state';
import { WeightStateModel, WEIGHT_STATE_DEFAULTS } from './weight.model';
import { WeightEntry } from '../../core/models/energy.model';

function makeEntry(date: string, weightKg: number, notes?: string): WeightEntry {
  return { id: `e-${date}`, userId: 'u1', date, weightKg, notes, createdAt: new Date(), updatedAt: new Date() } as WeightEntry;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('WeightState selectors', () => {
  describe('showPrompt', () => {
    it('returns true when no today entry, not dismissed, not loading', () => {
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, todayEntry: null, promptDismissed: false, loading: false };
      expect(WeightState.showPrompt(state)).toBe(true);
    });

    it('returns false when today entry exists', () => {
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, todayEntry: makeEntry(today(), 80), promptDismissed: false, loading: false };
      expect(WeightState.showPrompt(state)).toBe(false);
    });

    it('returns false when prompt is dismissed', () => {
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, todayEntry: null, promptDismissed: true, loading: false };
      expect(WeightState.showPrompt(state)).toBe(false);
    });

    it('returns false when loading', () => {
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, todayEntry: null, promptDismissed: false, loading: true };
      expect(WeightState.showPrompt(state)).toBe(false);
    });
  });

  describe('latestWeight', () => {
    it('returns null when no entries', () => {
      expect(WeightState.latestWeight({ ...WEIGHT_STATE_DEFAULTS })).toBeNull();
    });

    it('returns today entry weight if available', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        todayEntry: makeEntry(today(), 82.5),
        entries: [makeEntry(daysAgo(1), 83)],
      };
      expect(WeightState.latestWeight(state)).toBe(82.5);
    });

    it('returns first entry weight when no today entry', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        todayEntry: null,
        entries: [makeEntry(daysAgo(1), 83)],
      };
      expect(WeightState.latestWeight(state)).toBe(83);
    });
  });

  describe('currentStreak', () => {
    it('returns 0 for empty entries', () => {
      expect(WeightState.currentStreak({ ...WEIGHT_STATE_DEFAULTS })).toBe(0);
    });

    it('returns 1 when only today has entry', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [makeEntry(today(), 80)],
      };
      expect(WeightState.currentStreak(state)).toBe(1);
    });

    it('counts consecutive days', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [
          makeEntry(today(), 80),
          makeEntry(daysAgo(1), 80.5),
          makeEntry(daysAgo(2), 81),
        ],
      };
      expect(WeightState.currentStreak(state)).toBe(3);
    });

    it('stops at gap', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [
          makeEntry(today(), 80),
          makeEntry(daysAgo(1), 80.5),
          // gap at daysAgo(2)
          makeEntry(daysAgo(3), 81),
        ],
      };
      expect(WeightState.currentStreak(state)).toBe(2);
    });

    it('returns 0 when today has no entry', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [makeEntry(daysAgo(1), 80)],
      };
      expect(WeightState.currentStreak(state)).toBe(0);
    });
  });

  describe('visibleEntries', () => {
    it('filters entries to 7-day range and sorts ascending', () => {
      const entries = [
        makeEntry(daysAgo(10), 85),
        makeEntry(daysAgo(5), 83),
        makeEntry(daysAgo(2), 82),
        makeEntry(today(), 81),
      ];
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, entries, viewRange: '7d' };
      const visible = WeightState.visibleEntries(state);
      expect(visible.length).toBe(3); // excludes 10 days ago
      expect(visible[0].date).toBe(daysAgo(5));
      expect(visible[2].date).toBe(today());
    });

    it('includes all entries for 90d range', () => {
      const entries = [
        makeEntry(daysAgo(60), 85),
        makeEntry(daysAgo(30), 83),
        makeEntry(today(), 81),
      ];
      const state: WeightStateModel = { ...WEIGHT_STATE_DEFAULTS, entries, viewRange: '90d' };
      expect(WeightState.visibleEntries(state).length).toBe(3);
    });
  });

  describe('movingAverage7', () => {
    it('returns empty for fewer than 2 entries', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [makeEntry(today(), 80)],
      };
      expect(WeightState.movingAverage7(state)).toEqual([]);
    });

    it('calculates rolling average', () => {
      const state: WeightStateModel = {
        ...WEIGHT_STATE_DEFAULTS,
        entries: [
          makeEntry(daysAgo(2), 80),
          makeEntry(daysAgo(1), 82),
          makeEntry(today(), 84),
        ],
      };
      const result = WeightState.movingAverage7(state);
      expect(result.length).toBe(3);
      expect(result[0].avg).toBe(80);
      expect(result[1].avg).toBe(81);
      expect(result[2].avg).toBe(82);
    });
  });
});

describe('computeGoalProgress', () => {
  it('returns null when targetWeight is null', () => {
    expect(computeGoalProgress(80, 85, null)).toBeNull();
  });

  it('calculates weight loss progress correctly', () => {
    // start=90, current=80, target=70 => total=20, achieved=10 => 50%
    const result = computeGoalProgress(80, 90, 70);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('loss');
    expect(result!.progressPct).toBe(50);
    expect(result!.remainingKg).toBe(10);
  });

  it('calculates weight gain progress correctly', () => {
    const result = computeGoalProgress(75, 70, 80);
    expect(result).not.toBeNull();
    expect(result!.direction).toBe('gain');
    expect(result!.progressPct).toBe(50); // gained 5 of 10 = 50%
    expect(result!.remainingKg).toBe(5);
  });

  it('returns 100% when target reached', () => {
    const result = computeGoalProgress(70, 85, 70);
    expect(result).not.toBeNull();
    expect(result!.progressPct).toBe(100);
    expect(result!.remainingKg).toBe(0);
  });

  it('caps at 100% when overshooting goal', () => {
    const result = computeGoalProgress(68, 85, 70);
    expect(result).not.toBeNull();
    expect(result!.progressPct).toBe(100);
  });

  it('returns 0% when going wrong direction', () => {
    const result = computeGoalProgress(92, 90, 70);
    expect(result).not.toBeNull();
    expect(result!.progressPct).toBe(0);
  });
});
