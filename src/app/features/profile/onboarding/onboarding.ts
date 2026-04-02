import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, map } from 'rxjs/operators';
import { Profile } from '../../../store/profile/profile.actions';
import { Energy } from '../../../store/energy/energy.actions';
import { AuthState } from '../../../store/auth/auth.state';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import { MacroBarsComponent } from '../../energy/shared/macro-bars/macro-bars';
import { UserGoals, UserPreferences } from '../../../core/models';
import {
  Sex, FitnessGoal, RateOfChange, ActivityLevel, MacroPreference, GoalSettings,
} from '../../../core/models/energy.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, BadgeComponent, MacroBarsComponent],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
})
export class OnboardingComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly calc = inject(EnergyCalcService);
  private readonly destroy$ = new Subject<void>();

  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly saving = signal(false);
  protected readonly suggestedCalories = signal(2000);
  protected readonly caloriesOverridden = signal(false);
  protected readonly macrosOverridden = signal(false);
  protected readonly preview = signal({ bmr: 0, tdee: 0 });

  // Suppress programmatic patch loops
  private suppressCalorieWatch = false;
  private suppressMacroWatch = false;

  protected readonly form = this.fb.nonNullable.group({
    units: ['metric' as 'metric' | 'imperial'],
    currentWeight: [80, [Validators.required, Validators.min(30), Validators.max(300)]],
    heightCm: [175, [Validators.required, Validators.min(100), Validators.max(250)]],
    age: [30, [Validators.required, Validators.min(14), Validators.max(100)]],
    sex: ['male' as Sex],
    fitnessGoal: ['maintenance' as FitnessGoal],
    rateOfChange: ['moderate' as RateOfChange],
    activityLevel: ['moderate' as ActivityLevel],
    weeklyWorkouts: [4, [Validators.required, Validators.min(0), Validators.max(14)]],
    macroPreference: ['balanced' as MacroPreference],
    dailyCalories: [2000, [Validators.required, Validators.min(800), Validators.max(10000)]],
    dailyProtein: [150, [Validators.required, Validators.min(0), Validators.max(500)]],
    dailyCarbs: [200, [Validators.required, Validators.min(0), Validators.max(1000)]],
    dailyFat: [70, [Validators.required, Validators.min(0), Validators.max(400)]],
    targetWeight: [null as number | null],
  });

  protected readonly goalOptions: { value: FitnessGoal; label: string }[] = [
    { value: 'fat_loss', label: 'Cutting' },
    { value: 'maintenance', label: 'Maintaining' },
    { value: 'muscle_gain', label: 'Bulking' },
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

  ngOnInit() {
    // 1. Body stats / goal / activity changes → recalculate suggestions
    this.form.valueChanges.pipe(
      takeUntil(this.destroy$),
      map(v => `${v.currentWeight}-${v.heightCm}-${v.age}-${v.sex}-${v.fitnessGoal}-${v.rateOfChange}-${v.activityLevel}`),
      distinctUntilChanged(),
    ).subscribe(() => this.recalcSuggestion());

    // 2. Calories manual edit
    this.form.controls.dailyCalories.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(cal => {
      if (this.suppressCalorieWatch) return;
      if (cal !== this.suggestedCalories()) {
        this.caloriesOverridden.set(true);
      }
      if (!this.macrosOverridden()) {
        this.rescaleMacros(cal);
      }
    });

    // 3. Individual macro edits
    for (const field of ['dailyProtein', 'dailyCarbs', 'dailyFat'] as const) {
      this.form.controls[field].valueChanges.pipe(
        takeUntil(this.destroy$),
      ).subscribe(newVal => {
        if (this.suppressMacroWatch) return;
        this.macrosOverridden.set(true);
        this.form.patchValue({ macroPreference: 'custom' }, { emitEvent: false });
        this.redistributeMacros(field, newVal);
      });
    }

    // Initial calculation
    this.recalcSuggestion();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private recalcSuggestion() {
    const v = this.form.getRawValue();
    const result = this.calc.calculateFullGoals({
      weightKg: v.currentWeight,
      heightCm: v.heightCm,
      age: v.age,
      sex: v.sex,
      activityLevel: v.activityLevel,
      goal: v.fitnessGoal,
      rateOfChange: v.rateOfChange,
      macroPreference: v.macroPreference === 'custom' ? 'balanced' : v.macroPreference,
    });

    this.suggestedCalories.set(result.dailyCalories);
    this.preview.set({ bmr: result.bmr, tdee: result.tdee });

    if (!this.caloriesOverridden()) {
      this.suppressCalorieWatch = true;
      this.form.patchValue({ dailyCalories: result.dailyCalories }, { emitEvent: false });
      this.suppressCalorieWatch = false;

      if (!this.macrosOverridden()) {
        this.suppressMacroWatch = true;
        this.form.patchValue({
          dailyProtein: result.dailyProtein,
          dailyCarbs: result.dailyCarbs,
          dailyFat: result.dailyFat,
        }, { emitEvent: false });
        this.suppressMacroWatch = false;
      }
    }
  }

  private rescaleMacros(newCalories: number) {
    const v = this.form.getRawValue();
    const macros = this.calc.recalcMacrosFromCalories(newCalories, v.dailyProtein, v.dailyCarbs, v.dailyFat);
    this.suppressMacroWatch = true;
    this.form.patchValue({
      dailyProtein: macros.protein,
      dailyCarbs: macros.carbs,
      dailyFat: macros.fat,
    }, { emitEvent: false });
    this.suppressMacroWatch = false;
  }

  private redistributeMacros(changedField: 'dailyProtein' | 'dailyCarbs' | 'dailyFat', newValue: number) {
    const v = this.form.getRawValue();
    const macroField = changedField.replace('daily', '').toLowerCase() as 'protein' | 'carbs' | 'fat';
    const result = this.calc.adjustMacroKeepCalories(
      v.dailyCalories, macroField, newValue, v.dailyProtein, v.dailyCarbs, v.dailyFat,
    );
    this.suppressMacroWatch = true;
    const patch: Record<string, number> = {};
    if (changedField !== 'dailyProtein') patch['dailyProtein'] = result.protein;
    if (changedField !== 'dailyCarbs') patch['dailyCarbs'] = result.carbs;
    if (changedField !== 'dailyFat') patch['dailyFat'] = result.fat;
    this.form.patchValue(patch, { emitEvent: false });
    this.suppressMacroWatch = false;
  }

  protected selectGoal(goal: FitnessGoal) {
    this.form.patchValue({
      fitnessGoal: goal,
      ...(goal === 'maintenance' ? { rateOfChange: 'moderate' as RateOfChange } : {}),
    });
  }

  protected selectMacroPreset(preset: MacroPreference) {
    this.form.patchValue({ macroPreference: preset });
    if (preset !== 'custom') {
      this.macrosOverridden.set(false);
      const macros = this.calc.calculateMacros(this.form.getRawValue().dailyCalories, preset);
      this.suppressMacroWatch = true;
      this.form.patchValue({
        dailyProtein: macros.protein,
        dailyCarbs: macros.carbs,
        dailyFat: macros.fat,
      }, { emitEvent: false });
      this.suppressMacroWatch = false;
    }
  }

  protected resetToSuggested() {
    this.caloriesOverridden.set(false);
    this.macrosOverridden.set(false);
    this.recalcSuggestion();
  }

  protected toggleUnits() {
    const v = this.form.getRawValue();
    if (v.units === 'metric') {
      // Switch to imperial
      this.form.patchValue({
        units: 'imperial',
        currentWeight: Math.round(v.currentWeight * 2.20462 * 10) / 10,
        heightCm: Math.round(v.heightCm / 2.54),
        ...(v.targetWeight != null ? { targetWeight: Math.round(v.targetWeight * 2.20462 * 10) / 10 } : {}),
      }, { emitEvent: false });
    } else {
      // Switch to metric
      this.form.patchValue({
        units: 'metric',
        currentWeight: Math.round(v.currentWeight / 2.20462 * 10) / 10,
        heightCm: Math.round(v.heightCm * 2.54),
        ...(v.targetWeight != null ? { targetWeight: Math.round(v.targetWeight / 2.20462 * 10) / 10 } : {}),
      }, { emitEvent: false });
    }
  }

  protected get weightUnit(): string {
    return this.form.value.units === 'metric' ? 'kg' : 'lbs';
  }

  protected get heightUnit(): string {
    return this.form.value.units === 'metric' ? 'cm' : 'in';
  }

  protected get macroCalories(): number {
    const v = this.form.getRawValue();
    return v.dailyProtein * 4 + v.dailyCarbs * 4 + v.dailyFat * 9;
  }

  protected get maxProtein(): number {
    return Math.floor(this.form.getRawValue().dailyCalories / 4);
  }

  protected get maxCarbs(): number {
    return Math.floor(this.form.getRawValue().dailyCalories / 4);
  }

  protected get maxFat(): number {
    return Math.floor(this.form.getRawValue().dailyCalories / 9);
  }

  protected async complete() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const v = this.form.getRawValue();

    // Convert back to metric for storage if in imperial
    const weightKg = v.units === 'imperial' ? Math.round(v.currentWeight / 2.20462 * 10) / 10 : v.currentWeight;
    const heightCm = v.units === 'imperial' ? Math.round(v.heightCm * 2.54) : v.heightCm;
    const targetWeightKg = v.targetWeight != null
      ? (v.units === 'imperial' ? Math.round(v.targetWeight / 2.20462 * 10) / 10 : v.targetWeight)
      : null;

    const goals: UserGoals = {
      dailyCalories: v.dailyCalories,
      dailyProtein: v.dailyProtein,
      dailyCarbs: v.dailyCarbs,
      dailyFat: v.dailyFat,
      targetWeight: targetWeightKg,
      weeklyWorkouts: v.weeklyWorkouts,
      currentWeight: weightKg,
      heightCm,
      age: v.age,
      sex: v.sex,
      fitnessGoal: v.fitnessGoal,
      rateOfChange: v.rateOfChange,
      activityLevel: v.activityLevel,
      macroPreference: v.macroPreference,
    };

    const preferences: UserPreferences = { units: v.units };

    this.store.dispatch(new Profile.CompleteOnboarding(goals, preferences)).subscribe(() => {
      this.saving.set(false);
      this.router.navigate(['/dashboard']);

      // Fire-and-forget: seed energy goal settings
      const uid = this.store.selectSnapshot(AuthState.uid);
      if (uid) {
        const p = this.preview();
        const energySettings: Omit<GoalSettings, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: uid,
          age: v.age,
          sex: v.sex,
          heightCm,
          weightKg,
          goal: v.fitnessGoal,
          rateOfChange: v.rateOfChange,
          weeklyTrainingFrequency: v.weeklyWorkouts,
          dailyStepsTarget: 8000,
          activityLevel: v.activityLevel,
          macroPreference: v.macroPreference,
          bmr: p.bmr,
          tdee: p.tdee,
          dailyCalories: v.dailyCalories,
          dailyProtein: v.dailyProtein,
          dailyCarbs: v.dailyCarbs,
          dailyFat: v.dailyFat,
        };
        this.store.dispatch(new Energy.SaveGoalSettings(energySettings));
      }
    });
  }
}
