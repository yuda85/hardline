import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { filter, map, take } from 'rxjs/operators';
import { AuthState } from '../../store/auth/auth.state';

export const onboardingGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(AuthState.initialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      const user = store.selectSnapshot(AuthState.user);
      if (!user) return router.createUrlTree(['/login']);
      if (!user.onboardingComplete) return router.createUrlTree(['/onboarding']);
      return true;
    }),
  );
};
