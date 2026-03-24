import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { Auth } from './store/auth/auth.actions';
import { AuthState } from './store/auth/auth.state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly store = inject(Store);
  protected readonly initialized = this.store.selectSignal(AuthState.initialized);

  ngOnInit() {
    this.store.dispatch(new Auth.Init());
  }
}
