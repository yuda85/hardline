import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { SessionRepository } from '../../data/repositories/session.repository';
import { PRRepository } from '../../data/repositories/pr.repository';
import { WeightRepository } from '../../data/repositories/weight.repository';
import { AuthState } from '../../store/auth/auth.state';
import { ProfileState } from '../../store/profile/profile.state';
import { OneRepMaxService } from './one-rep-max.service';
import { toDate, toDateString } from './date.util';
import { MuscleGroup, WorkoutSession } from '../models/workout.model';
import { FitnessGoal } from '../models/energy.model';
import { EXERCISES } from '../../features/workout/exercise-data';

// ── Interfaces ──

export interface RecoveryStatus {
  group: MuscleGroup;
  label: string;
  lastTrained: Date | null;
  hoursAgo: number | null;
  status: 'recovering' | 'sore' | 'ready' | 'undertrained';
}

export interface PRBoardEntry {
  exerciseId: string;
  exerciseName: string;
  oneRepMax: number;
  weight: number;
  reps: number;
  date: Date;
  history: number[];
  isRecent: boolean;
}

export interface WeeklyVolume {
  weekLabel: string;
  volume: number;
  isCurrent: boolean;
}

export interface HeatmapDay {
  date: string;
  dayOfWeek: number;
  volume: number;
  intensity: 0 | 1 | 2 | 3;
}

export interface WeightMomentum {
  ratePerWeek: number;
  label: string;
  status: 'positive' | 'neutral' | 'negative';
  weeklyAverages: number[];
}

// ── Exercise ID → muscle group lookup (authoritative source) ──

const EXERCISE_MUSCLE_MAP = new Map<string, MuscleGroup>(
  EXERCISES.filter(e => e.id).map(e => [e.id!, e.muscleGroup]),
);

// ── Keyword fallback for custom exercises not in the library ──
// Order matters: groups with specific multi-word keywords first to avoid substring collisions.
// Within each group, longer keywords are listed first.

const MUSCLE_KEYWORD_FALLBACK: [MuscleGroup, string[]][] = [
  [MuscleGroup.UpperLegs, ['leg extension', 'leg press', 'leg curl', 'hip thrust', 'split squat', 'back squat', 'front squat', 'hack squat', 'goblet squat', 'hamstring', 'glute', 'squat', 'lunge']],
  [MuscleGroup.LowerLegs, ['calf raise', 'tibialis', 'calf']],
  [MuscleGroup.Chest, ['chest press', 'push-up', 'pushup', 'bench', 'fly', 'pec']],
  [MuscleGroup.Shoulders, ['overhead press', 'military press', 'lateral raise', 'shoulder', 'delt', 'ohp']],
  [MuscleGroup.Back, ['pull-up', 'pullup', 'pulldown', 'lat', 'row', 'back']],
  [MuscleGroup.Triceps, ['skull crusher', 'tricep', 'pushdown', 'dip']],
  [MuscleGroup.Biceps, ['preacher', 'bicep', 'hammer', 'curl']],
  [MuscleGroup.Core, ['cable twist', 'sit-up', 'situp', 'oblique', 'plank', 'crunch', 'ab']],
  [MuscleGroup.FullBody, ['deadlift', 'thruster', 'clean', 'snatch']],
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  [MuscleGroup.Chest]: 'Chest',
  [MuscleGroup.Back]: 'Back',
  [MuscleGroup.Shoulders]: 'Shoulders',
  [MuscleGroup.UpperLegs]: 'Upper Legs',
  [MuscleGroup.LowerLegs]: 'Lower Legs',
  [MuscleGroup.Biceps]: 'Biceps',
  [MuscleGroup.Triceps]: 'Triceps',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.FullBody]: 'Full Body',
};

