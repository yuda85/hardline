import { WorkoutDay, WorkoutPlan } from '../../core/models';
import {
  WorkoutBuilderInput,
  EquipmentType,
  DailyWorkoutResult,
} from '../../core/models/ai-workout.model';

export namespace Workout {
  export class FetchPlans {
    static readonly type = '[Workout] Fetch Plans';
  }

  export class SavePlan {
    static readonly type = '[Workout] Save Plan';
    constructor(public plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) {}
  }

  export class UpdatePlan {
    static readonly type = '[Workout] Update Plan';
    constructor(public planId: string, public changes: Partial<WorkoutPlan>) {}
  }

  export class DeletePlan {
    static readonly type = '[Workout] Delete Plan';
    constructor(public planId: string) {}
  }

  export class StartSession {
    static readonly type = '[Workout] Start Session';
    constructor(public planId: string, public dayNumber: number) {}
  }

  export class LoadLastSession {
    static readonly type = '[Workout] Load Last Session';
    constructor(public planId: string, public dayNumber: number) {}
  }

  export class LoadPRs {
    static readonly type = '[Workout] Load PRs';
  }

  export class CompleteSet {
    static readonly type = '[Workout] Complete Set';
    constructor(
      public groupIndex: number,
      public exerciseIndex: number,
      public setIndex: number,
      public actualReps: number,
      public weight: number,
    ) {}
  }

  export class AddSet {
    static readonly type = '[Workout] Add Set';
    constructor(
      public groupIndex: number,
      public exerciseIndex: number,
    ) {}
  }

  export class RemoveSet {
    static readonly type = '[Workout] Remove Set';
    constructor(
      public groupIndex: number,
      public exerciseIndex: number,
      public setIndex: number,
    ) {}
  }

  export class FinishSession {
    static readonly type = '[Workout] Finish Session';
  }

  export class AbandonSession {
    static readonly type = '[Workout] Abandon Session';
  }

  export class LoadPlan {
    static readonly type = '[Workout] Load Plan';
    constructor(public planId: string) {}
  }

  export class UpdatePlanDay {
    static readonly type = '[Workout] Update Plan Day';
    constructor(public planId: string, public dayNumber: number, public day: WorkoutDay) {}
  }

  export class LoadExerciseHistory {
    static readonly type = '[Workout] Load Exercise History';
    constructor(public exerciseId: string) {}
  }

  export class AddExerciseToSession {
    static readonly type = '[Workout] Add Exercise To Session';
    constructor(
      public exercise: {
        exerciseId: string;
        exerciseName: string;
        sets: number;
        targetReps: number;
      },
    ) {}
  }

  export class CheckActiveSession {
    static readonly type = '[Workout] Check Active Session';
  }

  export class Reset {
    static readonly type = '[Workout] Reset';
  }

  // ── AI Generation ──

  export class GeneratePlan {
    static readonly type = '[Workout] Generate Plan';
    constructor(public input: WorkoutBuilderInput) {}
  }

  export class GenerateDailyWorkout {
    static readonly type = '[Workout] Generate Daily Workout';
    constructor(
      public availableMinutes: number,
      public availableEquipment: EquipmentType[],
    ) {}
  }

  export class SaveGeneratedPlan {
    static readonly type = '[Workout] Save Generated Plan';
    constructor(public plan: WorkoutPlan) {}
  }

  export class StartGeneratedWorkout {
    static readonly type = '[Workout] Start Generated Workout';
    constructor(public workout: DailyWorkoutResult) {}
  }

  export class AddDayToActivePlan {
    static readonly type = '[Workout] Add Day To Active Plan';
    constructor(public day: WorkoutDay) {}
  }

  // ── Session History ──

  export class FetchSessionHistory {
    static readonly type = '[Workout] Fetch Session History';
  }

  export class DeleteSession {
    static readonly type = '[Workout] Delete Session';
    constructor(public sessionId: string) {}
  }

  export class UpdateSessionSet {
    static readonly type = '[Workout] Update Session Set';
    constructor(
      public sessionId: string,
      public groupIndex: number,
      public exerciseIndex: number,
      public setIndex: number,
      public weight: number,
      public reps: number,
    ) {}
  }
}
