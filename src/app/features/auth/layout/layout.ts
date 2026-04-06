import { Component, inject, OnInit, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngxs/store';
import { SideNavComponent, BottomNavComponent } from '../../../shared/components';
import { Auth } from '../../../store/auth/auth.actions';
import { AuthState } from '../../../store/auth/auth.state';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { Weight } from '../../../store/weight/weight.actions';
import { WeightState } from '../../../store/weight/weight.state';
import { WeightPromptComponent } from '../../weight/weight-prompt/weight-prompt';
import type { NavItem } from '../../../shared/components';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SideNavComponent, BottomNavComponent, WeightPromptComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly showWeightPrompt = this.store.selectSignal(WeightState.showPrompt);
  protected readonly activeSession = this.store.selectSignal(WorkoutState.activeSession);
  protected readonly isInSession = this.store.selectSignal(WorkoutState.isInSession);

  private readonly navEvents = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)),
  );

  protected readonly showResumeBanner = computed(() => {
    this.navEvents(); // re-evaluate on navigation
    return this.isInSession() && !this.router.url.includes('/workouts/active');
  });

  protected readonly sessionElapsed = computed(() => {
    const session = this.activeSession();
    if (!session) return '';
    const startedAt = session.startedAt instanceof Date
      ? session.startedAt
      : (session.startedAt as any)?.toDate?.() ?? new Date(session.startedAt);
    const mins = Math.floor((Date.now() - startedAt.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  });

  protected readonly navItems: NavItem[] = [
    { icon: 'grid_view', label: 'Dashboard', route: '/dashboard' },
    { icon: 'bolt', label: 'Energy', route: '/energy' },
    { icon: 'exercise', label: 'Workouts', route: '/workouts' },
    { icon: 'monitor_weight', label: 'Weight', route: '/weight' },
    { icon: 'leaderboard', label: 'Insights', route: '/insights' },
    { icon: 'person', label: 'Profile', route: '/profile' },
  ];

  ngOnInit() {
    this.store.dispatch(new Weight.CheckToday());
    this.store.dispatch(new Workout.CheckActiveSession());
  }

  protected resumeWorkout() {
    const session = this.activeSession();
    if (session) {
      this.router.navigate(['/workouts', 'active', session.planId, session.dayNumber]);
    }
  }

  protected onWeightSaved(data: { weightKg: number; notes?: string }) {
    this.store.dispatch(new Weight.LogWeight(data.weightKg, data.notes));
  }

  protected onWeightSkipped() {
    this.store.dispatch(new Weight.DismissPrompt());
  }

  protected logout() {
    this.store.dispatch(new Auth.Logout()).subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
