import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { tap, take, map } from 'rxjs/operators';
import { Share } from './share.actions';
import { ShareStateModel, SHARE_STATE_DEFAULTS } from './share.model';
import { SharedPlanRepository } from '../../data/repositories/shared-plan.repository';
import { ShareService } from '../../core/services/share.service';
import { AuthState } from '../auth/auth.state';
import { Workout } from '../workout/workout.actions';
import { SharedPlan } from '../../core/models';

const SHARE_EXPIRY_DAYS = 7;

@State<ShareStateModel>({
  name: 'share',
  defaults: SHARE_STATE_DEFAULTS,
})
@Injectable()
export class ShareState {
  private readonly sharedPlanRepo = inject(SharedPlanRepository);
  private readonly shareService = inject(ShareService);
  private readonly store = inject(Store);

  @Selector()
  static previewPlan(state: ShareStateModel): SharedPlan | null {
    return state.previewPlan;
  }

  @Selector()
  static lastShareId(state: ShareStateModel): string | null {
    return state.lastShareId;
  }

  @Selector()
  static loading(state: ShareStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static error(state: ShareStateModel): string | null {
    return state.error;
  }

  @Action(Share.CreateShare)
  async createShare(ctx: StateContext<ShareStateModel>, action: Share.CreateShare) {
    ctx.patchState({ loading: true, error: null });

    const user = this.store.selectSnapshot(AuthState.user);
    if (!user) {
      ctx.patchState({ loading: false, error: 'Not authenticated' });
      return;
    }

    const shareId = this.shareService.generateShareId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHARE_EXPIRY_DAYS);

    const sharedPlan: Omit<SharedPlan, 'id' | 'createdAt' | 'updatedAt'> = {
      shareId,
      planId: action.plan.id!,
      sharedByUserId: user.uid,
      sharedByName: user.displayName || 'Someone',
      expiresAt,
      planSnapshot: {
        name: action.plan.name,
        description: action.plan.description,
        days: structuredClone(action.plan.days),
      },
    };

    try {
      await this.sharedPlanRepo.create(sharedPlan);
      ctx.patchState({ lastShareId: shareId, loading: false });
    } catch (err) {
      ctx.patchState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to share plan',
      });
    }
  }

  @Action(Share.LoadSharedPlan)
  loadSharedPlan(ctx: StateContext<ShareStateModel>, action: Share.LoadSharedPlan) {
    ctx.patchState({ loading: true, error: null, previewPlan: null });

    return this.sharedPlanRepo.getByShareId(action.shareId).pipe(
      take(1),
      tap(results => {
        if (results.length === 0) {
          ctx.patchState({ loading: false, error: 'not-found' });
          return;
        }

        const shared = results[0];
        const now = new Date();
        const expiresAt = shared.expiresAt instanceof Date
          ? shared.expiresAt
          : new Date((shared.expiresAt as any).seconds * 1000);

        if (expiresAt < now) {
          ctx.patchState({ loading: false, error: 'expired' });
          return;
        }

        ctx.patchState({ previewPlan: shared, loading: false });
      }),
    );
  }

  @Action(Share.CloneSharedPlan)
  cloneSharedPlan(ctx: StateContext<ShareStateModel>) {
    const { previewPlan } = ctx.getState();
    if (!previewPlan) return;

    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    return this.store.dispatch(
      new Workout.SavePlan({
        userId: uid,
        name: previewPlan.planSnapshot.name,
        description: previewPlan.planSnapshot.description,
        days: structuredClone(previewPlan.planSnapshot.days),
      }),
    );
  }

  @Action(Share.Reset)
  reset(ctx: StateContext<ShareStateModel>) {
    ctx.setState(SHARE_STATE_DEFAULTS);
  }
}
