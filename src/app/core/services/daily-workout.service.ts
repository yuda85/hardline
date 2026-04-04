import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import {
  MuscleGroup,
  WorkoutDay,
  WorkoutPlan,
} from '../models/workout.model';
import {
  EquipmentType,
  DailyWorkoutContext,
  DailyWorkoutResult,
  WeeklyMuscleVolume,
  AIDaySpec,
} from '../models/ai-workout.model';
import { FitnessGoal } from '../models/energy.model';
import { InsightsService, RecoveryStatus } from './insights.service';
import { SessionRepository } from '../../data/repositories/session.repository';
import { AIService } from './ai.service';
import { AuthState } from '../../store/auth/auth.state';
import { ProfileState } from '../../store/profile/profile.state';
import { RECOMMENDED_RANGES } from './volume-analysis.service';
import { EXERCISES } from '../../features/workout/exercise-data';
import { toDateString } from './date.util';

// ── Muscle group keyword mapping (reuse from insights) ──

const MUSCLE_KEYWORDS: Record<MuscleGroup, string[]> = {
  [MuscleGroup.Chest]: ['bench', 'fly', 'push-up', 'pushup', 'chest press', 'pec'],
  [MuscleGroup.Back]: ['row', 'pull-up', 'pullup', 'pulldown', 'lat', 'back'],
  [MuscleGroup.Shoulders]: ['overhead press', 'ohp', 'lateral raise', 'shoulder', 'delt', 'military press'],
  [MuscleGroup.Legs]: ['squat', 'leg press', 'lunge', 'calf', 'leg curl', 'leg extension', 'hamstring', 'glute', 'hip thrust'],
  [MuscleGroup.Arms]: ['curl', 'tricep', 'extension', 'hammer', 'dip', 'bicep', 'preacher'],
  [MuscleGroup.Core]: ['plank', 'crunch', 'ab', 'sit-up', 'situp', 'oblique', 'cable twist'],
  [MuscleGroup.FullBody]: ['deadlift', 'clean', 'snatch', 'thruster'],
};

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  [MuscleGroup.Chest]: 'Chest',
  [MuscleGroup.Back]: 'Back',
  [MuscleGroup.Shoulders]: 'Shoulders',
  [MuscleGroup.Legs]: 'Legs',
  [MuscleGroup.Arms]: 'Arms',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.FullBody]: 'Full Body',
};

// ── Prompt ──

const DAILY_SYSTEM_PROMPT = `You are a certified strength & conditioning coach. Design a single workout for today based on recovery status and training gaps.

RULES:
- Return ONLY valid JSON, no markdown, no explanation
- ONLY use exercise IDs from the provided list
- NEVER include exercises for muscles marked as "recovering" or "sore"
- PRIORITIZE muscles marked as "priority" (undertrained this week)
- Include 4-8 exercises depending on available time
- For time < 45min: prefer supersets to save time
- Rep ranges: strength 3-6, hypertrophy 8-12, endurance 12-20
- Rest seconds: compound 90-180, isolation 60-90, supersets 60
- Start with compound movements, end with isolation

Return this exact JSON structure:
{
  "dayNumber": 1,
  "name": "Smart Workout - YYYY-MM-DD",
  "exerciseGroups": [
    {
      "type": "single" | "superset",
      "exercises": [
        { "exerciseId": "ex-1", "sets": [8, 8, 6], "notes": "optional" }
      ],
      "restSeconds": 90
    }
  ],
  "reasoning": "Brief explanation of exercise choices"
}`;

@Injectable({ providedIn: 'root' })
export class DailyWorkoutService {
  private readonly insightsService = inject(InsightsService);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly aiService = inject(AIService);
  private readonly store = inject(Store);

  /**
   * Gather context: recovery + weekly volume analysis.
   */
  gatherContext(
    availableMinutes: number,
    availableEquipment: EquipmentType[],
  ): Observable<DailyWorkoutContext> {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) {
      return new Observable(subscriber => {
        subscriber.error(new Error('Not authenticated'));
      });
    }

