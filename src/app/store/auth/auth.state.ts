import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { tap, switchMap, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth.actions';
import { AuthStateModel, AUTH_STATE_DEFAULTS } from './auth.model';
import { AuthService } from '../../core/services/auth.service';
import { UserRepository } from '../../data/repositories/user.repository';
import { UserProfile, DEFAULT_USER_GOALS, DEFAULT_USER_PREFERENCES } from '../../core/models';

@State<AuthStateModel>({
  name: 'auth',
  defaults: AUTH_STATE_DEFAULTS,
})
@Injectable()
export class AuthState {
  private readonly authService = inject(AuthService);
  private readonly userRepo = inject(UserRepository);

  @Selector()
  static user(state: AuthStateModel): UserProfile | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.user !== null;
  }

  @Selector()
  static initialized(state: AuthStateModel): boolean {
    return state.initialized;
  }

  @Selector()
  static loading(state: AuthStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static uid(state: AuthStateModel): string | null {
    return state.user?.uid ?? null;
  }

  @Selector()
  static error(state: AuthStateModel): string | null {
    return state.error;
  }

  @Selector()
  static onboardingComplete(state: AuthStateModel): boolean {
    return state.user?.onboardingComplete ?? false;
  }

  @Action(Auth.Init)
  init(ctx: StateContext<AuthStateModel>) {
    return this.authService.authState$.pipe(
      take(1),
      switchMap(firebaseUser => {
        if (firebaseUser) {
          return this.userRepo.getByUid(firebaseUser.uid).pipe(
            take(1),
            tap(profile => {
              ctx.patchState({
                user: profile ?? null,
                initialized: true,
                loading: false,
              });
            }),
          );
        }
        ctx.patchState({ user: null, initialized: true, loading: false });
        return [];
      }),
    );
  }

  @Action(Auth.LoginWithGoogle)
  async loginWithGoogle(ctx: StateContext<AuthStateModel>) {
    ctx.patchState({ loading: true, error: null });
    try {
      await this.authService.signInWithGoogle();
      const firebaseUser = this.authService.currentUser;
      if (!firebaseUser) {
        throw new Error('Login succeeded but no user returned');
      }

      const existing = await firstValueFrom(
        this.userRepo.getByUid(firebaseUser.uid).pipe(take(1)),
      );

      const profile: UserProfile = existing
        ? {
            ...existing,
            displayName: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoURL: firebaseUser.photoURL,
          }
        : {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoURL: firebaseUser.photoURL,
            goals: DEFAULT_USER_GOALS,
            preferences: DEFAULT_USER_PREFERENCES,
            onboardingComplete: false,
          };

      await this.userRepo.createOrUpdate(profile);
      ctx.dispatch(new Auth.LoginSuccess(profile));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      ctx.dispatch(new Auth.LoginFailed(message));
    }
  }

  @Action(Auth.LoginSuccess)
  loginSuccess(ctx: StateContext<AuthStateModel>, action: Auth.LoginSuccess) {
    ctx.patchState({ user: action.user, loading: false, error: null, initialized: true });
  }

  @Action(Auth.LoginFailed)
  loginFailed(ctx: StateContext<AuthStateModel>, action: Auth.LoginFailed) {
    ctx.patchState({ loading: false, error: action.error });
  }

  @Action(Auth.Logout)
  async logout(ctx: StateContext<AuthStateModel>) {
    await this.authService.signOut();
    ctx.setState(AUTH_STATE_DEFAULTS);
  }

  @Action(Auth.SetUser)
  setUser(ctx: StateContext<AuthStateModel>, action: Auth.SetUser) {
    ctx.patchState({ user: action.user });
  }
}
