export namespace Workout {
  export class StartSession {
    static readonly type = '[Workout] Start Session';
    constructor(public planId: string) {}
  }

  export class CompleteSet {
    static readonly type = '[Workout] Complete Set';
    constructor(
      public exerciseIndex: number,
      public setIndex: number,
      public reps: number,
      public weight: number,
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