    const goals = this.store.selectSnapshot(ProfileState.goals);
    const fitnessGoal: FitnessGoal = goals?.fitnessGoal ?? 'maintenance';

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return combineLatest([
      this.insightsService.getRecoveryStatus(),
      this.sessionRepo.getByDateRange(uid, sevenDaysAgo, now),
    ]).pipe(
      take(1),
      map(([recoveryStatuses, sessions]) => {
        // Compute weekly volume from sessions
        const weeklyVolumes = this.computeWeeklyVolumes(sessions);

        // Determine trainable muscles (ready or undertrained)
        const trainableMuscles = recoveryStatuses
          .filter(r => r.status === 'ready' || r.status === 'undertrained')
          .map(r => r.group);

        // Priority muscles: trainable AND have a volume deficit
        const volumeDeficits = new Map(
          weeklyVolumes
            .filter(v => v.deficit > 0)
            .map(v => [v.muscleGroup, v.deficit]),
        );
        const priorityMuscles = trainableMuscles
          .filter(mg => volumeDeficits.has(mg))
          .sort(
            (a, b) => (volumeDeficits.get(b) ?? 0) - (volumeDeficits.get(a) ?? 0),
          );

        return {
          recoveryStatuses,
          weeklyVolumes,
          trainableMuscles,
          priorityMuscles,
          fitnessGoal,
          availableMinutes,
          availableEquipment,
        };
      }),
    );
  }

  /**
   * AI generates today's workout within gathered constraints.
   */
  async generateDailyWorkout(
    context: DailyWorkoutContext,
  ): Promise<DailyWorkoutResult> {
    const userMessage = this.buildUserMessage(context);
    const aiDay = await this.aiService.generateDailyWorkout(
      DAILY_SYSTEM_PROMPT,
      userMessage,
    );

    // Validate: no exercises for recovering/sore muscles
    const soreGroups = new Set(
      context.recoveryStatuses
        .filter(r => r.status === 'recovering' || r.status === 'sore')
        .map(r => r.group),
    );
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    const filteredGroups = aiDay.exerciseGroups.filter(g => {
      return g.exercises.every(e => {
        const ex = exerciseMap.get(e.exerciseId);
        if (!ex) return false;
        const mg = ex.muscleGroup;
        return !soreGroups.has(mg);
      });
    });

    if (filteredGroups.length === 0) {
      throw new Error(
        'No suitable exercises available — all target muscles are still recovering',
      );
    }

    const workout = this.aiDayToWorkoutDay({
      ...aiDay,
      exerciseGroups: filteredGroups,
    });

    // Determine muscles covered
    const musclesCovered = new Set<MuscleGroup>();
    for (const g of workout.exerciseGroups) {
      for (const ex of g.exercises) {
        const exercise = exerciseMap.get(ex.exerciseId);
        if (exercise) musclesCovered.add(exercise.muscleGroup);
      }
    }

    // Estimate duration
    let totalSets = 0;
    for (const g of workout.exerciseGroups) {
      for (const ex of g.exercises) {
        totalSets += ex.sets.length;
      }
    }
    const estimatedMinutes = Math.round(totalSets * 2.5);

    return {
      workout,
      reasoning: (aiDay as any).reasoning ?? 'AI-selected exercises based on recovery and volume gaps',
      estimatedMinutes,
      musclesCovered: [...musclesCovered],
    };
  }

  /**
   * Convert result to a saveable ad-hoc single-day plan.
   */
  toAdHocPlan(
    result: DailyWorkoutResult,
    userId: string,
  ): Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId,
      name: result.workout.name,
      description: result.reasoning,
      days: [result.workout],
    };
  }

  /**
   * Full pipeline: gather -> generate -> return result.
   */
  async getSmartWorkout(
    availableMinutes: number,
    availableEquipment: EquipmentType[],
  ): Promise<DailyWorkoutResult> {
    const context = await new Promise<DailyWorkoutContext>(
      (resolve, reject) => {
        this.gatherContext(availableMinutes, availableEquipment).subscribe({
          next: resolve,
          error: reject,
        });
      },
    );
    return this.generateDailyWorkout(context);
  }

  // ── Private Helpers ──

  private computeWeeklyVolumes(
    sessions: { exerciseGroups?: any[] }[],
  ): WeeklyMuscleVolume[] {
    const setCounts = new Map<MuscleGroup, number>();
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    for (const session of sessions) {
      for (const group of session.exerciseGroups ?? []) {
        for (const ex of group.exercises ?? []) {
          const exercise = exerciseMap.get(ex.exerciseId);
          const mg = exercise
            ? exercise.muscleGroup
            : this.guessMuscleGroup(ex.exerciseName ?? '');
          const completedSets = (ex.sets ?? []).filter(
            (s: any) => s.completed,
          ).length;
          setCounts.set(mg, (setCounts.get(mg) ?? 0) + completedSets);
        }
      }
    }

    const groups = [
      MuscleGroup.Chest,
      MuscleGroup.Back,
      MuscleGroup.Shoulders,
      MuscleGroup.Legs,
      MuscleGroup.Arms,
      MuscleGroup.Core,
    ];

    return groups.map(mg => {
      const range = RECOMMENDED_RANGES[mg];
      const setsTarget = Math.round((range.min + range.max) / 2);
      const setsCompleted = setCounts.get(mg) ?? 0;
      return {
        muscleGroup: mg,
        setsCompleted,
        setsTarget,
        deficit: setsTarget - setsCompleted,
      };
    });
  }

  private guessMuscleGroup(exerciseName: string): MuscleGroup {
    const lower = exerciseName.toLowerCase();
    for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        return group as MuscleGroup;
      }
    }
    return MuscleGroup.FullBody;
  }

  private buildUserMessage(context: DailyWorkoutContext): string {
    const today = toDateString(new Date());
    const equipmentSet = new Set(context.availableEquipment);
    const trainableSet = new Set(context.trainableMuscles);
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    const lines: string[] = [
      `Goal: ${context.fitnessGoal}`,
      `Available time: ${context.availableMinutes} minutes`,
      `Date: ${today}`,
      '',
      'Recovery status:',
    ];

    for (const r of context.recoveryStatuses) {
      const hoursStr =
        r.hoursAgo !== null ? `${Math.round(r.hoursAgo)}h ago` : 'never';
      lines.push(`${r.label}: ${r.status} (${hoursStr})`);
    }

    const deficits = context.weeklyVolumes.filter(v => v.deficit > 0);
    if (deficits.length > 0) {
      lines.push('', 'Weekly volume gaps (sets still needed):');
      for (const v of deficits) {
        lines.push(
          `${MUSCLE_LABELS[v.muscleGroup]}: need ${v.deficit} more sets`,
        );
      }
    }

    lines.push(
      '',
      `Trainable muscles (ready/undertrained): ${context.trainableMuscles.map(mg => MUSCLE_LABELS[mg]).join(', ')}`,
    );
    if (context.priorityMuscles.length > 0) {
      lines.push(
        `Priority muscles (most undertrained): ${context.priorityMuscles.map(mg => MUSCLE_LABELS[mg]).join(', ')}`,
      );
    }

    // Filter exercises by equipment AND trainable muscle groups
    const available = EXERCISES.filter(e => {
      if (!equipmentSet.has(e.equipment as any)) return false;
      return trainableSet.has(e.muscleGroup);
    });

    lines.push('', 'Available exercises (use ONLY these IDs):');
    for (const ex of available) {
      lines.push(
        `${ex.id}: ${ex.name} (${MUSCLE_LABELS[ex.muscleGroup]}, ${ex.equipment})`,
      );
    }

    return lines.join('\n');
  }

  private aiDayToWorkoutDay(aiDay: AIDaySpec): WorkoutDay {
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    return {
      dayNumber: aiDay.dayNumber,
      name: aiDay.name,
      exerciseGroups: aiDay.exerciseGroups.map(g => ({
        type: g.type,
        restSeconds: g.restSeconds,
        exercises: g.exercises.map(e => ({
          exerciseId: e.exerciseId,
          exerciseName:
            exerciseMap.get(e.exerciseId)?.name ?? e.exerciseId,
          sets: e.sets.map(reps => ({ targetReps: reps })),
          ...(e.notes ? { notes: e.notes } : {}),
        })),
      })),
    };
  }
}
