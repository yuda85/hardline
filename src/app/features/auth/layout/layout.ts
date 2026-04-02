import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { SideNavComponent, BottomNavComponent } from '../../../shared/components';
import { Auth } from '../../../store/auth/auth.actions';
import { AuthState } from '../../../store/auth/auth.state';
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

  protected readonly navItems: NavItem[] = [
    { icon: 'grid_view', label: 'Dashboard', route: '/dashboard' },
    { icon: 'bolt', label: 'Energy', route: '/energy' },
    { icon: 'exercise', label: 'Workouts', route: '/workouts' },
    { icon: 'monitor_weight', label: 'Weight', route: '/weight' },
    { icon: 'psychology', label: 'Coach', route: '/coach' },
    { icon: 'leaderboard', label: 'Insights', route: '/insights' },
    { icon: 'person', label: 'Profile', route: '/profile' },
  ];

  ngOnInit() {
    this.store.dispatch(new Weight.CheckToday());
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
