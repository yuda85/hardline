import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { onboardingGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/onboarding/onboarding').then(m => m.OnboardingComponent),
  },
  {
    path: '',
    loadComponent: () => import('./features/auth/layout/layout').then(m => m.LayoutComponent),
    canActivate: [onboardingGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'workouts',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/workout/workout-list/workout-list').then(
                m => m.WorkoutListComponent,
              ),
          },
          {
            path: 'edit/:planId',
            loadComponent: () =>
              import('./features/workout/plan-editor/plan-editor').then(
                m => m.PlanEditorComponent,
              ),
          },
          {
            path: 'day/:planId/:dayNumber',
            loadComponent: () =>
              import('./features/workout/day-detail/day-detail').then(
                m => m.DayDetailComponent,
              ),
          },
          {
            path: 'active/:planId/:dayNumber',
            loadComponent: () =>
              import('./features/workout/active-workout/active-workout').then(
                m => m.ActiveWorkoutComponent,
              ),
          },
          {
            path: 'summary',
            loadComponent: () =>
              import('./features/workout/session-summary/session-summary').then(
                m => m.SessionSummaryComponent,
              ),
          },
        ],
      },
      {
        path: 'energy',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/energy/energy-home/energy-home').then(m => m.EnergyHomeComponent),
          },
          {
            path: 'goals',
            loadComponent: () =>
              import('./features/energy/goals-setup/goals-setup').then(m => m.GoalsSetupComponent),
          },
          {
            path: 'food',
            loadComponent: () =>
              import('./features/energy/food-log/food-log').then(m => m.FoodLogComponent),
          },
          {
            path: 'activity',
            loadComponent: () =>
              import('./features/energy/activity/activity').then(m => m.ActivityComponent),
          },
          {
            path: 'daily',
            loadComponent: () =>
              import('./features/energy/daily-summary/daily-summary').then(m => m.DailySummaryComponent),
          },
          {
            path: 'weekly',
            loadComponent: () =>
              import('./features/energy/weekly-summary/weekly-summary').then(m => m.WeeklySummaryComponent),
          },
        ],
      },
      {
        path: 'weight',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/weight/weight-home/weight-home').then(m => m.WeightHomeComponent),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./features/weight/weight-history/weight-history').then(
                m => m.WeightHistoryComponent,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/weight/weight-settings/weight-settings').then(
                m => m.WeightSettingsComponent,
              ),
          },
        ],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page').then(m => m.ProfilePageComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
