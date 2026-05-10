import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import {
  MuscleGroup,
  WorkoutPlan,
  WorkoutDay,
  ExerciseGroup,
  PlanExercise,
} from '../models/workout.model';
import {
  WorkoutBuilderInput,
  BuilderConfig,
  MuscleGroupBudget,
  DaySkeleton,
  AIBuilderResponse,
  AIGroupSpec,
  BuilderValidationResult,
  SplitPreference,
} from '../models/ai-workout.model';
import { EXERCISES } from '../../features/workout/exercise-data';
import { RECOMMENDED_RANGES } from './volume-analysis.service';
import { AIService } from './ai.service';
import { AuthState } from '../../store/auth/auth.state';

// ── Split Definitions ──

interface SplitTemplate {
  name: string;
  days: { name: string; muscleGroups: MuscleGroup[] }[];
}

const ALL_UPPER: MuscleGroup[] = [
  MuscleGroup.Chest,
  MuscleGroup.Back,
  MuscleGroup.Shoulders,
  MuscleGroup.Biceps,
  MuscleGroup.Triceps,
];
const ALL_MUSCLES: MuscleGroup[] = [
  MuscleGroup.Chest,
  MuscleGroup.Back,
  MuscleGroup.UpperLegs,
  MuscleGroup.Hamstrings,
  MuscleGroup.Glutes,
  MuscleGroup.LowerLegs,
  MuscleGroup.Shoulders,
  MuscleGroup.Biceps,
  MuscleGroup.Triceps,
  MuscleGroup.Core,
];

