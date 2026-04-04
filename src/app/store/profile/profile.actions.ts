import { UserGoals, UserPreferences } from '../../core/models';

export namespace Profile {
  export class FetchGoals {
    static readonly type = '[Profile] Fetch Goals';
  }

  export class UpdateGoals {
    static readonly type = '[Profile] Update Goals';
    constructor(public goals: Partial<UserGoals>) {}
  }

  export class UpdatePreferences {
    static readonly type = '[Profile] Update Preferences';
    constructor(public preferences: Partial<UserPreferences>) {}
  }

  export class CompleteOnboarding {
    static readonly type = '[Profile] Complete Onboarding';
    constructor(
      public goals: UserGoals,
      public preferences: UserPreferences,
    ) {}
  }

  export class SetActivePlan {
    static readonly type = '[Profile] Set Active Plan';
    constructor(public planId: string | null) {}
  }

  export class Reset {
    static readonly type = '[Profile] Reset';
  }
}
