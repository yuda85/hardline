import { WorkoutPlan } from '../../core/models';

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

  export class Reset {
    static readonly type = '[Workout] Reset';
  }
}
