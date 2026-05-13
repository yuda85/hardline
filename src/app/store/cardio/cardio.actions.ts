import { CardioActivityType } from '../../core/models/cardio-session.model';
import { TrackerTick } from '../../features/cardio/services/geolocation-tracker.service';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Cardio {
  export class StartSession {
    static readonly type = '[Cardio] Start Session';
    constructor(public activityType: CardioActivityType) {}
  }

  export class CheckActiveSession {
    static readonly type = '[Cardio] Check Active Session';
  }

  export class PauseSession {
    static readonly type = '[Cardio] Pause Session';
  }

  export class ResumeSession {
    static readonly type = '[Cardio] Resume Session';
  }

  export class PointRecorded {
    static readonly type = '[Cardio] Point Recorded';
    constructor(public tick: TrackerTick) {}
  }

  export class TickTime {
    static readonly type = '[Cardio] Tick Time';
  }

  export class AutoPaused {
    static readonly type = '[Cardio] Auto Paused';
  }

  export class AutoResumed {
    static readonly type = '[Cardio] Auto Resumed';
  }

  export class WeakSignalChanged {
    static readonly type = '[Cardio] Weak Signal Changed';
    constructor(public weakSignal: boolean) {}
  }

  export class FinishSession {
    static readonly type = '[Cardio] Finish Session';
    constructor(public overrides?: { caloriesBurned?: number }) {}
  }

  export class DiscardSession {
    static readonly type = '[Cardio] Discard Session';
  }

  export class LoadSessions {
    static readonly type = '[Cardio] Load Sessions';
    constructor(public limit = 30) {}
  }

  export class LoadSessionDetail {
    static readonly type = '[Cardio] Load Session Detail';
    constructor(public id: string) {}
  }

  export class DeleteSession {
    static readonly type = '[Cardio] Delete Session';
    constructor(public id: string) {}
  }
}
