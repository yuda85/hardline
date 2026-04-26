import { WorkoutState } from './workout.state';
import { Workout } from './workout.actions';
import { WorkoutStateModel, WORKOUT_STATE_DEFAULTS } from './workout.model';
import {
  WorkoutSession,
  SessionExerciseGroup,
  SessionSet,
} from '../../core/models';

function makeSet(opts: Partial<SessionSet> = {}): SessionSet {
  return { targetReps: 10, actualReps: 0, weight: 0, completed: false, ...opts };
}

function makeSession(groups: SessionExerciseGroup[]): WorkoutSession {
  return {
    id: 's1',
    userId: 'u1',
    planId: 'p1',
    dayNumber: 1,
    startedAt: new Date(),
    exerciseGroups: groups,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as WorkoutSession;
}

function fakeCtx(initial: WorkoutStateModel) {
  let state = initial;
  return {
    getState: () => state,
    patchState: (patch: Partial<WorkoutStateModel>) => {
      state = { ...state, ...patch };
    },
    get current() {
      return state;
    },
  };
}

function makeHandler() {
  // Bypass DI: create instance via prototype, stub backup to a no-op.
  const instance = Object.create(WorkoutState.prototype) as WorkoutState;
  // backupSessionToLocalStorage is private — stub it on the instance.
  (instance as unknown as { backupSessionToLocalStorage: (s: WorkoutSession) => void })
    .backupSessionToLocalStorage = () => {};
  return instance;
}

describe('WorkoutState.swapExercise', () => {
  it('replaces exerciseId and exerciseName, preserves sets array', () => {
    const session = makeSession([
      {
        type: 'single',
        restSeconds: 90,
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Barbell Back Squat',
            sets: [makeSet({ targetReps: 8 }), makeSet({ targetReps: 8 }), makeSet({ targetReps: 8 })],
          },
        ],
      },
    ]);
    const ctx = fakeCtx({ ...WORKOUT_STATE_DEFAULTS, activeSession: session });

    const handler = makeHandler();
    handler.swapExercise(ctx as any, new Workout.SwapExercise(0, 0, 'ex-25', 'Front Squat'));

    const updated = ctx.current.activeSession!;
    const swapped = updated.exerciseGroups[0].exercises[0];
    expect(swapped.exerciseId).toBe('ex-25');
    expect(swapped.exerciseName).toBe('Front Squat');
    expect(swapped.sets.length).toBe(3);
    expect(swapped.sets.every(s => s.targetReps === 8)).toBe(true);
    expect(swapped.sets.every(s => !s.completed)).toBe(true);
  });

  it('is a no-op when any set on the target exercise is completed', () => {
    const session = makeSession([
      {
        type: 'single',
        restSeconds: 90,
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: 'Barbell Back Squat',
            sets: [
              makeSet({ completed: true, weight: 100, actualReps: 8 }),
              makeSet(),
            ],
          },
        ],
      },
    ]);
    const ctx = fakeCtx({ ...WORKOUT_STATE_DEFAULTS, activeSession: session });

    const handler = makeHandler();
    handler.swapExercise(ctx as any, new Workout.SwapExercise(0, 0, 'ex-25', 'Front Squat'));

    const updated = ctx.current.activeSession!;
    expect(updated.exerciseGroups[0].exercises[0].exerciseId).toBe('ex-1');
    expect(updated.exerciseGroups[0].exercises[0].exerciseName).toBe('Barbell Back Squat');
  });

  it('is a no-op when activeSession is null', () => {
    const ctx = fakeCtx({ ...WORKOUT_STATE_DEFAULTS, activeSession: null });

    const handler = makeHandler();
    handler.swapExercise(ctx as any, new Workout.SwapExercise(0, 0, 'ex-25', 'Front Squat'));

    expect(ctx.current.activeSession).toBeNull();
  });

  it('does not mutate other exercises in the same group', () => {
    const session = makeSession([
      {
        type: 'superset',
        restSeconds: 60,
        exercises: [
          { exerciseId: 'ex-1', exerciseName: 'Squat', sets: [makeSet()] },
          { exerciseId: 'ex-2', exerciseName: 'Bench', sets: [makeSet()] },
        ],
      },
    ]);
    const ctx = fakeCtx({ ...WORKOUT_STATE_DEFAULTS, activeSession: session });

    const handler = makeHandler();
    handler.swapExercise(ctx as any, new Workout.SwapExercise(0, 1, 'ex-39', 'Dumbbell Bench Press'));

    const updated = ctx.current.activeSession!;
    expect(updated.exerciseGroups[0].exercises[0].exerciseId).toBe('ex-1');
    expect(updated.exerciseGroups[0].exercises[1].exerciseId).toBe('ex-39');
    expect(updated.exerciseGroups[0].exercises[1].exerciseName).toBe('Dumbbell Bench Press');
  });
});
