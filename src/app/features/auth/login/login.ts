import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Auth } from '../../../store/auth/auth.actions';
import { AuthState } from '../../../store/auth/auth.state';
import { ButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly loading = this.store.selectSignal(AuthState.loading);
  protected readonly error = this.store.selectSignal(AuthState.error);

  ngOnInit() {
    if (this.store.selectSnapshot(AuthState.isAuthenticated)) {
      this.router.navigate(['/dashboard']);
    }
  }

  protected login() {
    this.store.dispatch(new Auth.LoginWithGoogle()).subscribe(() => {
      if (this.store.selectSnapshot(AuthState.isAuthenticated)) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
