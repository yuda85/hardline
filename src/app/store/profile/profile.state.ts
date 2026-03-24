import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take } from 'rxjs/operators';
import { Profile } from './profile.actions';
import { ProfileStateModel, PROFILE_STATE_DEFAULTS } from './profile.model';
import { UserRepository } from '../../data/repositories/user.repository';
import { AuthState } from '../auth/auth.state';
import { UserGoals, UserPreferences } from '../../core/models';

@State<ProfileStateModel>({
  name: 'profile',
  defaults: PROFILE_STATE_DEFAULTS,
})
@Injectable()
export class ProfileState {
  private readonly userRepo = inject(UserRepository);
  private readonly store = inject(Store);

  @Selector()
  static goals(state: ProfileStateModel): UserGoals | null {
    return state.goals;
  }

  @Selector()
  static preferences(state: ProfileStateModel): UserPreferences | null {
    return state.preferences;
  }

  @Selector()
  static dailyCalorieTarget(state: ProfileStateModel): number {
    return state.goals?.dailyCalories ?? 2000;
  }

  @Selector()
  static dailyProteinTarget(state: ProfileStateModel): number {
    return state.goals?.dailyProtein ?? 150;
  }

  @Selector()
  static loading(state: ProfileStateModel): boolean {
    return state.loading;
  }

  @Action(Profile.FetchGoals)
  fetchGoals(ctx: StateContext<ProfileStateModel>) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    ctx.patchState({ loading: true });
    return this.userRepo.getByUid(uid).pipe(
      take(1),
      tap(user => {
        ctx.patchState({
          goals: user?.goals ?? null,
          preferences: user?.preferences ?? null,
          loading: false,
        });
      }),
    );
  }

  @Action(Profile.UpdateGoals)
  async updateGoals(ctx: StateContext<ProfileStateModel>, action: Profile.UpdateGoals) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const currentGoals = ctx.getState().goals;
    const updatedGoals = { ...currentGoals, ...action.goals } as UserGoals;

    await this.userRepo.update(uid, { goals: updatedGoals });
    ctx.patchState({ goals: updatedGoals });
  }

  @Action(Profile.UpdatePreferences)
  async updatePreferences(ctx: StateContext<ProfileStateModel>, action: Profile.UpdatePreferences) {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const current = ctx.getState().preferences;
    const updated = { ...current, ...action.preferences } as UserPreferences;

    await this.userRepo.update(uid, { preferences: updated });
    ctx.patchState({ preferences: updated });
  }

  @Action(Profile.Reset)
  reset(ctx: StateContext<ProfileStateModel>) {
    ctx.setState(PROFILE_STATE_DEFAULTS);
  }
}
