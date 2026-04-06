import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { Workout } from './workout.actions';
import { Energy } from '../energy/energy.actions';
import {
  WorkoutStateModel,
  WORKOUT_STATE_DEFAULTS,
  LastSessionData,
  ExerciseHistoryEntry,
} from './workout.model';
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
  static exerciseHistory(state: WorkoutStateModel): Record<string, ExerciseHistoryEntry[]> {
    return state.exerciseHistory;
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

  @Selector()
  static savedPlanId(state: WorkoutStateModel): string | null {
    return state.savedPlanId;
  }

  @Selector()
  static sessionHistory(state: WorkoutStateModel): WorkoutSession[] {
    return state.sessionHistory;
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
  completeSet(ctx: StateContext<WorkoutStateModel>, action: Workout.CompleteSet) {
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
    this.backupSessionToLocalStorage(updatedSession);

    // Update in-memory PRs so the celebration works and subsequent sets see the new bar
    const exercise = groups[action.groupIndex]?.exercises[action.exerciseIndex];
    if (exercise && action.weight > 0 && action.actualReps > 0 && action.actualReps <= 10) {
      const estimated = this.oneRMService.calculate(action.weight, action.actualReps);
      const currentPR = state.prs[exercise.exerciseId]?.oneRepMax ?? 0;
      if (estimated > currentPR) {
        ctx.patchState({
          prs: {
            ...state.prs,
            [exercise.exerciseId]: {
              ...state.prs[exercise.exerciseId],
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              oneRepMax: estimated,
              weight: action.weight,
              reps: action.actualReps,
              date: new Date(),
            } as PersonalRecord,
          },
        });
      }
    }
  }

  @Action(Workout.AddSet)
  addSet(ctx: StateContext<WorkoutStateModel>, action: Workout.AddSet) {
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
    this.backupSessionToLocalStorage(updatedSession);
  }

  @Action(Workout.RemoveSet)
  removeSet(ctx: StateContext<WorkoutStateModel>, action: Workout.RemoveSet) {
    const state = ctx.getState();
    if (!state.activeSession) return;

    const groups = state.activeSession.exerciseGroups.map((group, gi) => {
      if (gi !== action.groupIndex) return group;
      const exercises = group.exercises.map((ex, ei) => {
        if (ei !== action.exerciseIndex) return ex;
        if (ex.sets.length <= 1) return ex;
        return { ...ex, sets: ex.sets.filter((_, si) => si !== action.setIndex) };
      });
      return { ...group, exercises };
    });

    const updatedSession = { ...state.activeSession, exerciseGroups: groups };
    ctx.patchState({ activeSession: updatedSession });
    this.backupSessionToLocalStorage(updatedSession);
  }

  @Action(Workout.FinishSession)
  async finishSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (!session?.id) return;

    // Batch-write: save full exercise data + completedAt in one update
    await this.sessionRepo.update(session.id, {
      exerciseGroups: session.exerciseGroups,
      completedAt: new Date(),
    });

    // Check PRs for all completed exercises
    for (const group of session.exerciseGroups) {
      for (const ex of group.exercises) {
        for (const set of ex.sets) {
          if (set.completed && set.weight > 0 && set.actualReps > 0 && set.actualReps <= 10) {
            await this.oneRMService.checkAndUpdatePR(
              ex.exerciseId,
              ex.exerciseName,
              set.weight,
              set.actualReps,
            );
          }
        }
      }
    }

    this.clearSessionBackup();
    ctx.patchState({ activeSession: null, lastSessionData: {} });

    // Refresh PRs and trigger energy recalculation
    ctx.dispatch([new Workout.LoadPRs(), new Energy.RecalculateDailySummary()]);
  }

  @Action(Workout.AbandonSession)
  async abandonSession(ctx: StateContext<WorkoutStateModel>) {
    const session = ctx.getState().activeSession;
    if (session?.id) {
      await this.sessionRepo.remove(session.id);
    }
    this.clearSessionBackup();
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
    const prevSavedId = ctx.getState().savedPlanId;
    ctx.patchState({ generating: true, generatedPlan: null, generateError: null, savedPlanId: null });
    try {
      const plan = await this.builderService.buildPlan(action.input);

      // Delete previously auto-saved plan on regeneration
      if (prevSavedId) {
        await this.workoutRepo.remove(prevSavedId).catch(() => {});
      }

      // Auto-save the generated plan
      const uid = this.store.selectSnapshot(AuthState.uid);
      if (uid) {
        const { id, createdAt, updatedAt, ...planData } = plan;
        planData.userId = uid;
        const savedId = await this.workoutRepo.create(planData);
        ctx.patchState({
          generatedPlan: { ...plan, id: savedId },
          generating: false,
          savedPlanId: savedId,
        });
        ctx.dispatch(new Workout.FetchPlans());
      } else {
        ctx.patchState({ generatedPlan: plan, generating: false });
      }
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

  @Action(Workout.CheckActiveSession)
  checkActiveSession(ctx: StateContext<WorkoutStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    // Don't overwrite if we already have an active session in memory
    if (ctx.getState().activeSession) return;

    return this.sessionRepo.getActive(uid).pipe(
      take(1),
      tap(sessions => {
        if (sessions.length === 0) {
          this.clearSessionBackup();
          return;
        }

        const session = sessions[0];
        const startedAt = session.startedAt instanceof Date
          ? session.startedAt
          : (session.startedAt as any)?.toDate?.() ?? new Date(session.startedAt);
        const hoursSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);

        // Auto-expire sessions older than 4 hours
        if (hoursSinceStart > 4) {
          this.clearSessionBackup();
          return;
        }

        // Restore exercise data from localStorage backup if the Firestore stub has no data
        const backup = this.getSessionBackup();
        const hasExerciseData = session.exerciseGroups?.some(g =>
          g.exercises.some(ex => ex.sets.some(s => s.completed)),
        );

        const restoredSession = {
          ...session,
          startedAt,
          ...(backup && !hasExerciseData ? { exerciseGroups: backup.exerciseGroups } : {}),
        };

        ctx.patchState({ activeSession: restoredSession });

        // Preload data for resume
        ctx.dispatch([
          new Workout.LoadLastSession(session.planId, session.dayNumber),
          new Workout.LoadPRs(),
        ]);
      }),
    );
  }

  @Action(Workout.LoadExerciseHistory)
  loadExerciseHistory(ctx: StateContext<WorkoutStateModel>, action: Workout.LoadExerciseHistory) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.sessionRepo.getHistory(uid, 20).pipe(
      take(1),
      tap(sessions => {
        const entries: ExerciseHistoryEntry[] = [];

        for (const session of sessions) {
          if (!session.completedAt) continue;

          for (const group of session.exerciseGroups) {
            for (const ex of group.exercises) {
              if (ex.exerciseId !== action.exerciseId) continue;

              const completedSets = ex.sets
                .filter(s => s.completed && s.weight > 0)
                .map(s => ({ weight: s.weight, reps: s.actualReps }));

              if (completedSets.length === 0) continue;

              let best1RM = 0;
              for (const s of completedSets) {
                if (s.reps > 0 && s.reps <= 10) {
                  const est = this.oneRMService.calculate(s.weight, s.reps);
                  if (est > best1RM) best1RM = est;
                }
              }

              entries.push({
                date: session.startedAt,
                dayName: session.dayNumber ? `Day ${session.dayNumber}` : 'Workout',
                sets: completedSets,
                best1RM,
              });
            }
          }
        }

        ctx.patchState({
          exerciseHistory: {
            ...ctx.getState().exerciseHistory,
            [action.exerciseId]: entries,
          },
        });
      }),
    );
  }

  @Action(Workout.AddExerciseToSession)
  addExerciseToSession(
    ctx: StateContext<WorkoutStateModel>,
    action: Workout.AddExerciseToSession,
  ) {
    const state = ctx.getState();
    if (!state.activeSession) return;

    const newSets: SessionSet[] = Array.from({ length: action.exercise.sets }, () => ({
      targetReps: action.exercise.targetReps,
      actualReps: 0,
      weight: 0,
      completed: false,
    }));

    const newGroup: SessionExerciseGroup = {
      type: 'single',
      restSeconds: 90,
      exercises: [
        {
          exerciseId: action.exercise.exerciseId,
          exerciseName: action.exercise.exerciseName,
          sets: newSets,
        },
      ],
    };

    const updatedGroups = [...state.activeSession.exerciseGroups, newGroup];
    const updatedSession = { ...state.activeSession, exerciseGroups: updatedGroups };
    ctx.patchState({ activeSession: updatedSession });
    this.backupSessionToLocalStorage(updatedSession);
  }

  @Action(Workout.FetchSessionHistory)
  fetchSessionHistory(ctx: StateContext<WorkoutStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });
    return this.sessionRepo.getHistory(uid, 100).pipe(
      take(1),
      tap(sessions => {
        const completed = sessions.filter(s => s.completedAt != null);
        ctx.patchState({ sessionHistory: completed, loading: false });
      }),
    );
  }

  @Action(Workout.DeleteSession)
  async deleteSession(ctx: StateContext<WorkoutStateModel>, action: Workout.DeleteSession) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    // Find the session being deleted to know which exercises to recalc
    const session = ctx.getState().sessionHistory.find(s => s.id === action.sessionId);
    if (!session) return;

    // Collect exercise IDs from the deleted session
    const exerciseIds = new Set<string>();
    for (const group of session.exerciseGroups) {
      for (const ex of group.exercises) {
        exerciseIds.add(ex.exerciseId);
      }
    }

    // Delete the session
    await this.sessionRepo.remove(action.sessionId);

    // Recalculate PRs for affected exercises
    const remainingSessions = ctx.getState().sessionHistory.filter(s => s.id !== action.sessionId);

    for (const exerciseId of exerciseIds) {
      let bestWeight = 0;
      let bestReps = 0;
      let best1RM = 0;
      let bestName = '';

      for (const s of remainingSessions) {
        for (const group of s.exerciseGroups) {
          for (const ex of group.exercises) {
            if (ex.exerciseId !== exerciseId) continue;
            bestName = ex.exerciseName;
            for (const set of ex.sets) {
              if (!set.completed || set.weight <= 0 || set.actualReps <= 0 || set.actualReps > 10)
                continue;
              const orm = this.oneRMService.calculate(set.weight, set.actualReps);
              if (orm > best1RM) {
                best1RM = orm;
                bestWeight = set.weight;
                bestReps = set.actualReps;
              }
            }
          }
        }
      }

      // Get current PR for this exercise
      const currentPRs = await new Promise<PersonalRecord[]>(resolve => {
        this.prRepo
          .getByExercise(uid, exerciseId)
          .pipe(take(1))
          .subscribe(records => resolve(records));
      });

      const currentPR = currentPRs[0];

      if (best1RM === 0 && currentPR?.id) {
        // No more sets for this exercise — remove the PR
        await this.prRepo.remove(currentPR.id);
      } else if (currentPR?.id && best1RM < currentPR.oneRepMax) {
        // PR was held by the deleted session — update to new best
        await this.prRepo.update(currentPR.id, {
          oneRepMax: best1RM,
          weight: bestWeight,
          reps: bestReps,
          date: new Date(),
        });
      }
    }

    // Refresh history and PRs
    ctx.dispatch([new Workout.FetchSessionHistory(), new Workout.LoadPRs()]);
  }

  @Action(Workout.UpdateSessionSet)
  async updateSessionSet(ctx: StateContext<WorkoutStateModel>, action: Workout.UpdateSessionSet) {
    const state = ctx.getState();
    const session = state.sessionHistory.find(s => s.id === action.sessionId);
    if (!session) return;

    // Build updated groups
    const updatedGroups = session.exerciseGroups.map((group, gi) => {
      if (gi !== action.groupIndex) return group;
      const exercises = group.exercises.map((ex, ei) => {
        if (ei !== action.exerciseIndex) return ex;
        const sets = ex.sets.map((s, si) => {
          if (si !== action.setIndex) return s;
          return { ...s, weight: action.weight, actualReps: action.reps };
        });
        return { ...ex, sets };
      });
      return { ...group, exercises };
    });

    // Optimistic local update
    const updatedHistory = state.sessionHistory.map(s =>
      s.id === action.sessionId ? { ...s, exerciseGroups: updatedGroups } : s,
    );
    ctx.patchState({ sessionHistory: updatedHistory });

    // Persist
    await this.sessionRepo.update(action.sessionId, { exerciseGroups: updatedGroups });

    // Re-check PR for the affected exercise
    const exercise = updatedGroups[action.groupIndex]?.exercises[action.exerciseIndex];
    if (exercise && action.weight > 0 && action.reps > 0 && action.reps <= 10) {
      const result = await this.oneRMService.checkAndUpdatePR(
        exercise.exerciseId,
        exercise.exerciseName,
        action.weight,
        action.reps,
      );
      if (result.isNewPR) {
        ctx.dispatch(new Workout.LoadPRs());
      }
    }
  }

  @Action(Workout.Reset)
  reset(ctx: StateContext<WorkoutStateModel>) {
    this.clearSessionBackup();
    ctx.setState(WORKOUT_STATE_DEFAULTS);
  }

  // ── localStorage backup for crash recovery ──

  private static readonly SESSION_BACKUP_KEY = 'hardline_active_session';

  private backupSessionToLocalStorage(session: WorkoutSession): void {
    try {
      localStorage.setItem(WorkoutState.SESSION_BACKUP_KEY, JSON.stringify(session));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }

  private getSessionBackup(): WorkoutSession | null {
    try {
      const raw = localStorage.getItem(WorkoutState.SESSION_BACKUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private clearSessionBackup(): void {
    try {
      localStorage.removeItem(WorkoutState.SESSION_BACKUP_KEY);
    } catch {
      // silently ignore
    }
  }
}
