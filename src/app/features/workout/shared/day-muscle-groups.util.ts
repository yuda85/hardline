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
  MuscleGroup.Hamstrings,
  MuscleGroup.Glutes,
  MuscleGroup.LowerLegs,
  MuscleGroup.FullBody,
];

// Order matters: more specific groups before generic squat/deadlift.
const KEYWORD_FALLBACK: Array<[RegExp, MuscleGroup]> = [
  [/\b(bench|chest|push.?up|fly|pec)\b/i, MuscleGroup.Chest],
  [/\b(shoulder|raise|delt|lateral|ohp|military)\b/i, MuscleGroup.Shoulders],
  [/\b(curl|bicep|hammer|preacher)\b/i, MuscleGroup.Biceps],
  [/\b(tricep|skullcrusher|pushdown|dip)\b/i, MuscleGroup.Triceps],
  [/\b(leg.?curl|romanian.?deadlift|rdl|nordic|hamstring)\b/i, MuscleGroup.Hamstrings],
  [/\b(hip.?thrust|glute|kickback|sumo.?deadlift|split.?squat|lunge|step.?up)\b/i, MuscleGroup.Glutes],
  [/\b(squat|leg.?press|leg.?extension|quad)\b/i, MuscleGroup.UpperLegs],
  [/\b(row|pull.?up|chin.?up|lat|pulldown|deadlift|back)\b/i, MuscleGroup.Back],
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
