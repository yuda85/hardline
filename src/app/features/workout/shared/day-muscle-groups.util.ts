import { MuscleGroup, WorkoutDay, Exercise } from '../../../core/models';
import { EXERCISES } from '../exercise-data';

const MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  MuscleGroup.Chest,
  MuscleGroup.Back,
  MuscleGroup.Shoulders,
  MuscleGroup.Biceps,
  MuscleGroup.Triceps,
  MuscleGroup.Core,
  MuscleGroup.UpperLegs,
  MuscleGroup.LowerLegs,
  MuscleGroup.FullBody,
];

const KEYWORD_FALLBACK: Array<[RegExp, MuscleGroup]> = [
  [/\b(bench|chest|push.?up|fly|pec)\b/i, MuscleGroup.Chest],
  [/\b(row|pull.?up|chin.?up|lat|pulldown|deadlift|back)\b/i, MuscleGroup.Back],
  [/\b(shoulder|press|raise|delt|lateral)\b/i, MuscleGroup.Shoulders],
  [/\b(curl|bicep)\b/i, MuscleGroup.Biceps],
  [/\b(tricep|extension|skullcrusher|dip)\b/i, MuscleGroup.Triceps],
  [/\b(squat|lunge|leg.?press|leg.?extension|leg.?curl|hip.?thrust|hamstring|quad|glute)\b/i, MuscleGroup.UpperLegs],
  [/\b(calf|calves)\b/i, MuscleGroup.LowerLegs],
  [/\b(ab|crunch|plank|core|oblique)\b/i, MuscleGroup.Core],
];

/** Best-effort muscle-group lookup for an exercise that isn't in the static library. */
export function inferMuscleGroup(exerciseName: string): MuscleGroup | null {
  for (const [pattern, group] of KEYWORD_FALLBACK) {
    if (pattern.test(exerciseName)) return group;
  }
  return null;
}

/**
 * Returns the deduplicated, ordered list of muscle groups worked by a single
 * day in a workout plan. Looks up each exerciseId in the static library, then
 * falls back to keyword inference on the exercise name (covers custom user
 * exercises and edge cases).
 */
export function getDayMuscleGroups(
  day: WorkoutDay,
  extraExercises?: ReadonlyArray<Pick<Exercise, 'id' | 'muscleGroup' | 'name'>>,
): MuscleGroup[] {
  const found = new Set<MuscleGroup>();
  for (const group of day.exerciseGroups) {
    for (const ex of group.exercises) {
      const lib = EXERCISES.find(e => e.id === ex.exerciseId);
      const custom = extraExercises?.find(e => e.id === ex.exerciseId);
      const mg = lib?.muscleGroup ?? custom?.muscleGroup ?? inferMuscleGroup(ex.exerciseName);
      if (mg) found.add(mg);
    }
  }
  return MUSCLE_GROUP_ORDER.filter(g => found.has(g));
}
