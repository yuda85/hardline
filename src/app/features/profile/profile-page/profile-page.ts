import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { AuthState } from '../../../store/auth/auth.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { Profile } from '../../../store/profile/profile.actions';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import {
  Sex, FitnessGoal, RateOfChange, ActivityLevel, MacroPreference,
} from '../../../core/models/energy.model';

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
    dailyProtein: [150, [Validators.required, Validators.min(0), Validators.max(500)]],
    dailyCarbs: [200, [Validators.required, Validators.min(0), Validators.max(1000)]],
    dailyFat: [70, [Validators.required, Validators.min(0), Validators.max(400)]],
    targetWeight: [null as number | null],
    weeklyWorkouts: [4, [Validators.required, Validators.min(0), Validators.max(14)]],
    currentWeight: [80, [Validators.required, Validators.min(30), Validators.max(300)]],
    heightCm: [175, [Validators.required, Validators.min(100), Validators.max(250)]],
    age: [30, [Validators.required, Validators.min(14), Validators.max(100)]],
    sex: ['male' as Sex],
    fitnessGoal: ['maintenance' as FitnessGoal],
    rateOfChange: ['moderate' as RateOfChange],
    activityLevel: ['moderate' as ActivityLevel],
    macroPreference: ['balanced' as MacroPreference],
  });

  protected readonly prefsForm = this.fb.nonNullable.group({
    units: ['metric' as 'metric' | 'imperial'],
  });

  protected readonly goalLabels: Record<FitnessGoal, string> = {
    fat_loss: 'Cutting',
    maintenance: 'Maintaining',
    muscle_gain: 'Bulking',
  };

  protected readonly activityLabels: Record<ActivityLevel, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Active',
    very_active: 'Very Active',
  };

  protected readonly goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'fat_loss', label: 'Cutting' },
    { value: 'maintenance', label: 'Maintaining' },
    { value: 'muscle_gain', label: 'Bulking' },
  ];

  protected readonly activityOptions: { value: ActivityLevel; label: string }[] = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Lightly Active' },
    { value: 'moderate', label: 'Moderately Active' },
    { value: 'active', label: 'Active' },
    { value: 'very_active', label: 'Very Active' },
  ];

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

    const v = this.goalsForm.getRawValue();
    const goalsUpdate = {
      dailyCalories: v.dailyCalories,
      dailyProtein: v.dailyProtein,
      dailyCarbs: v.dailyCarbs,
      dailyFat: v.dailyFat,
      targetWeight: v.targetWeight ?? null,
      weeklyWorkouts: v.weeklyWorkouts,
      currentWeight: v.currentWeight,
      heightCm: v.heightCm,
      age: v.age,
      sex: v.sex,
      fitnessGoal: v.fitnessGoal,
      rateOfChange: v.rateOfChange,
      activityLevel: v.activityLevel,
      macroPreference: v.macroPreference,
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
        currentWeight: g.currentWeight ?? 80,
        heightCm: g.heightCm ?? 175,
        age: g.age ?? 30,
        sex: g.sex ?? 'male',
        fitnessGoal: g.fitnessGoal ?? 'maintenance',
        rateOfChange: g.rateOfChange ?? 'moderate',
        activityLevel: g.activityLevel ?? 'moderate',
        macroPreference: g.macroPreference ?? 'balanced',
      });
    }
    const p = this.preferences();
    if (p) {
      this.prefsForm.patchValue({ units: p.units });
    }
  }
}
