import type { ViewRange } from './weight.model';

export namespace Weight {
  export class LoadHistory {
    static readonly type = '[Weight] Load History';
  }

  export class LoadMore {
    static readonly type = '[Weight] Load More';
    constructor(public count: number = 30) {}
  }

  export class CheckToday {
    static readonly type = '[Weight] Check Today';
  }

  export class LogWeight {
    static readonly type = '[Weight] Log Weight';
    constructor(public weightKg: number, public notes?: string) {}
  }

  export class SetViewRange {
    static readonly type = '[Weight] Set View Range';
    constructor(public range: ViewRange) {}
  }

  export class DismissPrompt {
    static readonly type = '[Weight] Dismiss Prompt';
  }

  export class Reset {
    static readonly type = '[Weight] Reset';
  }
}
