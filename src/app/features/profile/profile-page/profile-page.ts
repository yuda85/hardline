import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { AuthState } from '../../../store/auth/auth.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { Profile } from '../../../store/profile/profile.actions';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, BadgeComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly goals = this.store.selectSignal(ProfileState.goals);
  protected readonly preferences = this.store.selectSignal(ProfileState.preferences);
  protected readonly editing = signal(false);
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

  ngOnInit() {
    this.store.dispatch(new Profile.FetchGoals()).subscribe(() => {
      this.populateForms();
    });
  }

  protected startEditing() {
    this.populateForms();
    this.editing.set(true);
  }

  protected cancelEditing() {
    this.editing.set(false);
  }

  protected async save() {
    if (this.goalsForm.invalid) return;

    this.saving.set(true);

    const goalsUpdate = {
      dailyCalories: this.goalsForm.value.dailyCalories!,
      dailyProtein: this.goalsForm.value.dailyProtein!,
      dailyCarbs: this.goalsForm.value.dailyCarbs!,
      dailyFat: this.goalsForm.value.dailyFat!,
      targetWeight: this.goalsForm.value.targetWeight ?? null,
      weeklyWorkouts: this.goalsForm.value.weeklyWorkouts!,
    };

    const prefsUpdate = {
      units: this.prefsForm.value.units!,
    };

    this.store.dispatch([new Profile.UpdateGoals(goalsUpdate), new Profile.UpdatePreferences(prefsUpdate)]).subscribe(
      () => {
        this.saving.set(false);
        this.editing.set(false);
      },
    );
  }

  private populateForms() {
    const g = this.goals();
    if (g) {
      this.goalsForm.patchValue({
        dailyCalories: g.dailyCalories,
        dailyProtein: g.dailyProtein,
        dailyCarbs: g.dailyCarbs,
        dailyFat: g.dailyFat,
        targetWeight: g.targetWeight,
        weeklyWorkouts: g.weeklyWorkouts,
      });
    }
    const p = this.preferences();
    if (p) {
      this.prefsForm.patchValue({ units: p.units });
    }
  }
}
