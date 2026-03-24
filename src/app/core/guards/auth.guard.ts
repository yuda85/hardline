import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { filter, map, take } from 'rxjs/operators';
import { AuthState } from '../../store/auth/auth.state';

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(AuthState.initialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      const isAuthenticated = store.selectSnapshot(AuthState.isAuthenticated);
      if (isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
