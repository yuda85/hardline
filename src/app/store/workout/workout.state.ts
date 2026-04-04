import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { Workout } from './workout.actions';
import { Energy } from '../energy/energy.actions';
import { WorkoutStateModel, WORKOUT_STATE_DEFAULTS, LastSessionData } from './workout.model';
import { WorkoutRepository } from '../../data/repositories/workout.repository';
import { SessionRepository } from '../../data/repositories/session.repository';
import { PRRepository } from '../../data/repositories/pr.repository';
import { OneRepMaxService } from '../../core/services/one-rep-max.service';
import { WorkoutBuilderService } from '../../core/services/workout-builder.service';
import { DailyWorkoutService } from '../../core/services/daily-workout.service';
import { AuthState } from '../auth/auth.state';
import { ProfileState } from '../profile/profile.state';
import {
  WorkoutPlan,
  WorkoutDay,
  WorkoutSession,
  SessionExerciseGroup,
  SessionExercise,
  SessionSet,
  PersonalRecord,
} from '../../core/models';
import { DailyWorkoutResult } from '../../core/models/ai-workout.model';

@State<WorkoutStateModel>({
  name: 'workout',
  defaults: WORKOUT_STATE_DEFAULTS,
})
@Injectable()
export class WorkoutState {
  private readonly workoutRepo = inject(WorkoutRepository);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly prRepo = inject(PRRepository);
  private readonly oneRMService = inject(OneRepMaxService);
  private readonly builderService = inject(WorkoutBuilderService);
  private readonly dailyService = inject(DailyWorkoutService);
  private readonly store = inject(Store);

  @Selector()
  static plans(state: WorkoutStateModel): WorkoutPlan[] {
    return state.plans;
  }

  @Selector()
  static activeSession(state: WorkoutStateModel): WorkoutSession | null {
    return state.activeSession;
  }

