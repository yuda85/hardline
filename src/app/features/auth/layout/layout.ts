import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { SideNavComponent, BottomNavComponent } from '../../../shared/components';
import { Auth } from '../../../store/auth/auth.actions';
import { AuthState } from '../../../store/auth/auth.state';
import type { NavItem } from '../../../shared/components';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SideNavComponent, BottomNavComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly user = this.store.selectSignal(AuthState.user);

  protected readonly navItems: NavItem[] = [
    { icon: 'grid_view', label: 'Dashboard', route: '/dashboard' },
    { icon: 'restaurant', label: 'Nutrition', route: '/nutrition' },
    { icon: 'exercise', label: 'Workouts', route: '/workouts' },
    { icon: 'format_list_bulleted', label: 'Builder', route: '/builder' },
    { icon: 'psychology', label: 'Coach', route: '/coach' },
    { icon: 'leaderboard', label: 'Insights', route: '/insights' },
  ];

  protected logout() {
    this.store.dispatch(new Auth.Logout()).subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
