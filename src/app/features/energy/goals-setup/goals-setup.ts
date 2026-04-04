import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { AuthState } from '../../../store/auth/auth.state';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import {
  Sex, FitnessGoal, RateOfChange, ActivityLevel, MacroPreference,
  GoalSettings, DEFAULT_GOAL_SETTINGS,
} from '../../../core/models/energy.model';

@Component({
  selector: 'app-goals-setup',
  standalone: true,
  imports: [ReactiveFormsModule, MacroBarsComponent],
  templateUrl: './goals-setup.html',
  styleUrl: './goals-setup.scss',
})
export class GoalsSetupComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly calc = inject(EnergyCalcService);

  protected readonly existing = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    age: [30, [Validators.required, Validators.min(14), Validators.max(100)]],
    sex: ['male' as Sex],
    heightCm: [175, [Validators.required, Validators.min(100), Validators.max(250)]],
    weightKg: [80, [Validators.required, Validators.min(30), Validators.max(300)]],
    goal: ['maintenance' as FitnessGoal],
    rateOfChange: ['moderate' as RateOfChange],
    weeklyTrainingFrequency: [4, [Validators.required, Validators.min(0), Validators.max(14)]],
    dailyStepsTarget: [8000, [Validators.required, Validators.min(0)]],
    activityLevel: ['moderate' as ActivityLevel],
    macroPreference: ['balanced' as MacroPreference],
  });

  // Live calculated preview
  protected readonly preview = signal({ bmr: 0, tdee: 0, dailyCalories: 0, dailyProtein: 0, dailyCarbs: 0, dailyFat: 0 });

  protected readonly goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'fat_loss', label: 'Fat Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
  ];

  protected readonly rateOptions: { value: RateOfChange; label: string }[] = [
    { value: 'slow', label: 'Slow' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'aggressive', label: 'Aggressive' },
  ];

  protected readonly activityOptions: { value: ActivityLevel; label: string }[] = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Lightly Active' },
    { value: 'moderate', label: 'Moderately Active' },
    { value: 'active', label: 'Active' },
    { value: 'very_active', label: 'Very Active' },
  ];

  protected readonly macroOptions: { value: MacroPreference; label: string }[] = [
    { value: 'balanced', label: 'Balanced' },
    { value: 'high_protein', label: 'High Protein' },
    { value: 'low_carb', label: 'Low Carb' },
    { value: 'custom', label: 'Custom' },
  ];

  constructor() {
    // Recalculate preview on any form change
    effect(() => {
      // Touch the form to create dependency (this is a workaround since FormGroup isn't signal-based)
      const _ = this.existing();
    });
  }

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings()).subscribe(() => {
      const existing = this.store.selectSnapshot(EnergyState.goalSettings);
      if (existing) {
        this.form.patchValue({
          age: existing.age,
          sex: existing.sex,
          heightCm: existing.heightCm,
          weightKg: existing.weightKg,
          goal: existing.goal,
          rateOfChange: existing.rateOfChange,
          weeklyTrainingFrequency: existing.weeklyTrainingFrequency,
          dailyStepsTarget: existing.dailyStepsTarget,
          activityLevel: existing.activityLevel,
          macroPreference: existing.macroPreference,
        });
      }
      this.recalculate();
    });

    this.form.valueChanges.subscribe(() => this.recalculate());
  }

  protected recalculate() {
    const v = this.form.getRawValue();
    const result = this.calc.calculateFullGoals({
      weightKg: v.weightKg,
      heightCm: v.heightCm,
      age: v.age,
      sex: v.sex,
      activityLevel: v.activityLevel,
      goal: v.goal,
      rateOfChange: v.rateOfChange,
      macroPreference: v.macroPreference,
    });
    this.preview.set(result);
  }

  protected async save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.getRawValue();
    const p = this.preview();
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const settings: Omit<GoalSettings, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: uid,
      ...v,
      bmr: p.bmr,
      tdee: p.tdee,
      dailyCalories: p.dailyCalories,
      dailyProtein: p.dailyProtein,
      dailyCarbs: p.dailyCarbs,
      dailyFat: p.dailyFat,
    };

    this.store.dispatch(new Energy.SaveGoalSettings(settings)).subscribe(() => {
      this.saving.set(false);
      this.router.navigate(['/energy']);
    });
  }

  protected goBack() {
    this.router.navigate(['/energy']);
  }
}