const SPLIT_TEMPLATES: Record<string, SplitTemplate> = {
  full_body: {
    name: 'Full Body',
    days: [
      { name: 'Full Body A', muscleGroups: ALL_MUSCLES },
      { name: 'Full Body B', muscleGroups: ALL_MUSCLES },
      { name: 'Full Body C', muscleGroups: ALL_MUSCLES },
    ],
  },
  ppl: {
    name: 'Push / Pull / Legs',
    days: [
      { name: 'Push — Chest, Shoulders, Triceps', muscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Triceps] },
      { name: 'Pull — Back & Biceps', muscleGroups: [MuscleGroup.Back, MuscleGroup.Biceps] },
      { name: 'Legs & Core', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
    ],
  },
  upper_lower: {
    name: 'Upper / Lower',
    days: [
      { name: 'Upper — Strength', muscleGroups: ALL_UPPER },
      { name: 'Lower — Strength', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
      { name: 'Upper — Hypertrophy', muscleGroups: ALL_UPPER },
      { name: 'Lower — Hypertrophy', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
    ],
  },
  bro_split: {
    name: 'Bro Split',
    days: [
      { name: 'Chest', muscleGroups: [MuscleGroup.Chest] },
      { name: 'Back', muscleGroups: [MuscleGroup.Back] },
      { name: 'Shoulders', muscleGroups: [MuscleGroup.Shoulders] },
      { name: 'Legs', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
      { name: 'Arms', muscleGroups: [MuscleGroup.Biceps, MuscleGroup.Triceps] },
    ],
  },
};

/** Auto-select split based on days per week */
function autoSelectSplit(daysPerWeek: number): SplitTemplate {
  switch (daysPerWeek) {
    case 2: return { ...SPLIT_TEMPLATES['full_body'], days: SPLIT_TEMPLATES['full_body'].days.slice(0, 2) };
    case 3: return SPLIT_TEMPLATES['ppl'];
    case 4: return SPLIT_TEMPLATES['upper_lower'];
    case 5: return {
      name: 'Push / Pull / Legs / Upper / Lower',
      days: [
        ...SPLIT_TEMPLATES['ppl'].days,
        { name: 'Upper', muscleGroups: ALL_UPPER },
        { name: 'Lower', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
      ],
    };
    case 6: return {
      name: 'Push / Pull / Legs x2',
      days: [
        { name: 'Push A — Strength', muscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Triceps] },
        { name: 'Pull A — Strength', muscleGroups: [MuscleGroup.Back, MuscleGroup.Biceps] },
        { name: 'Legs A — Strength', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
        { name: 'Push B — Hypertrophy', muscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Triceps] },
        { name: 'Pull B — Hypertrophy', muscleGroups: [MuscleGroup.Back, MuscleGroup.Biceps] },
        { name: 'Legs B — Hypertrophy', muscleGroups: [MuscleGroup.UpperLegs, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.LowerLegs, MuscleGroup.Core] },
      ],
    };
    default: return SPLIT_TEMPLATES['ppl'];
  }
}

function resolveSplit(pref: SplitPreference, daysPerWeek: number): SplitTemplate {
  if (pref === 'auto') return autoSelectSplit(daysPerWeek);
  const template = SPLIT_TEMPLATES[pref];
  if (!template) return autoSelectSplit(daysPerWeek);
  // Trim or repeat days to match daysPerWeek
  const days = template.days;
  if (daysPerWeek <= days.length) {
    return { ...template, days: days.slice(0, daysPerWeek) };
  }
  // Repeat days with A/B suffix
  const extended = [...days];
  for (let i = 0; extended.length < daysPerWeek; i++) {
    const src = days[i % days.length];
    extended.push({ ...src, name: src.name + ' B' });
  }
  return { ...template, days: extended };
}

// ── Prompt ──

const BUILDER_SYSTEM_PROMPT = `You are an elite strength & conditioning coach designing a structured workout plan. You must create COMPLETE, DETAILED programs — not minimal outlines.

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no explanation
- ONLY use exercise IDs from the provided exercise library
- Each day should have between minExercises and maxExercises exercises
- Focused days (1-2 muscle groups) may have fewer exercises with more sets per exercise — quality over quantity
- Do NOT add filler exercises just to meet the count — a well-programmed 4-exercise Arms day beats a padded 6-exercise one
- Include 3-4 sets per exercise (not just 1-2)
- Respect the muscle group assignments for each day
- Use 'superset' type to pair antagonist muscles or save time
- Rest seconds: heavy compound 120-180, moderate compound 90-120, isolation 60-90, supersets 60
- Start each day with the heaviest compound movements, progress to isolation
- For beginners: prefer machines and simple movements, higher reps
- For advanced: include compound supersets, varied rep schemes, periodization notes

TRAINING STYLE GUIDELINES:
- strength: 3-6 reps, heavy loads, longer rest, focus on compound lifts
- hypertrophy: 8-12 reps, moderate loads, moderate rest, include isolation work
- powerbuilding: mix of 3-6 rep compounds AND 8-12 rep accessories
- athletic: explosive movements, 6-10 reps, functional exercises
- endurance: 15-20 reps, shorter rest, circuits welcome

Return this exact JSON structure:
{
  "planName": "string",
  "description": "string",
  "days": [
    {
      "dayNumber": 1,
      "name": "Day Name",
      "exerciseGroups": [
        {
          "type": "single" | "superset",
          "exercises": [
            { "exerciseId": "ex-1", "sets": [8, 8, 6, 6], "notes": "optional" }
          ],
          "restSeconds": 60
        }
      ]
    }
  ]
}`;

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  [MuscleGroup.Chest]: 'Chest',
  [MuscleGroup.Back]: 'Back',
  [MuscleGroup.Shoulders]: 'Shoulders',
  [MuscleGroup.UpperLegs]: 'Quads',
  [MuscleGroup.Hamstrings]: 'Hamstrings',
  [MuscleGroup.Glutes]: 'Glutes',
  [MuscleGroup.LowerLegs]: 'Calves',
  [MuscleGroup.Biceps]: 'Biceps',
  [MuscleGroup.Triceps]: 'Triceps',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.FullBody]: 'Full Body',
};

const REP_RANGE_LABELS: Record<string, string> = {
  low: '1-5 reps (strength focus)',
  medium: '6-12 reps (hypertrophy focus)',
  high: '12-20 reps (endurance/pump)',
  mixed: 'mix of heavy, moderate, and light work',
};

@Injectable({ providedIn: 'root' })
export class WorkoutBuilderService {
  private readonly aiService = inject(AIService);
  private readonly store = inject(Store);

  buildConfig(input: WorkoutBuilderInput): BuilderConfig {
    const days = Math.max(2, Math.min(6, input.daysPerWeek));
    const split = resolveSplit(input.splitPreference, days);

    const excluded = new Set(input.constraints?.excludeExercises ?? []);
    const equipmentSet = new Set(input.availableEquipment);
    const available = EXERCISES.filter(
      e => equipmentSet.has(e.equipment as any) && !excluded.has(e.id!),
    );
    const availableExerciseIds = available.map(e => e.id!);

    const budgets = this.computeBudgets(input, split);

    const timeBasedMax = Math.min(12, Math.floor(input.minutesPerWorkout / 6));
    const timeBasedMin = Math.max(2, Math.floor(input.minutesPerWorkout / 12));
    const maxSets = Math.floor(input.minutesPerWorkout / 2.5);

    const daySkeletons: DaySkeleton[] = split.days.map((d, i) => {
      const mgCount = d.muscleGroups.length;
      const dayMin = Math.min(Math.max(mgCount, timeBasedMin), timeBasedMax);
      const dayMax = Math.max(dayMin + 2, timeBasedMax);
      return {
        dayNumber: i + 1,
        name: d.name,
        muscleGroups: d.muscleGroups,
        minExercises: dayMin,
        maxExercises: dayMax,
        maxSets,
      };
    });

    return {
      input,
      budgets,
      daySplitName: split.name,
      daySkeletons,
      availableExerciseIds,
    };
  }

  async generateWithAI(config: BuilderConfig): Promise<AIBuilderResponse> {
    const userMessage = this.buildUserMessage(config);
    return this.aiService.generateWorkoutPlan(
      BUILDER_SYSTEM_PROMPT,
      userMessage,
    );
  }

  validate(
    response: AIBuilderResponse,
    config: BuilderConfig,
  ): BuilderValidationResult {
    const errors: { field: string; message: string }[] = [];
    const warnings: string[] = [];
    const validIds = new Set(config.availableExerciseIds);
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    if (response.days.length !== config.daySkeletons.length) {
      errors.push({
        field: 'days',
        message: `Expected ${config.daySkeletons.length} days, got ${response.days.length}`,
      });
    }

    for (const day of response.days) {
      const skeleton = config.daySkeletons.find(
        s => s.dayNumber === day.dayNumber,
      );
      const dayPrefix = `Day ${day.dayNumber}`;
      const seenIds = new Set<string>();
      let daySetCount = 0;
      let dayExerciseCount = 0;

      for (const group of day.exerciseGroups) {
        if (group.type === 'single' && group.exercises.length !== 1) {
          errors.push({
            field: `${dayPrefix}.group`,
            message: `Single group must have exactly 1 exercise, got ${group.exercises.length}`,
          });
        }
        if (group.type === 'superset' && group.exercises.length < 2) {
          errors.push({
            field: `${dayPrefix}.group`,
            message: `Superset must have 2+ exercises, got ${group.exercises.length}`,
          });
        }

        if (group.restSeconds < 30 || group.restSeconds > 300) {
          errors.push({
            field: `${dayPrefix}.restSeconds`,
            message: `Rest ${group.restSeconds}s out of range (30-300)`,
          });
        }

        for (const ex of group.exercises) {
          dayExerciseCount++;

          if (!validIds.has(ex.exerciseId)) {
            errors.push({
              field: `${dayPrefix}.exerciseId`,
              message: `Unknown exercise ID: ${ex.exerciseId}`,
            });
            continue;
          }

          const exercise = exerciseMap.get(ex.exerciseId);
          if (
            exercise &&
            !config.input.availableEquipment.includes(exercise.equipment as any)
          ) {
            errors.push({
              field: `${dayPrefix}.equipment`,
              message: `${exercise.name} requires ${exercise.equipment} which is not available`,
            });
          }

          if (seenIds.has(ex.exerciseId)) {
            errors.push({
              field: `${dayPrefix}.duplicate`,
              message: `Duplicate exercise ${ex.exerciseId} in day`,
            });
          }
          seenIds.add(ex.exerciseId);

          for (const rep of ex.sets) {
            if (rep < 1 || rep > 30) {
              errors.push({
                field: `${dayPrefix}.reps`,
                message: `Rep value ${rep} out of range (1-30)`,
              });
            }
          }

          daySetCount += ex.sets.length;
        }
      }

      if (skeleton) {
        // Exercise count check — only error if way under minimum
        if (dayExerciseCount < skeleton.minExercises - 1) {
          errors.push({
            field: `${dayPrefix}.exercises`,
            message: `Only ${dayExerciseCount} exercises, need at least ${skeleton.minExercises - 1}`,
          });
        } else if (dayExerciseCount < skeleton.minExercises) {
          warnings.push(
            `${dayPrefix}: ${dayExerciseCount} exercises, ideally ${skeleton.minExercises}+`,
          );
        }

        if (daySetCount > skeleton.maxSets + 6) {
          errors.push({
            field: `${dayPrefix}.sets`,
            message: `${daySetCount} sets exceeds budget of ${skeleton.maxSets} by too much`,
          });
        } else if (daySetCount > skeleton.maxSets + 3) {
          warnings.push(
            `${dayPrefix}: ${daySetCount} sets slightly exceeds budget of ${skeleton.maxSets}`,
          );
        }
        if (dayExerciseCount > skeleton.maxExercises + 2) {
          warnings.push(
            `${dayPrefix}: ${dayExerciseCount} exercises exceeds budget of ${skeleton.maxExercises}`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  toWorkoutPlan(response: AIBuilderResponse, userId: string): WorkoutPlan {
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    const days: WorkoutDay[] = response.days.map(aiDay => ({
      dayNumber: aiDay.dayNumber,
      name: aiDay.name,
      exerciseGroups: aiDay.exerciseGroups.map(
        (g: AIGroupSpec): ExerciseGroup => ({
          type: g.type,
          restSeconds: g.restSeconds,
          exercises: g.exercises.map(
            (e): PlanExercise => ({
              exerciseId: e.exerciseId,
              exerciseName:
                exerciseMap.get(e.exerciseId)?.name ?? e.exerciseId,
              sets: e.sets.map(reps => ({ targetReps: reps })),
              ...(e.notes ? { notes: e.notes } : {}),
            }),
          ),
        }),
      ),
    }));

    return {
      userId,
      name: response.planName,
      description: response.description || undefined,
      days,
    };
  }

  async buildPlan(input: WorkoutBuilderInput): Promise<WorkoutPlan> {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) throw new Error('Not authenticated');

    const config = this.buildConfig(input);

    let response = await this.generateWithAI(config);
    let validation = this.validate(response, config);

    if (!validation.valid) {
      const errorMsg = validation.errors.map(e => e.message).join('\n');
      const retryMessage =
        this.buildUserMessage(config) +
        `\n\nYour previous response had these errors. Fix them:\n${errorMsg}`;
      response = await this.aiService.generateWorkoutPlan(
        BUILDER_SYSTEM_PROMPT,
        retryMessage,
      );
      validation = this.validate(response, config);

      if (!validation.valid) {
        throw new Error(
          'AI generated invalid workout after retry: ' +
            validation.errors.map(e => e.message).join(', '),
        );
      }
    }

    return this.toWorkoutPlan(response, uid);
  }

  // ── Private Helpers ──

  private computeBudgets(input: WorkoutBuilderInput, split: SplitTemplate): MuscleGroupBudget[] {
    const weakPoints = new Set(input.constraints?.weakPoints ?? []);
    const groups = [
      MuscleGroup.Chest,
      MuscleGroup.Back,
      MuscleGroup.Shoulders,
      MuscleGroup.UpperLegs,
      MuscleGroup.LowerLegs,
      MuscleGroup.Biceps,
      MuscleGroup.Triceps,
      MuscleGroup.Core,
    ];

    return groups.map(mg => {
      const range = RECOMMENDED_RANGES[mg];
      let minSets: number;
      let maxSets: number;

      switch (input.experienceLevel) {
        case 'beginner':
          minSets = range.min;
          maxSets = range.min + Math.round((range.max - range.min) * 0.3);
          break;
        case 'advanced':
          minSets = range.min + Math.round((range.max - range.min) * 0.5);
          maxSets = range.max;
          break;
        default:
          minSets = Math.round((range.min + range.max) / 2) - 2;
          maxSets = Math.round((range.min + range.max) / 2) + 2;
      }

      if (weakPoints.has(mg)) {
        minSets = Math.round(minSets * 1.2);
        maxSets = Math.round(maxSets * 1.2);
      }

      const frequency = split.days.filter(d =>
        d.muscleGroups.includes(mg),
      ).length;

      return { muscleGroup: mg, minSets, maxSets, frequency };
    });
  }

  private buildUserMessage(config: BuilderConfig): string {
    const { input, budgets, daySplitName, daySkeletons } = config;
    const exerciseMap = new Map(EXERCISES.map(e => [e.id, e]));

    const lines: string[] = [];

    // Free text goal is PRIMARY
    if (input.freeTextGoal?.trim()) {
      lines.push(
        `PRIMARY GOAL (this is the most important directive — the entire program should be designed around this):`,
        `"${input.freeTextGoal.trim()}"`,
        '',
      );
    }

    lines.push(
      `Body composition goal: ${input.fitnessGoal}`,
      `Training style: ${input.trainingStyle}`,
      `Rep range preference: ${REP_RANGE_LABELS[input.repRangePreference] ?? 'mixed'}`,
      `Experience: ${input.experienceLevel}`,
      `Days/week: ${input.daysPerWeek}`,
      `Minutes/workout: ${input.minutesPerWorkout}`,
      `Split: ${daySplitName}`,
    );

    if (input.constraints?.injuries?.length) {
      lines.push(
        `Injuries/limitations: ${input.constraints.injuries.join(', ')}`,
      );
    }
    if (input.constraints?.weakPoints?.length) {
      lines.push(
        `Emphasize: ${input.constraints.weakPoints.map(mg => MUSCLE_LABELS[mg]).join(', ')}`,
      );
    }

    lines.push('', 'Day structure (you MUST include at least minExercises per day):');
    for (const s of daySkeletons) {
      const muscles = s.muscleGroups.map(mg => MUSCLE_LABELS[mg]).join(', ');
      lines.push(
        `Day ${s.dayNumber} "${s.name}": muscles=[${muscles}], minExercises=${s.minExercises}, maxExercises=${s.maxExercises}, maxSets=${s.maxSets}`,
      );
    }

    lines.push('', 'Volume budgets (weekly sets):');
    for (const b of budgets) {
      lines.push(
        `${MUSCLE_LABELS[b.muscleGroup]}: ${b.minSets}-${b.maxSets} sets/week`,
      );
    }

    lines.push('', 'Available exercises (use ONLY these IDs):');
    for (const id of config.availableExerciseIds) {
      const ex = exerciseMap.get(id);
      if (ex) {
        lines.push(
          `${id}: ${ex.name} (${MUSCLE_LABELS[ex.muscleGroup]}, ${ex.equipment})`,
        );
      }
    }

    return lines.join('\n');
  }
}
