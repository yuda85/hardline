import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Profile } from '../../../store/profile/profile.actions';
import { AuthState } from '../../../store/auth/auth.state';
import { ButtonComponent } from '../../../shared/components';
import { UserGoals, UserPreferences } from '../../../core/models';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly step = signal(1);
  protected readonly totalSteps = 2;
  protected readonly saving = signal(false);

  protected readonly goalsForm = this.fb.nonNullable.group({
    dailyCalories: [2000, [Validators.required, Validators.min(800), Validators.max(10000)]],
    dailyProtein: [150, [Validators.required, Validators.min(20), Validators.max(500)]],
    dailyCarbs: [200, [Validators.required, Validators.min(20), Validators.max(1000)]],
    dailyFat: [70, [Validators.required, Validators.min(10), Validators.max(400)]],
    targetWeight: [null as number | null],
    weeklyWorkouts: [4, [Validators.required, Validators.min(1), Validators.max(14)]],
  });

  protected readonly prefsForm = this.fb.nonNullable.group({
    units: ['metric' as 'metric' | 'imperial'],
  });

  protected nextStep() {
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
    }
  }

  protected prevStep() {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
    }
  }

  protected async complete() {
    if (this.goalsForm.invalid) {
      this.step.set(1);
      return;
    }

    this.saving.set(true);

    const goals: UserGoals = {
      dailyCalories: this.goalsForm.value.dailyCalories!,
      dailyProtein: this.goalsForm.value.dailyProtein!,
      dailyCarbs: this.goalsForm.value.dailyCarbs!,
      dailyFat: this.goalsForm.value.dailyFat!,
      targetWeight: this.goalsForm.value.targetWeight ?? null,
      weeklyWorkouts: this.goalsForm.value.weeklyWorkouts!,
    };

    const preferences: UserPreferences = {
      units: this.prefsForm.value.units!,
    };

    this.store.dispatch(new Profile.CompleteOnboarding(goals, preferences)).subscribe(() => {
      this.saving.set(false);
      this.router.navigate(['/dashboard']);
    });
  }
}
