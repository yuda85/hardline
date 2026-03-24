import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { Workout } from './workout.actions';
import { WorkoutStateModel, WORKOUT_STATE_DEFAULTS } from './workout.model';
import { WorkoutRepository } from '../../data/repositories/workout.repository';
import { SessionRepository } from '../../data/repositories/session.repository';
import { AuthState } from '../auth/auth.state';
import { WorkoutSession, WorkoutSessionExercise, WorkoutSet } from '../../core/models';

@State<WorkoutStateModel>({
  name: 'workout',
  defaults: WORKOUT_STATE_DEFAULTS,
})
@Injectable()
export class WorkoutState {
  private readonly workoutRepo = inject(WorkoutRepository);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly store = inject(Store);

  @Selector()
  static activeSession(state: WorkoutStateModel): WorkoutSession | null {
    return state.activeSession;
  }

  @Selector()
  static activePlan(state: WorkoutStateModel) {
    return state.activePlan;
  }

  @Selector()
  static isInSession(state: WorkoutStateModel): boolean {
    return state.activeSession !== null;
  }

  @Selector()
  static loading(state: WorkoutStateModel): boolean {
    return state.loading;
  }

  @Action(Workout.LoadPlan)
  loadPlan(ctx: StateContext<WorkoutStateModel>, action: Workout.LoadPlan) {
    ctx.patchState({ loading: true });
    return this.workoutRepo.getById(action.planId).pipe(
      take(1),
      tap(plan => {
        ctx.patchState({ activePlan: plan ?? null, loading: false });
      }),
    );
  }

  @Action(Workout.StartSession)
  async startSession(ctx: StateContext<WorkoutStateModel>, action: Workout.StartSession) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });

    // Load the plan first
    const plan = ctx.getState().activePlan;
    if (!plan) {
      await new Promise<void>(resolve => {
        this.workoutRepo
          .getById(action.planId)
          .pipe(take(1))
          .subscribe(p => {
            ctx.patchState({ activePlan: p ?? null });
            resolve();
          });
      });
    }

    const currentPlan = ctx.getState().activePlan;
    if (!currentPlan) {
      ctx.patchState({ loading: false });
      return;
    }

    const exercises: WorkoutSessionExercise[] = currentPlan.exercises.map(e => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      sets: Array.from({ length: e.sets }, (): WorkoutSet => ({
        reps: 0,
        weight: 0,
        completed: false,
      })),
    }));

    const session: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: uid,
      planId: action.planId,
      startedAt: new Date(),
      exercises,
    };

    const sessionId = await this.sessionRepo.create(session);
    ctx.patchState({
      activeSession: { ...session, id: sessionId } as WorkoutSession,
      loading: false,
    });
  }

  @Action(Workout.CompleteSet)
  async completeSet(ctx: StateContext<WorkoutStateModel>, action: Workout.CompleteSet) {
    const state = ctx.getState();
    if (!state.activeSession) return;

    const exercises = state.activeSession.exercises.map((ex, ei) => {
      if (ei !== action.exerciseIndex) return ex;
      const sets = ex.sets.map((s, si) => {
        if (si !== action.setIndex) return s;
        return { reps: action.reps, weight: action.weight, completed: true, completedAt: new Date() };
      });
      return { ...ex, sets };
    });

    const updatedSession = { ...state.activeSession, exercises };
    ctx.patchState({ activeSession: updatedSession });

    if (state.activeSession.id) {
      await this.sessionRepo.update(state.activeSession.id, { exercises });
    }
  }

  @Action(Workout.FinishSession)
  async finishSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (!session?.id) return;

    await this.sessionRepo.update(session.id, { completedAt: new Date() });
    ctx.patchState({ activeSession: null });
  }

  @Action(Workout.AbandonSession)
  async abandonSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (session?.id) {
      await this.sessionRepo.remove(session.id);
    }
    ctx.patchState({ activeSession: null });
  }

  @Action(Workout.Reset)
  reset(ctx: StateContext<WorkoutStateModel>) {
    ctx.setState(WORKOUT_STATE_DEFAULTS);
  }
}
