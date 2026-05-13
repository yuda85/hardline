import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import {
  CARDIO_ACTIVITIES,
  CARDIO_ACTIVITY_TYPES,
  CardioActivityType,
} from '../../../core/models/cardio-session.model';

@Component({
  selector: 'app-activity-picker',
  standalone: true,
  templateUrl: './activity-picker.html',
  styleUrl: './activity-picker.scss',
})
export class ActivityPickerComponent {
  private readonly router = inject(Router);

  protected readonly selected = signal<CardioActivityType | null>(null);
  protected readonly types = CARDIO_ACTIVITY_TYPES;
  protected readonly activities = CARDIO_ACTIVITIES;

  protected pick(t: CardioActivityType): void {
    this.selected.set(t);
  }

  protected continue(): void {
    const t = this.selected();
    if (!t) return;
    this.router.navigate(['/cardio/permissions'], { queryParams: { type: t } });
  }

  protected back(): void {
    this.router.navigate(['/cardio']);
  }
}
