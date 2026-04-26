import { describe, it, expect } from 'vitest';
import { getDayMuscleGroups, inferMuscleGroup } from './day-muscle-groups.util';
import { MuscleGroup, WorkoutDay } from '../../../core/models';

function dayWith(exercises: { exerciseId: string; exerciseName: string }[]): WorkoutDay {
  return {
    dayNumber: 1,
    name: 'Test Day',
    exerciseGroups: [
      {
        type: 'single',
        restSeconds: 60,
        exercises: exercises.map(e => ({
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          sets: [{ targetReps: 10 }],
        })),
      },
    ],
  };
}

describe('inferMuscleGroup', () => {
  it('matches chest exercises by keyword', () => {
    expect(inferMuscleGroup('Incline Bench Press')).toBe(MuscleGroup.Chest);
    expect(inferMuscleGroup('Cable Fly')).toBe(MuscleGroup.Chest);
  });

  it('matches back exercises by keyword', () => {
    expect(inferMuscleGroup('Barbell Row')).toBe(MuscleGroup.Back);
    expect(inferMuscleGroup('Lat Pulldown')).toBe(MuscleGroup.Back);
  });

  it('returns null when no keyword matches', () => {
    expect(inferMuscleGroup('Mystery Movement XYZ')).toBeNull();
  });
});

describe('getDayMuscleGroups', () => {
  it('returns deduped muscle groups from library exercises', () => {
    // ex-1 is Barbell Back Squat (Upper Legs); ex-9 is Leg Press (Upper Legs)
    const day = dayWith([
      { exerciseId: 'ex-1', exerciseName: 'Barbell Back Squat' },
      { exerciseId: 'ex-9', exerciseName: 'Leg Press' },
    ]);
    expect(getDayMuscleGroups(day)).toEqual([MuscleGroup.UpperLegs]);
  });

  it('returns multiple groups in canonical order', () => {
    // ex-1 Upper Legs; ex-15 Upper Legs; "Bench Press" inferred as Chest
    const day = dayWith([
      { exerciseId: 'ex-1', exerciseName: 'Barbell Back Squat' },
      { exerciseId: 'unknown-id', exerciseName: 'Bench Press' },
    ]);
    const result = getDayMuscleGroups(day);
    expect(result).toContain(MuscleGroup.Chest);
    expect(result).toContain(MuscleGroup.UpperLegs);
    // Chest comes before UpperLegs in MUSCLE_GROUP_ORDER
    expect(result.indexOf(MuscleGroup.Chest)).toBeLessThan(
      result.indexOf(MuscleGroup.UpperLegs),
    );
  });

  it('falls back to keyword inference for unknown exercise IDs', () => {
    const day = dayWith([
      { exerciseId: 'custom-1', exerciseName: 'Cable Bicep Curl' },
    ]);
    expect(getDayMuscleGroups(day)).toEqual([MuscleGroup.Biceps]);
  });

  it('skips exercises that cannot be resolved', () => {
    const day = dayWith([
      { exerciseId: 'unknown', exerciseName: 'Mystery Movement' },
    ]);
    expect(getDayMuscleGroups(day)).toEqual([]);
  });
});
