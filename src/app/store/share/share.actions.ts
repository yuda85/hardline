import { WorkoutPlan } from '../../core/models';

export namespace Share {
  export class CreateShare {
    static readonly type = '[Share] Create Share';
    constructor(public plan: WorkoutPlan) {}
  }

  export class LoadSharedPlan {
    static readonly type = '[Share] Load Shared Plan';
    constructor(public shareId: string) {}
  }

  export class CloneSharedPlan {
    static readonly type = '[Share] Clone Shared Plan';
  }

  export class Reset {
    static readonly type = '[Share] Reset';
  }
}
