import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <h1 class="dashboard__title">Dashboard</h1>
    <p class="dashboard__subtitle">Your fitness overview — coming soon.</p>
  `,
  styles: `
    :host {
      display: block;
    }
    .dashboard__title {
      font-family: var(--font-headline);
      font-weight: 800;
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      color: var(--on-surface);
      margin-bottom: 0.5rem;
    }
    .dashboard__subtitle {
      color: var(--on-surface-variant);
    }
  `,
})
export class DashboardComponent {}
