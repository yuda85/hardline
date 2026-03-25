import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngxs/store';
import { withNgxsStoragePlugin } from '@ngxs/storage-plugin';
import { withNgxsReduxDevtoolsPlugin } from '@ngxs/devtools-plugin';
import { withNgxsLoggerPlugin } from '@ngxs/logger-plugin';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthState } from './store/auth/auth.state';
import { ProfileState } from './store/profile/profile.state';
import { EnergyState } from './store/energy/energy.state';
import { WorkoutState } from './store/workout/workout.state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideStore(
      [AuthState, ProfileState, EnergyState, WorkoutState],
      { developmentMode: !environment.production },
      withNgxsStoragePlugin({ keys: ['auth.user'] }),
      ...(environment.production
        ? []
        : [withNgxsReduxDevtoolsPlugin(), withNgxsLoggerPlugin({ disabled: environment.production })]),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
