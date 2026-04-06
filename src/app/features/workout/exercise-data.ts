import { Exercise, MuscleGroup, WorkoutDay, ExerciseGroup, PlanExercise } from '../../core/models';

export const EXERCISES: Exercise[] = [
  // ── UPPER LEGS (18) — quads, hamstrings, glutes ──
  { id: 'ex-1', name: 'Barbell Back Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Barbell', tags: ['squat', 'quads', 'legs', 'compound', 'barbell', 'back squat'] },
  { id: 'ex-9', name: 'Leg Press', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Machine', tags: ['leg press', 'quads', 'legs', 'machine', 'compound'] },
  { id: 'ex-10', name: 'Romanian Deadlift', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Barbell', tags: ['rdl', 'hamstrings', 'glutes', 'posterior chain', 'barbell', 'deadlift'] },
  { id: 'ex-15', name: 'Leg Curl', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Machine', tags: ['leg curl', 'hamstrings', 'machine', 'isolation'] },
  { id: 'ex-16', name: 'Leg Extension', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Machine', tags: ['leg extension', 'quads', 'machine', 'isolation'] },
  { id: 'ex-21', name: 'Bulgarian Split Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Dumbbell', tags: ['split squat', 'quads', 'glutes', 'unilateral', 'single leg', 'dumbbell'] },
  { id: 'ex-24', name: 'Hip Thrust', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Barbell', tags: ['hip thrust', 'glutes', 'barbell', 'posterior chain'] },
  { id: 'ex-25', name: 'Front Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Barbell', tags: ['squat', 'quads', 'front squat', 'barbell', 'compound'] },
  { id: 'ex-26', name: 'Goblet Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Dumbbell', tags: ['squat', 'quads', 'goblet', 'dumbbell', 'compound'] },
  { id: 'ex-27', name: 'Walking Lunge', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Dumbbell', tags: ['lunge', 'quads', 'glutes', 'dumbbell', 'unilateral'] },
  { id: 'ex-28', name: 'Hack Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Machine', tags: ['squat', 'quads', 'hack squat', 'machine', 'compound'] },
  { id: 'ex-31', name: 'Sumo Deadlift', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Barbell', tags: ['deadlift', 'sumo', 'glutes', 'inner thigh', 'barbell', 'compound'] },
  { id: 'ex-32', name: 'Dumbbell Romanian Deadlift', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Dumbbell', tags: ['rdl', 'hamstrings', 'glutes', 'dumbbell'] },
  { id: 'ex-33', name: 'Step Up', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Dumbbell', tags: ['step up', 'quads', 'glutes', 'unilateral', 'dumbbell'] },
  { id: 'ex-34', name: 'Glute Kickback', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Cable', tags: ['kickback', 'glutes', 'cable', 'isolation'] },
  { id: 'ex-35', name: 'Sissy Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Bodyweight', tags: ['squat', 'quads', 'bodyweight', 'isolation'] },
  { id: 'ex-36', name: 'Pendulum Squat', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Machine', tags: ['squat', 'quads', 'machine', 'compound'] },
  { id: 'ex-37', name: 'Nordic Hamstring Curl', muscleGroup: MuscleGroup.UpperLegs, equipment: 'Bodyweight', tags: ['hamstrings', 'nordic', 'bodyweight', 'eccentric'] },

  // ── LOWER LEGS (2) — calves ──
  { id: 'ex-29', name: 'Standing Calf Raise', muscleGroup: MuscleGroup.LowerLegs, equipment: 'Machine', tags: ['calf raise', 'calves', 'machine', 'isolation'] },
  { id: 'ex-30', name: 'Seated Calf Raise', muscleGroup: MuscleGroup.LowerLegs, equipment: 'Machine', tags: ['calf raise', 'calves', 'seated', 'machine', 'isolation'] },

  // ── CHEST (20) ──
  { id: 'ex-2', name: 'Barbell Bench Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['bench', 'chest', 'press', 'compound', 'barbell', 'flat bench'] },
  { id: 'ex-12', name: 'Incline Dumbbell Press', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['incline', 'chest', 'press', 'upper chest', 'dumbbell'] },
  { id: 'ex-13', name: 'Cable Fly', muscleGroup: MuscleGroup.Chest, equipment: 'Cable', tags: ['fly', 'chest', 'cable', 'pec fly', 'isolation'] },
  { id: 'ex-19', name: 'Dips', muscleGroup: MuscleGroup.Chest, equipment: 'Bodyweight', tags: ['dips', 'chest', 'triceps', 'bodyweight', 'compound'] },
  { id: 'ex-38', name: 'Incline Barbell Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['incline', 'chest', 'press', 'upper chest', 'barbell', 'compound'] },
  { id: 'ex-39', name: 'Dumbbell Bench Press', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['bench', 'chest', 'press', 'dumbbell', 'compound'] },
  { id: 'ex-40', name: 'Dumbbell Fly', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['fly', 'chest', 'dumbbell', 'isolation'] },
  { id: 'ex-41', name: 'Close-Grip Bench Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['bench', 'chest', 'triceps', 'close grip', 'barbell', 'compound'] },
  { id: 'ex-42', name: 'Machine Chest Press', muscleGroup: MuscleGroup.Chest, equipment: 'Machine', tags: ['chest press', 'machine', 'compound'] },
  { id: 'ex-43', name: 'Incline Machine Press', muscleGroup: MuscleGroup.Chest, equipment: 'Machine', tags: ['incline', 'chest', 'machine', 'compound'] },
  { id: 'ex-44', name: 'Pec Deck', muscleGroup: MuscleGroup.Chest, equipment: 'Machine', tags: ['pec deck', 'chest', 'fly', 'machine', 'isolation'] },
  { id: 'ex-45', name: 'Low Cable Fly', muscleGroup: MuscleGroup.Chest, equipment: 'Cable', tags: ['fly', 'chest', 'cable', 'upper chest', 'isolation'] },
  { id: 'ex-46', name: 'Decline Barbell Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['decline', 'chest', 'press', 'lower chest', 'barbell'] },
  { id: 'ex-47', name: 'Decline Dumbbell Press', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['decline', 'chest', 'press', 'lower chest', 'dumbbell'] },
  { id: 'ex-48', name: 'Landmine Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['landmine', 'chest', 'press', 'barbell', 'compound'] },
  { id: 'ex-49', name: 'Push Ups', muscleGroup: MuscleGroup.Chest, equipment: 'Bodyweight', tags: ['push up', 'chest', 'bodyweight', 'compound'] },
  { id: 'ex-50', name: 'Incline Cable Fly', muscleGroup: MuscleGroup.Chest, equipment: 'Cable', tags: ['incline', 'fly', 'chest', 'cable', 'isolation'] },
  { id: 'ex-51', name: 'Svend Press', muscleGroup: MuscleGroup.Chest, equipment: 'Dumbbell', tags: ['svend', 'chest', 'squeeze', 'dumbbell', 'isolation'] },
  { id: 'ex-52', name: 'Floor Press', muscleGroup: MuscleGroup.Chest, equipment: 'Barbell', tags: ['floor press', 'chest', 'triceps', 'barbell', 'compound'] },
  { id: 'ex-53', name: 'Cable Crossover', muscleGroup: MuscleGroup.Chest, equipment: 'Cable', tags: ['crossover', 'chest', 'cable', 'isolation'] },

  // ── BACK (20) ──
  { id: 'ex-3', name: 'Deadlift', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['deadlift', 'back', 'posterior chain', 'compound', 'barbell', 'pull'] },
  { id: 'ex-5', name: 'Barbell Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['row', 'back', 'barbell row', 'bent over row', 'lats', 'compound'] },
  { id: 'ex-6', name: 'Pull Ups', muscleGroup: MuscleGroup.Back, equipment: 'Bodyweight', tags: ['pull up', 'chin up', 'back', 'lats', 'bodyweight', 'upper body'] },
  { id: 'ex-14', name: 'Lat Pulldown', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['lat pulldown', 'lats', 'back', 'cable', 'pulldown'] },
  { id: 'ex-22', name: 'Seated Cable Row', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['cable row', 'back', 'lats', 'rhomboids', 'seated row'] },
  { id: 'ex-54', name: 'Chin Ups', muscleGroup: MuscleGroup.Back, equipment: 'Bodyweight', tags: ['chin up', 'back', 'biceps', 'bodyweight', 'compound'] },
  { id: 'ex-55', name: 'T-Bar Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['t-bar', 'row', 'back', 'barbell', 'compound'] },
  { id: 'ex-56', name: 'Single-Arm Dumbbell Row', muscleGroup: MuscleGroup.Back, equipment: 'Dumbbell', tags: ['row', 'back', 'dumbbell', 'unilateral'] },
  { id: 'ex-57', name: 'Chest-Supported Row', muscleGroup: MuscleGroup.Back, equipment: 'Dumbbell', tags: ['row', 'back', 'chest supported', 'dumbbell', 'isolation'] },
  { id: 'ex-58', name: 'Pendlay Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['row', 'back', 'pendlay', 'barbell', 'explosive', 'compound'] },
  { id: 'ex-59', name: 'Wide-Grip Lat Pulldown', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['lat pulldown', 'wide grip', 'back', 'cable'] },
  { id: 'ex-60', name: 'Close-Grip Lat Pulldown', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['lat pulldown', 'close grip', 'back', 'cable'] },
  { id: 'ex-61', name: 'Straight-Arm Pulldown', muscleGroup: MuscleGroup.Back, equipment: 'Cable', tags: ['pulldown', 'lats', 'cable', 'isolation'] },
  { id: 'ex-62', name: 'Machine Row', muscleGroup: MuscleGroup.Back, equipment: 'Machine', tags: ['row', 'back', 'machine', 'compound'] },
  { id: 'ex-63', name: 'Meadows Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['row', 'back', 'landmine', 'barbell', 'unilateral'] },
  { id: 'ex-64', name: 'Dumbbell Pullover', muscleGroup: MuscleGroup.Back, equipment: 'Dumbbell', tags: ['pullover', 'lats', 'chest', 'dumbbell'] },
  { id: 'ex-65', name: 'Inverted Row', muscleGroup: MuscleGroup.Back, equipment: 'Bodyweight', tags: ['row', 'back', 'bodyweight', 'compound'] },
  { id: 'ex-66', name: 'Rack Pull', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['rack pull', 'back', 'traps', 'barbell', 'compound'] },
  { id: 'ex-67', name: 'Cable Face Pull', muscleGroup: MuscleGroup.Shoulders, equipment: 'Cable', tags: ['face pull', 'rear delt', 'shoulders', 'cable'] },
  { id: 'ex-68', name: 'Seal Row', muscleGroup: MuscleGroup.Back, equipment: 'Barbell', tags: ['row', 'back', 'seal row', 'barbell', 'strict'] },

  // ── SHOULDERS (20) ──
  { id: 'ex-4', name: 'Overhead Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['ohp', 'shoulders', 'press', 'military press', 'barbell', 'deltoids'] },
  { id: 'ex-11', name: 'Lateral Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['lateral raise', 'side raise', 'shoulders', 'deltoids', 'isolation', 'dumbbell'] },
  { id: 'ex-18', name: 'Face Pull', muscleGroup: MuscleGroup.Shoulders, equipment: 'Cable', tags: ['face pull', 'rear delt', 'shoulders', 'cable', 'rotator cuff'] },
  { id: 'ex-69', name: 'Dumbbell Shoulder Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['shoulder press', 'deltoids', 'dumbbell', 'compound'] },
  { id: 'ex-70', name: 'Arnold Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['arnold press', 'shoulders', 'deltoids', 'dumbbell', 'compound'] },
  { id: 'ex-71', name: 'Cable Lateral Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Cable', tags: ['lateral raise', 'side delt', 'cable', 'isolation'] },
  { id: 'ex-72', name: 'Rear Delt Fly', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['rear delt', 'fly', 'shoulders', 'dumbbell', 'isolation'] },
  { id: 'ex-73', name: 'Machine Shoulder Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Machine', tags: ['shoulder press', 'machine', 'compound'] },
  { id: 'ex-74', name: 'Upright Row', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['upright row', 'shoulders', 'traps', 'barbell'] },
  { id: 'ex-75', name: 'Cable Rear Delt Fly', muscleGroup: MuscleGroup.Shoulders, equipment: 'Cable', tags: ['rear delt', 'fly', 'cable', 'isolation'] },
  { id: 'ex-76', name: 'Reverse Pec Deck', muscleGroup: MuscleGroup.Shoulders, equipment: 'Machine', tags: ['rear delt', 'reverse fly', 'machine', 'isolation'] },
  { id: 'ex-77', name: 'Barbell Front Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['front raise', 'front delt', 'barbell', 'isolation'] },
  { id: 'ex-78', name: 'Dumbbell Front Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['front raise', 'front delt', 'dumbbell', 'isolation'] },
  { id: 'ex-79', name: 'Lu Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['lu raise', 'lateral raise', 'shoulders', 'dumbbell'] },
  { id: 'ex-80', name: 'Seated Behind-Neck Press', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['behind neck', 'press', 'shoulders', 'barbell'] },
  { id: 'ex-81', name: 'Landmine Lateral Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['lateral raise', 'landmine', 'shoulders', 'barbell'] },
  { id: 'ex-82', name: 'Band Pull-Apart', muscleGroup: MuscleGroup.Shoulders, equipment: 'Bodyweight', tags: ['band', 'rear delt', 'shoulders', 'bodyweight'] },
  { id: 'ex-83', name: 'Machine Lateral Raise', muscleGroup: MuscleGroup.Shoulders, equipment: 'Machine', tags: ['lateral raise', 'side delt', 'machine', 'isolation'] },
  { id: 'ex-84', name: 'Dumbbell Shrug', muscleGroup: MuscleGroup.Shoulders, equipment: 'Dumbbell', tags: ['shrug', 'traps', 'shoulders', 'dumbbell'] },
  { id: 'ex-85', name: 'Barbell Shrug', muscleGroup: MuscleGroup.Shoulders, equipment: 'Barbell', tags: ['shrug', 'traps', 'shoulders', 'barbell'] },

  // ── BICEPS (12) ──
  { id: 'ex-7', name: 'Dumbbell Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['curl', 'biceps', 'dumbbell', 'isolation'] },
  { id: 'ex-20', name: 'Hammer Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['hammer curl', 'biceps', 'brachialis', 'forearms', 'dumbbell'] },
  { id: 'ex-86', name: 'Barbell Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Barbell', tags: ['curl', 'biceps', 'barbell', 'compound'] },
  { id: 'ex-87', name: 'Preacher Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['preacher', 'curl', 'biceps', 'dumbbell', 'isolation'] },
  { id: 'ex-88', name: 'Cable Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Cable', tags: ['curl', 'biceps', 'cable', 'isolation'] },
  { id: 'ex-89', name: 'Incline Dumbbell Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['incline', 'curl', 'biceps', 'dumbbell', 'stretch'] },
  { id: 'ex-90', name: 'Concentration Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['concentration', 'curl', 'biceps', 'dumbbell', 'isolation'] },
  { id: 'ex-91', name: 'EZ-Bar Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Barbell', tags: ['ez bar', 'curl', 'biceps', 'barbell'] },
  { id: 'ex-96', name: 'Reverse Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Barbell', tags: ['reverse curl', 'forearms', 'brachioradialis', 'barbell'] },
  { id: 'ex-97', name: 'Wrist Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Barbell', tags: ['wrist curl', 'forearms', 'barbell', 'isolation'] },
  { id: 'ex-98', name: 'Machine Preacher Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Machine', tags: ['preacher', 'curl', 'biceps', 'machine'] },
  { id: 'ex-100', name: 'Spider Curl', muscleGroup: MuscleGroup.Biceps, equipment: 'Dumbbell', tags: ['spider', 'curl', 'biceps', 'dumbbell', 'isolation'] },

  // ── TRICEPS (8) ──
  { id: 'ex-8', name: 'Tricep Pushdown', muscleGroup: MuscleGroup.Triceps, equipment: 'Cable', tags: ['triceps', 'pushdown', 'cable', 'isolation'] },
  { id: 'ex-23', name: 'Skull Crusher', muscleGroup: MuscleGroup.Triceps, equipment: 'Barbell', tags: ['skull crusher', 'triceps', 'lying extension', 'barbell'] },
  { id: 'ex-92', name: 'Overhead Tricep Extension', muscleGroup: MuscleGroup.Triceps, equipment: 'Dumbbell', tags: ['triceps', 'overhead', 'extension', 'dumbbell'] },
  { id: 'ex-93', name: 'Cable Overhead Extension', muscleGroup: MuscleGroup.Triceps, equipment: 'Cable', tags: ['triceps', 'overhead', 'extension', 'cable'] },
  { id: 'ex-94', name: 'Tricep Kickback', muscleGroup: MuscleGroup.Triceps, equipment: 'Dumbbell', tags: ['triceps', 'kickback', 'dumbbell', 'isolation'] },
  { id: 'ex-95', name: 'Close-Grip Push Up', muscleGroup: MuscleGroup.Triceps, equipment: 'Bodyweight', tags: ['triceps', 'push up', 'bodyweight', 'compound'] },
  { id: 'ex-99', name: 'Dip Machine', muscleGroup: MuscleGroup.Triceps, equipment: 'Machine', tags: ['dips', 'triceps', 'machine', 'compound'] },
  { id: 'ex-101', name: 'JM Press', muscleGroup: MuscleGroup.Triceps, equipment: 'Barbell', tags: ['jm press', 'triceps', 'barbell', 'compound'] },

  // ── CORE (20) ──
  { id: 'ex-17', name: 'Plank', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['plank', 'core', 'abs', 'bodyweight', 'isometric'] },
  { id: 'ex-102', name: 'Hanging Leg Raise', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['hanging', 'leg raise', 'abs', 'lower abs', 'bodyweight'] },
  { id: 'ex-103', name: 'Cable Crunch', muscleGroup: MuscleGroup.Core, equipment: 'Cable', tags: ['crunch', 'abs', 'cable', 'isolation'] },
  { id: 'ex-104', name: 'Ab Wheel Rollout', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['ab wheel', 'rollout', 'core', 'bodyweight'] },
  { id: 'ex-105', name: 'Russian Twist', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['russian twist', 'obliques', 'core', 'bodyweight'] },
  { id: 'ex-106', name: 'Bicycle Crunch', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['bicycle', 'crunch', 'obliques', 'abs', 'bodyweight'] },
  { id: 'ex-107', name: 'Cable Woodchop', muscleGroup: MuscleGroup.Core, equipment: 'Cable', tags: ['woodchop', 'obliques', 'cable', 'rotation'] },
  { id: 'ex-108', name: 'Dead Bug', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['dead bug', 'core', 'stability', 'bodyweight'] },
  { id: 'ex-109', name: 'Pallof Press', muscleGroup: MuscleGroup.Core, equipment: 'Cable', tags: ['pallof', 'anti-rotation', 'core', 'cable'] },
  { id: 'ex-110', name: 'Side Plank', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['plank', 'obliques', 'core', 'bodyweight', 'isometric'] },
  { id: 'ex-111', name: 'Decline Sit-Up', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['sit-up', 'decline', 'abs', 'bodyweight'] },
  { id: 'ex-112', name: 'V-Up', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['v-up', 'abs', 'core', 'bodyweight'] },
  { id: 'ex-113', name: 'Machine Crunch', muscleGroup: MuscleGroup.Core, equipment: 'Machine', tags: ['crunch', 'abs', 'machine', 'isolation'] },
  { id: 'ex-114', name: 'Hanging Knee Raise', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['hanging', 'knee raise', 'abs', 'bodyweight'] },
  { id: 'ex-115', name: 'Dragon Flag', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['dragon flag', 'abs', 'core', 'bodyweight', 'advanced'] },
  { id: 'ex-116', name: 'Cable Pallof Hold', muscleGroup: MuscleGroup.Core, equipment: 'Cable', tags: ['pallof', 'hold', 'anti-rotation', 'cable', 'isometric'] },
  { id: 'ex-117', name: 'Barbell Rollout', muscleGroup: MuscleGroup.Core, equipment: 'Barbell', tags: ['rollout', 'abs', 'core', 'barbell'] },
  { id: 'ex-118', name: 'Suitcase Carry', muscleGroup: MuscleGroup.Core, equipment: 'Dumbbell', tags: ['carry', 'obliques', 'core', 'dumbbell', 'functional'] },
  { id: 'ex-119', name: 'Leg Raise', muscleGroup: MuscleGroup.Core, equipment: 'Bodyweight', tags: ['leg raise', 'abs', 'lower abs', 'bodyweight'] },
  { id: 'ex-120', name: 'Farmer Walk', muscleGroup: MuscleGroup.Core, equipment: 'Dumbbell', tags: ['farmer walk', 'carry', 'core', 'grip', 'dumbbell', 'functional'] },
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