// Compound lifts for PR board (name patterns)
const COMPOUND_PATTERNS = [
  'bench press', 'squat', 'deadlift', 'overhead press', 'military press',
  'barbell row', 'bent over row', 'pull-up', 'pullup', 'chin-up', 'chinup',
];

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly sessionRepo = inject(SessionRepository);
  private readonly prRepo = inject(PRRepository);
  private readonly weightRepo = inject(WeightRepository);
  private readonly oneRM = inject(OneRepMaxService);
  private readonly store = inject(Store);

  private get uid(): string | null {
    return this.store.selectSnapshot(AuthState.uid);
  }

  // ── Recovery Map ──

  getRecoveryStatus(): Observable<RecoveryStatus[]> {
    const uid = this.uid;
    if (!uid) return of([]);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.sessionRepo.getByDateRange(uid, sevenDaysAgo, now).pipe(
      map(allSessions => {
        const sessions = allSessions.filter(s => s.completedAt != null);
        const lastTrained = new Map<MuscleGroup, Date>();

        for (const session of sessions) {
          for (const group of session.exerciseGroups ?? []) {
            for (const ex of group.exercises) {
              const muscleGroup = EXERCISE_MUSCLE_MAP.get(ex.exerciseId) ?? this.guessMusceGroup(ex.exerciseName);
              const completedSets = ex.sets.filter(s => s.completed);
              if (completedSets.length === 0) continue;

              const lastSet = completedSets[completedSets.length - 1];
              const setDate = lastSet.completedAt ? toDate(lastSet.completedAt) : toDate(session.startedAt);

              const current = lastTrained.get(muscleGroup);
              if (!current || setDate > current) {
                lastTrained.set(muscleGroup, setDate);
              }

              // Deadlift hits both back and legs
              if (muscleGroup === MuscleGroup.FullBody) {
                for (const mg of [MuscleGroup.Back, MuscleGroup.UpperLegs]) {
                  const c = lastTrained.get(mg);
                  if (!c || setDate > c) lastTrained.set(mg, setDate);
                }
              }
            }
          }
        }

        const groups = [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.UpperLegs, MuscleGroup.LowerLegs, MuscleGroup.Biceps, MuscleGroup.Triceps, MuscleGroup.Core];
        return groups.map(group => {
          const date = lastTrained.get(group) ?? null;
          const hoursAgo = date ? (now.getTime() - date.getTime()) / (1000 * 60 * 60) : null;

          let status: RecoveryStatus['status'];
          if (hoursAgo === null || hoursAgo > 120) status = 'undertrained';
          else if (hoursAgo < 24) status = 'recovering';
          else if (hoursAgo < 48) status = 'sore';
          else status = 'ready';

          return { group, label: MUSCLE_LABELS[group], lastTrained: date, hoursAgo, status };
        });
      }),
    );
  }

  // ── PR Board ──

  getPRBoard(): Observable<PRBoardEntry[]> {
    const uid = this.uid;
    if (!uid) return of([]);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.prRepo.getAllForUser(uid).pipe(
      map(prs => {
        // Deduplicate: keep best PR per exercise
        const bestByExercise = new Map<string, typeof prs[0]>();
        for (const pr of prs) {
          const existing = bestByExercise.get(pr.exerciseId);
          if (!existing || pr.oneRepMax > existing.oneRepMax) {
            bestByExercise.set(pr.exerciseId, pr);
          }
        }

        // Filter to compound lifts
        const compounds = [...bestByExercise.values()].filter(pr =>
          COMPOUND_PATTERNS.some(p => pr.exerciseName.toLowerCase().includes(p)),
        );

        // Build history (all PRs for this exercise over time)
        return compounds.map(pr => {
          const history = prs
            .filter(p => p.exerciseId === pr.exerciseId)
            .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
            .map(p => p.oneRepMax);

          const prDate = toDate(pr.date);
          return {
            exerciseId: pr.exerciseId,
            exerciseName: pr.exerciseName,
            oneRepMax: pr.oneRepMax,
            weight: pr.weight,
            reps: pr.reps,
            date: prDate,
            history: history.length > 0 ? history : [pr.oneRepMax],
            isRecent: prDate >= sevenDaysAgo,
          };
        }).sort((a, b) => b.oneRepMax - a.oneRepMax);
      }),
    );
  }

  // ── Weekly Volume ──

  getWeeklyVolume(weeks: number = 8): Observable<WeeklyVolume[]> {
    const uid = this.uid;
    if (!uid) return of([]);

    const now = new Date();
    const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

    return this.sessionRepo.getByDateRange(uid, startDate, now).pipe(
      map(allSessions => {
        const sessions = allSessions.filter(s => s.completedAt != null);
        const weekMap = new Map<string, number>();

        for (const session of sessions) {
          const sessionDate = toDate(session.startedAt);
          const weekStart = this.getWeekStart(sessionDate);
          const key = toDateString(weekStart);

          let volume = weekMap.get(key) ?? 0;
          for (const group of session.exerciseGroups ?? []) {
            for (const ex of group.exercises) {
              for (const set of ex.sets) {
                if (set.completed && set.weight > 0 && set.actualReps > 0) {
                  volume += set.weight * set.actualReps;
                }
              }
            }
          }
          weekMap.set(key, volume);
        }

        const currentWeekKey = toDateString(this.getWeekStart(now));
        const result: WeeklyVolume[] = [];

        // Generate all week slots
        for (let i = weeks - 1; i >= 0; i--) {
          const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const key = toDateString(this.getWeekStart(weekDate));
          if (!result.find(r => r.weekLabel === key)) {
            result.push({
              weekLabel: key,
              volume: weekMap.get(key) ?? 0,
              isCurrent: key === currentWeekKey,
            });
          }
        }

        return result;
      }),
    );
  }

  // ── Training Heatmap ──

  getTrainingHeatmap(days: number = 90): Observable<HeatmapDay[]> {
    const uid = this.uid;
    if (!uid) return of([]);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return this.sessionRepo.getByDateRange(uid, startDate, now).pipe(
      map(allSessions => {
        const sessions = allSessions.filter(s => s.completedAt != null);
        // Aggregate volume per day
        const dayVolume = new Map<string, number>();
        for (const session of sessions) {
          const dateStr = toDateString(session.startedAt);
          let vol = dayVolume.get(dateStr) ?? 0;
          for (const group of session.exerciseGroups ?? []) {
            for (const ex of group.exercises) {
              for (const set of ex.sets) {
                if (set.completed && set.weight > 0) {
                  vol += set.weight * set.actualReps;
                }
              }
            }
          }
          dayVolume.set(dateStr, vol);
        }

        // Find max volume for intensity scaling
        const volumes = [...dayVolume.values()];
        const maxVol = Math.max(...volumes, 1);

        // Generate all days
        const result: HeatmapDay[] = [];
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = toDateString(d);
          const volume = dayVolume.get(dateStr) ?? 0;
          const ratio = volume / maxVol;

          let intensity: 0 | 1 | 2 | 3 = 0;
          if (ratio > 0.66) intensity = 3;
          else if (ratio > 0.33) intensity = 2;
          else if (ratio > 0) intensity = 1;

          result.push({
            date: dateStr,
            dayOfWeek: d.getDay(), // 0=Sun, 1=Mon, ...
            volume,
            intensity,
          });
        }

        return result;
      }),
    );
  }

  // ── Weight Momentum ──

  getWeightMomentum(): Observable<WeightMomentum | null> {
    const uid = this.uid;
    if (!uid) return of(null);

    const now = new Date();
    const fourWeeksAgo = toDateString(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000));
    const today = toDateString(now);

    const goals = this.store.selectSnapshot(ProfileState.goals);
    const fitnessGoal: FitnessGoal = goals?.fitnessGoal ?? 'maintenance';

    return this.weightRepo.getByDateRange(uid, fourWeeksAgo, today).pipe(
      map(entries => {
        if (entries.length < 2) return null;

        // Compute weekly averages
        const weekBuckets = new Map<number, number[]>();
        for (const entry of entries) {
          const d = new Date(entry.date);
          const weekNum = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const bucket = weekBuckets.get(weekNum) ?? [];
          bucket.push(entry.weightKg);
          weekBuckets.set(weekNum, bucket);
        }

        const weeklyAverages: number[] = [];
        for (let w = 3; w >= 0; w--) {
          const bucket = weekBuckets.get(w);
          if (bucket && bucket.length > 0) {
            weeklyAverages.push(Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length * 10) / 10);
          }
        }

        if (weeklyAverages.length < 2) return null;

        const first = weeklyAverages[0];
        const last = weeklyAverages[weeklyAverages.length - 1];
        const totalChange = last - first;
        const ratePerWeek = Math.round(totalChange / weeklyAverages.length * 10) / 10;

        const { label, status } = this.getMomentumLabel(ratePerWeek, fitnessGoal);

        return { ratePerWeek, label, status, weeklyAverages };
      }),
    );
  }

  // ── Helpers ──

  private guessMusceGroup(exerciseName: string): MuscleGroup {
    const lower = exerciseName.toLowerCase();
    for (const [group, keywords] of MUSCLE_KEYWORD_FALLBACK) {
      if (keywords.some(kw => lower.includes(kw))) {
        return group;
      }
    }
    return MuscleGroup.FullBody;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private getMomentumLabel(rate: number, goal: FitnessGoal): { label: string; status: 'positive' | 'neutral' | 'negative' } {
    const losing = rate < -0.1;
    const gaining = rate > 0.1;
    const steady = !losing && !gaining;

    if (goal === 'fat_loss') {
      if (losing) return { label: 'On track for your cut', status: 'positive' };
      if (steady) return { label: 'Weight loss has stalled', status: 'neutral' };
      return { label: 'Gaining — check your intake', status: 'negative' };
    }
    if (goal === 'muscle_gain') {
      if (gaining) return { label: 'Gaining at a good pace', status: 'positive' };
      if (steady) return { label: 'Not gaining — eat more', status: 'negative' };
      return { label: 'Losing weight — increase calories', status: 'negative' };
    }
    // maintenance
    if (steady) return { label: 'Holding steady', status: 'positive' };
    if (gaining) return { label: 'Drifting up', status: 'neutral' };
    return { label: 'Drifting down', status: 'neutral' };
  }
}
