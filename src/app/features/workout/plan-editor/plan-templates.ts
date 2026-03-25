import { WorkoutDay } from '../../../core/models';
import { SAMPLE_PLANS_DAYS, EXERCISES } from '../exercise-data';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  days: WorkoutDay[];
}

function single(exId: string, sets: number[], rest: number): import('../../../core/models').ExerciseGroup {
  const exercise = EXERCISES.find(e => e.id === exId)!;
  return {
    type: 'single',
    exercises: [{
      exerciseId: exId,
      exerciseName: exercise.name,
      sets: sets.map(r => ({ targetReps: r })),
    }],
    restSeconds: rest,
  };
}

const FULL_BODY_DAYS: WorkoutDay[] = [
  {
    dayNumber: 1,
    name: 'Full Body A',
    exerciseGroups: [
      single('ex-1', [5, 5, 5], 180),
      single('ex-2', [5, 5, 5], 150),
      single('ex-5', [8, 8, 8], 90),
      single('ex-9', [10, 10, 10], 90),
      single('ex-17', [60, 60], 60),
    ],
  },
  {
    dayNumber: 2,
    name: 'Full Body B',
    exerciseGroups: [
      single('ex-3', [5, 5, 5], 180),
      single('ex-4', [8, 8, 6], 120),
      single('ex-6', [8, 8, 6], 90),
      single('ex-10', [10, 10, 8], 90),
      single('ex-7', [12, 10, 10], 60),
    ],
  },
  {
    dayNumber: 3,
    name: 'Full Body C',
    exerciseGroups: [
      single('ex-1', [8, 8, 6], 150),
      single('ex-12', [10, 10, 8], 90),
      single('ex-14', [10, 10, 10], 60),
      single('ex-24', [12, 10, 10], 90),
      single('ex-11', [15, 15, 12], 60),
    ],
  },
];

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    icon: 'draft',
    days: [{ dayNumber: 1, name: 'Day 1', exerciseGroups: [] }],
  },
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    description: '3-day split with supersets',
    icon: 'exercise',
    days: SAMPLE_PLANS_DAYS[0].days,
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: '4-day strength + hypertrophy',
    icon: 'swap_vert',
    days: SAMPLE_PLANS_DAYS[1].days,
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: '3-day compound-focused program',
    icon: 'person',
    days: FULL_BODY_DAYS,
  },
];
