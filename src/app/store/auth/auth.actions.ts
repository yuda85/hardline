import { UserProfile } from '../../core/models';

export namespace Auth {
  export class Init {
    static readonly type = '[Auth] Init';
  }

  export class LoginWithGoogle {
    static readonly type = '[Auth] Login With Google';
  }

  export class LoginSuccess {
    static readonly type = '[Auth] Login Success';
    constructor(public user: UserProfile) {}
  }

  export class LoginFailed {
    static readonly type = '[Auth] Login Failed';
    constructor(public error: string) {}
  }

  export class Logout {
    static readonly type = '[Auth] Logout';
  }

  export class SetUser {
    static readonly type = '[Auth] Set User';
    constructor(public user: UserProfile | null) {}
  }
}
