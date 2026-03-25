import { Exercise, MuscleGroup, WorkoutDay, ExerciseGroup, PlanExercise } from '../../core/models';

export const EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Barbell Back Squat', muscleGroup: MuscleGroup.Legs, equipment: 'Barbell', tags: ['squat', 'quads', 'legs', 'compound', 'barbell', 'back squat'] },
  { id: 'ex-2', name: 'Barbell Bench Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['bench', 'chest', 'press', 'compound', 'barbell', 'flat bench'] },
  { id: 'ex-3', name: 'Deadlift', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['deadlift', 'back', 'posterior chain', 'compound', 'barbell', 'pull'] },
  { id: 'ex-4', name: 'Overhead Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['ohp', 'shoulders', 'press', 'military press', 'barbell', 'deltoids'] },
  { id: 'ex-5', name: 'Barbell Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['row', 'back', 'barbell row', 'bent over row', 'lats', 'compound'] },
  { id: 'ex-6', name: 'Pull Ups', muscleGroup: MuscleGroup.Back, equipment: 'Bodyweight', tags: ['pull up', 'chin up', 'back', 'lats', 'bodyweight', 'upper body'] },
  { id: 'ex-7', name: 'Dumbbell Curl', muscleGroup: MuscleGroup.Arms, equipment: 'Dumbbell', tags: ['curl', 'biceps', 'arms', 'dumbbell', 'isolation'] },
  { id: 'ex-8', name: 'Tricep Pushdown', muscleGroup: MuscleGroup.Arms, equipment: 'Cable', tags: ['triceps', 'pushdown', 'arms', 'cable', 'isolation'] },
  { id: 'ex-9', name: 'Leg Press', muscleGroup: MuscleGroup.Legs, equipment: 'Machine', tags: ['leg press', 'quads', 'legs', 'machine', 'compound'] },
  { id: 'ex-10', name: 'Romanian Deadlift', muscleGroup: MuscleGroup.Legs, equipment: 'Barbell', tags: ['rdl', 'hamstrings', 'glutes', 'posterior chain', 'barbell', 'deadlift'] },
  { id: 'ex-11', name: 'Lateral Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['lateral raise', 'side raise', 'shoulders', 'deltoids', 'isolation', 'dumbbell'] },
  { id: 'ex-12', name: 'Incline Dumbbell Press', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['incline', 'chest', 'press', 'upper chest', 'dumbbell'] },
  { id: 'ex-13', name: 'Cable Fly', muscleGroup: MuscleGroup.Chest, equipment: 'Cable', tags: ['fly', 'chest', 'cable', 'pec fly', 'isolation'] },
  { id: 'ex-14', name: 'Lat Pulldown', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['lat pulldown', 'lats', 'back', 'cable', 'pulldown'] },
  { id: 'ex-15', name: 'Leg Curl', muscleGroup: MuscleGroup.Legs, equipment: 'Machine', tags: ['leg curl', 'hamstrings', 'machine', 'isolation'] },
  { id: 'ex-16', name: 'Leg Extension', muscleGroup: MuscleGroup.Legs, equipment: 'Machine', tags: ['leg extension', 'quads', 'machine', 'isolation'] },
  { id: 'ex-17', name: 'Plank', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['plank', 'core', 'abs', 'bodyweight', 'isometric'] },
  { id: 'ex-18', name: 'Face Pull', muscleGroup: MuscleGroup.Shoulders, equipment: 'Cable', tags: ['face pull', 'rear delt', 'shoulders', 'cable', 'rotator cuff'] },
  { id: 'ex-19', name: 'Dips', muscleGroup: MuscleGroup.Chest, equipment: 'Bodyweight', tags: ['dips', 'chest', 'triceps', 'bodyweight', 'compound'] },
  { id: 'ex-20', name: 'Hammer Curl', muscleGroup: MuscleGroup.Arms, equipment: 'Dumbbell', tags: ['hammer curl', 'biceps', 'brachialis', 'forearms', 'dumbbell'] },
  { id: 'ex-21', name: 'Bulgarian Split Squat', muscleGroup: MuscleGroup.Legs, equipment: 'Dumbbell', tags: ['split squat', 'quads', 'glutes', 'unilateral', 'single leg', 'dumbbell'] },
  { id: 'ex-22', name: 'Seated Cable Row', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['cable row', 'back', 'lats', 'rhomboids', 'seated row'] },
  { id: 'ex-23', name: 'Skull Crusher', muscleGroup: MuscleGroup.Arms, equipment: 'Barbell', tags: ['skull crusher', 'triceps', 'lying extension', 'barbell', 'arms'] },
  { id: 'ex-24', name: 'Hip Thrust', muscleGroup: MuscleGroup.Legs, equipment: 'Barbell', tags: ['hip thrust', 'glutes', 'barbell', 'posterior chain'] },
];

// Helper to build exercise groups
function single(exId: string, sets: number[], rest: number, notes?: string): ExerciseGroup {
  const exercise = EXERCISES.find(e => e.id === exId)!;
  const planEx: PlanExercise = {
    exerciseId: exId,
    exerciseName: exercise.name,
    sets: sets.map(reps => ({ targetReps: reps })),
    ...(notes ? { notes } : {}),
  };
  return { type: 'single', exercises: [planEx], restSeconds: rest };
}

function superset(items: { id: string; sets: number[] }[], rest: number): ExerciseGroup {
  const exercises: PlanExercise[] = items.map(item => {
    const exercise = EXERCISES.find(e => e.id === item.id)!;
    return {
      exerciseId: item.id,
      exerciseName: exercise.name,
      sets: item.sets.map(reps => ({ targetReps: reps })),
    };
  });
  return { type: 'superset', exercises, restSeconds: rest };
}

export const SAMPLE_PLANS_DAYS: { name: string; description: string; days: WorkoutDay[] }[] = [
  {
    name: 'Push Pull Legs',
    description: 'Classic 3-day split. Repeat twice per week for 6 days.',
    days: [
      {
        dayNumber: 1,
        name: 'Push — Chest, Shoulders, Triceps',
        exerciseGroups: [
          single('ex-2', [8, 8, 6, 6], 120, 'Warm up with empty bar first'),
          single('ex-12', [10, 10, 8], 90),
          single('ex-13', [12, 12, 12], 60),
          single('ex-4', [8, 8, 6], 90),
          superset(
            [
              { id: 'ex-11', sets: [15, 15, 12] },
              { id: 'ex-8', sets: [12, 12, 10] },
            ],
            60,
          ),
        ],
      },
      {
        dayNumber: 2,
        name: 'Pull — Back & Biceps',
        exerciseGroups: [
          single('ex-3', [5, 5, 3, 3], 180, 'Belt up for heavy sets'),
          single('ex-5', [8, 8, 6], 90),
          single('ex-6', [8, 8, 6], 90),
          single('ex-14', [10, 10, 10], 60),
          single('ex-18', [15, 15, 15], 60),
          superset(
            [
              { id: 'ex-7', sets: [12, 10, 8] },
              { id: 'ex-20', sets: [12, 10, 8] },
            ],
            60,
          ),
        ],
      },
      {
        dayNumber: 3,
        name: 'Legs — Quads, Hams, Glutes',
        exerciseGroups: [
          single('ex-1', [8, 8, 6, 6], 150, 'Slow descent, explosive up'),
          single('ex-9', [12, 12, 10], 90),
          single('ex-10', [10, 10, 8], 90),
          superset(
            [
              { id: 'ex-16', sets: [12, 12, 12] },
              { id: 'ex-15', sets: [12, 12, 12] },
            ],
            60,
          ),
          single('ex-24', [12, 10, 10], 90),
        ],
      },
    ],
  },
  {
    name: 'Upper / Lower Split',
    description: '4-day program alternating upper and lower body.',
    days: [
      {
        dayNumber: 1,
        name: 'Upper — Strength',
        exerciseGroups: [
          single('ex-2', [5, 5, 5, 5, 5], 180),
          single('ex-5', [5, 5, 5, 5], 150),
          single('ex-4', [6, 6, 6, 6], 120),
          single('ex-6', [6, 6, 6], 90),
          superset(
            [
              { id: 'ex-7', sets: [10, 10, 10] },
              { id: 'ex-8', sets: [10, 10, 10] },
            ],
            60,
          ),
        ],
      },
      {
        dayNumber: 2,
        name: 'Lower — Strength',
        exerciseGroups: [
          single('ex-1', [5, 5, 5, 5, 5], 180),
          single('ex-3', [5, 5, 5], 180),
          single('ex-9', [8, 8, 8], 90),
          single('ex-10', [8, 8, 8], 90),
          single('ex-17', [60, 60, 60], 60),
        ],
      },
      {
        dayNumber: 3,
        name: 'Upper — Hypertrophy',
        exerciseGroups: [
          single('ex-12', [12, 10, 10, 8], 90),
          single('ex-22', [12, 10, 10], 60),
          single('ex-13', [15, 12, 12], 60),
          superset(
            [
              { id: 'ex-11', sets: [15, 15, 12] },
              { id: 'ex-18', sets: [15, 15, 12] },
            ],
            60,
          ),
          superset(
            [
              { id: 'ex-20', sets: [12, 10, 10] },
              { id: 'ex-23', sets: [12, 10, 10] },
            ],
            60,
          ),
        ],
      },
      {
        dayNumber: 4,
        name: 'Lower — Hypertrophy',
        exerciseGroups: [
          single('ex-21', [12, 10, 10, 8], 90),
          single('ex-24', [12, 12, 10], 90),
          single('ex-16', [15, 12, 12], 60),
          single('ex-15', [15, 12, 12], 60),
          single('ex-10', [12, 10, 10], 90),
        ],
      },
    ],
  },
];