  @Selector()
  static activePlan(state: WorkoutStateModel): WorkoutPlan | null {
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

  @Selector()
  static lastSessionData(state: WorkoutStateModel): LastSessionData {
    return state.lastSessionData;
  }

  @Selector()
  static prs(state: WorkoutStateModel): Record<string, PersonalRecord> {
    return state.prs;
  }

  @Selector()
  static generatedPlan(state: WorkoutStateModel): WorkoutPlan | null {
    return state.generatedPlan;
  }

  @Selector()
  static dailyWorkout(state: WorkoutStateModel): DailyWorkoutResult | null {
    return state.dailyWorkout;
  }

  @Selector()
  static generating(state: WorkoutStateModel): boolean {
    return state.generating;
  }

  @Selector()
  static generateError(state: WorkoutStateModel): string | null {
    return state.generateError;
  }

  @Action(Workout.FetchPlans)
  fetchPlans(ctx: StateContext<WorkoutStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });
    return this.workoutRepo.getByUser(uid).pipe(
      take(1),
      tap(plans => ctx.patchState({ plans, loading: false })),
    );
  }

  @Action(Workout.SavePlan)
  async savePlan(ctx: StateContext<WorkoutStateModel>, action: Workout.SavePlan) {
    await this.workoutRepo.create(action.plan);
    ctx.dispatch(new Workout.FetchPlans());
  }

  @Action(Workout.UpdatePlan)
  async updatePlan(ctx: StateContext<WorkoutStateModel>, action: Workout.UpdatePlan) {
    await this.workoutRepo.update(action.planId, action.changes);
    ctx.dispatch(new Workout.FetchPlans());
  }

  @Action(Workout.DeletePlan)
  async deletePlan(ctx: StateContext<WorkoutStateModel>, action: Workout.DeletePlan) {
    await this.workoutRepo.remove(action.planId);
    ctx.dispatch(new Workout.FetchPlans());
  }

  @Action(Workout.LoadPlan)
  loadPlan(ctx: StateContext<WorkoutStateModel>, action: Workout.LoadPlan) {
    ctx.patchState({ loading: true });
    return this.workoutRepo.getById(action.planId).pipe(
      take(1),
      tap(plan => ctx.patchState({ activePlan: plan ?? null, loading: false })),
    );
  }

  @Action(Workout.LoadLastSession)
  loadLastSession(ctx: StateContext<WorkoutStateModel>, action: Workout.LoadLastSession) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.sessionRepo.getHistory(uid, 20).pipe(
      take(1),
      tap(sessions => {
        const match = sessions.find(
          s => s.planId === action.planId && s.dayNumber === action.dayNumber && s.completedAt,
        );
        if (!match) return;

        const data: LastSessionData = {};
        for (const group of match.exerciseGroups) {
          for (const ex of group.exercises) {
            data[ex.exerciseId] = ex.sets
              .filter(s => s.completed)
              .map(s => ({ weight: s.weight, reps: s.actualReps }));
          }
        }
        ctx.patchState({ lastSessionData: data });
      }),
    );
  }

  @Action(Workout.LoadPRs)
  loadPRs(ctx: StateContext<WorkoutStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.prRepo.getAllForUser(uid).pipe(
      take(1),
      tap(records => {
        const prs: Record<string, PersonalRecord> = {};
        for (const pr of records) {
          if (!prs[pr.exerciseId] || pr.oneRepMax > prs[pr.exerciseId].oneRepMax) {
            prs[pr.exerciseId] = pr;
          }
        }
        ctx.patchState({ prs });
      }),
    );
  }

  @Action(Workout.StartSession)
  async startSession(ctx: StateContext<WorkoutStateModel>, action: Workout.StartSession) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });

    // Load plan if not already loaded
    let plan = ctx.getState().activePlan;
    if (!plan || plan.id !== action.planId) {
      await new Promise<void>(resolve => {
        this.workoutRepo
          .getById(action.planId)
          .pipe(take(1))
          .subscribe(p => {
            ctx.patchState({ activePlan: p ?? null });
            resolve();
          });
      });
      plan = ctx.getState().activePlan;
    }

    if (!plan) {
      ctx.patchState({ loading: false });
      return;
    }

    const day = plan.days.find(d => d.dayNumber === action.dayNumber);
    if (!day) {
      ctx.patchState({ loading: false });
      return;
    }

    // Build session from day template
    const exerciseGroups: SessionExerciseGroup[] = day.exerciseGroups.map(group => ({
      type: group.type,
      restSeconds: group.restSeconds,
      exercises: group.exercises.map(
        (ex): SessionExercise => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(
            (s): SessionSet => ({
              targetReps: s.targetReps,
              actualReps: 0,
              weight: 0,
              completed: false,
            }),
          ),
        }),
      ),
    }));

    const session: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: uid,
      planId: action.planId,
      dayNumber: action.dayNumber,
      startedAt: new Date(),
      exerciseGroups,
    };

    const sessionId = await this.sessionRepo.create(session);

    ctx.patchState({
      activeSession: { ...session, id: sessionId } as WorkoutSession,
      loading: false,
    });

    // Load last session and PRs in parallel
    ctx.dispatch([
      new Workout.LoadLastSession(action.planId, action.dayNumber),
      new Workout.LoadPRs(),
    ]);
  }

  @Action(Workout.CompleteSet)
  async completeSet(ctx: StateContext<WorkoutStateModel>, action: Workout.CompleteSet) {
    const state = ctx.getState();
    if (!state.activeSession) return;

    const groups = state.activeSession.exerciseGroups.map((group, gi) => {
      if (gi !== action.groupIndex) return group;
      const exercises = group.exercises.map((ex, ei) => {
        if (ei !== action.exerciseIndex) return ex;
        const sets = ex.sets.map((s, si) => {
          if (si !== action.setIndex) return s;
          return {
            ...s,
            actualReps: action.actualReps,
            weight: action.weight,
            completed: true,
            completedAt: new Date(),
          };
        });
        return { ...ex, sets };
      });
      return { ...group, exercises };
    });

    const updatedSession = { ...state.activeSession, exerciseGroups: groups };
    ctx.patchState({ activeSession: updatedSession });

    if (state.activeSession.id) {
      await this.sessionRepo.update(state.activeSession.id, { exerciseGroups: groups });
    }

    // Check for PR
    const exercise = groups[action.groupIndex]?.exercises[action.exerciseIndex];
    if (exercise && action.weight > 0 && action.actualReps > 0 && action.actualReps <= 10) {
      const result = await this.oneRMService.checkAndUpdatePR(
        exercise.exerciseId,
        exercise.exerciseName,
        action.weight,
        action.actualReps,
      );
      if (result.isNewPR) {
        ctx.dispatch(new Workout.LoadPRs());
      }
    }
  }

  @Action(Workout.AddSet)
  async addSet(ctx: StateContext<WorkoutStateModel>, action: Workout.AddSet) {
    const state = ctx.getState();
    if (!state.activeSession) return;

    const groups = state.activeSession.exerciseGroups.map((group, gi) => {
      if (gi !== action.groupIndex) return group;
      const exercises = group.exercises.map((ex, ei) => {
        if (ei !== action.exerciseIndex) return ex;
        const newSet: SessionSet = {
          targetReps: ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].targetReps : 10,
          actualReps: 0,
          weight: 0,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      });
      return { ...group, exercises };
    });

    const updatedSession = { ...state.activeSession, exerciseGroups: groups };
    ctx.patchState({ activeSession: updatedSession });

    if (state.activeSession.id) {
      await this.sessionRepo.update(state.activeSession.id, { exerciseGroups: groups });
    }
  }

  @Action(Workout.FinishSession)
  async finishSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (!session?.id) return;

    await this.sessionRepo.update(session.id, { completedAt: new Date() });
    ctx.patchState({ activeSession: null, lastSessionData: {} });

    // Trigger energy balance recalculation to include this workout's burn
    ctx.dispatch(new Energy.RecalculateDailySummary());
  }

  @Action(Workout.AbandonSession)
  async abandonSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (session?.id) {
      await this.sessionRepo.remove(session.id);
    }
    ctx.patchState({ activeSession: null, lastSessionData: {} });
  }

  @Action(Workout.UpdatePlanDay)
  async updatePlanDay(ctx: StateContext<WorkoutStateModel>, action: Workout.UpdatePlanDay) {
    const state = ctx.getState();
    const plan = state.activePlan;
    if (!plan) return;

    const updatedDays = plan.days.map(d =>
      d.dayNumber === action.dayNumber ? { ...action.day, dayNumber: action.dayNumber } : d,
    );

    // Update local state immediately for responsiveness
    ctx.patchState({
      activePlan: { ...plan, days: updatedDays },
    });

    // Persist to Firebase
    await this.workoutRepo.update(action.planId, { days: updatedDays });
    ctx.dispatch(new Workout.FetchPlans());
  }

  // ── AI Generation Handlers ──

  @Action(Workout.GeneratePlan)
  async generatePlan(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.GeneratePlan,
  ) {
    ctx.patchState({ generating: true, generatedPlan: null, generateError: null });
    try {
      const plan = await this.builderService.buildPlan(action.input);
      ctx.patchState({ generatedPlan: plan, generating: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate workout plan';
      console.error('GeneratePlan error:', e);
      ctx.patchState({ generating: false, generateError: msg });
    }
  }

  @Action(Workout.SaveGeneratedPlan)
  async saveGeneratedPlan(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.SaveGeneratedPlan,
  ) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;
    const { id, createdAt, updatedAt, ...planData } = action.plan;
    planData.userId = uid;
    ctx.dispatch(new Workout.SavePlan(planData));
    ctx.patchState({ generatedPlan: null, dailyWorkout: null });
  }

  @Action(Workout.GenerateDailyWorkout)
  async generateDailyWorkout(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.GenerateDailyWorkout,
  ) {
    ctx.patchState({ generating: true, dailyWorkout: null, generateError: null });
    try {
      const result = await this.dailyService.getSmartWorkout(
        action.availableMinutes,
        action.availableEquipment,
      );
      ctx.patchState({ dailyWorkout: result, generating: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate smart workout';
      console.error('GenerateDailyWorkout error:', e);
      ctx.patchState({ generating: false, generateError: msg });
    }
  }

  @Action(Workout.StartGeneratedWorkout)
  async startGeneratedWorkout(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.StartGeneratedWorkout,
  ) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const planData = this.dailyService.toAdHocPlan(action.workout, uid);
    const planId = await this.workoutRepo.create(planData);
    ctx.patchState({ dailyWorkout: null });
    ctx.dispatch(new Workout.StartSession(planId, 1));
  }

  @Action(Workout.AddDayToActivePlan)
  async addDayToActivePlan(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.AddDayToActivePlan,
  ) {
    const activePlanId = this.store.selectSnapshot(ProfileState.activePlanId);
    if (!activePlanId) return;

    const plans = ctx.getState().plans;
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan) return;

    const newDayNumber = plan.days.length + 1;
    const newDay: WorkoutDay = { ...action.day, dayNumber: newDayNumber };
    const updatedDays = [...plan.days, newDay];

    await this.workoutRepo.update(activePlanId, { days: updatedDays });
    ctx.patchState({ dailyWorkout: null });
    ctx.dispatch(new Workout.FetchPlans());
  }

  @Action(Workout.Reset)
  reset(ctx: StateContext<WorkoutStateModel>) {
    ctx.setState(WORKOUT_STATE_DEFAULTS);
  }
}
