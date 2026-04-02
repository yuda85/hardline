import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { ProfileState } from '../../../store/profile/profile.state';
import { Profile } from '../../../store/profile/profile.actions';
import { CardComponent, ButtonComponent, IconButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-weight-settings',
  standalone: true,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, IconButtonComponent],
  templateUrl: './weight-settings.html',
  styleUrl: './weight-settings.scss',
})
export class WeightSettingsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly goals = this.store.selectSignal(ProfileState.goals);
  protected readonly preferences = this.store.selectSignal(ProfileState.preferences);

  protected readonly form = this.fb.nonNullable.group({
    targetWeight: [0 as number | null, [Validators.min(20), Validators.max(300)]],
    reminderTime: ['07:00'],
  });

  ngOnInit() {
    const goals = this.goals();
    const prefs = this.preferences();

    this.form.patchValue({
      targetWeight: goals?.targetWeight ?? null,
      reminderTime: prefs?.weighInReminderTime ?? '07:00',
    });
  }

  protected save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { targetWeight, reminderTime } = this.form.getRawValue();

    const goalUpdate = this.store.dispatch(
      new Profile.UpdateGoals({ targetWeight: targetWeight || null }),
    );

    const prefUpdate = this.store.dispatch(
      new Profile.UpdatePreferences({ weighInReminderTime: reminderTime }),
    );

    // Wait for both to complete
    goalUpdate.subscribe(() => {
      prefUpdate.subscribe(() => {
        this.saving.set(false);
        this.router.navigate(['/weight']);
      });
    });
  }

  protected goBack() { this.router.navigate(['/weight']); }
}
