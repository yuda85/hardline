import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AuthState } from '../../../store/auth/auth.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { Profile } from '../../../store/profile/profile.actions';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyCalcService } from '../../../core/services/energy-calc.service';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import {
  Sex, FitnessGoal, RateOfChange, ActivityLevel, MacroPreference, GoalSettings,
} from '../../../core/models/energy.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, BadgeComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly calc = inject(EnergyCalcService);
  private readonly destroy$ = new Subject<void>();

  // Suppress programmatic patch loops
  private suppressCalorieWatch = false;
  private suppressMacroWatch = false;

  protected readonly appVersion = environment.appVersion;
  protected readonly user = this.store.selectSignal(AuthState.user);
  protected readonly goals = this.store.selectSignal(ProfileState.goals);
  protected readonly preferences = this.store.selectSignal(ProfileState.preferences);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly macrosOverridden = signal(false);
  protected readonly preview = signal({ bmr: 0, tdee: 0, suggestedCalories: 0 });

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
      this.recalcPreview();
    });

    // 1. Body stats / goal / activity changes → recalculate preview + auto-update calories/macros
    this.goalsForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      map(v => `${v.currentWeight}-${v.heightCm}-${v.age}-${v.sex}-${v.fitnessGoal}-${v.rateOfChange}-${v.activityLevel}-${v.macroPreference}`),
      distinctUntilChanged(),
    ).subscribe(() => this.recalcPreview());

    // 2. Calories manual edit → rescale macros
    this.goalsForm.controls.dailyCalories.valueChanges.pipe(
      takeUntil(this.destroy$),
    ).subscribe(cal => {
      if (this.suppressCalorieWatch) return;
      if (!this.macrosOverridden()) {
        this.rescaleMacros(cal);
      }
    });

    // 3. Individual macro edits → redistribute others
    for (const field of ['dailyProtein', 'dailyCarbs', 'dailyFat'] as const) {
      this.goalsForm.controls[field].valueChanges.pipe(
        takeUntil(this.destroy$),
      ).subscribe(newVal => {
        if (this.suppressMacroWatch) return;
        this.macrosOverridden.set(true);
        this.goalsForm.patchValue({ macroPreference: 'custom' }, { emitEvent: false });
        this.redistributeMacros(field, newVal);
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected startEditing() {
    this.populateForms();
    this.editing.set(true);
  }

  protected cancelEditing() {
    this.editing.set(false);
  }

  protected resetToCalculated() {
    this.macrosOverridden.set(false);
    this.recalcPreview();
  }

  protected get macroCalories(): number {
    const v = this.goalsForm.getRawValue();
    return v.dailyProtein * 4 + v.dailyCarbs * 4 + v.dailyFat * 9;
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

        // Sync to Energy store so dashboard/daily summaries stay current
        const uid = this.store.selectSnapshot(AuthState.uid);
        if (uid) {
          const p = this.preview();
          const energySettings: Omit<GoalSettings, 'id' | 'createdAt' | 'updatedAt'> = {
            userId: uid,
            age: v.age,
            sex: v.sex,
            heightCm: v.heightCm,
            weightKg: v.currentWeight,
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
      },
    );
  }

  private recalcPreview() {
    const v = this.goalsForm.getRawValue();
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

    this.preview.set({ bmr: result.bmr, tdee: result.tdee, suggestedCalories: result.dailyCalories });

    if (!this.macrosOverridden()) {
      this.suppressCalorieWatch = true;
      this.suppressMacroWatch = true;
      this.goalsForm.patchValue({
        dailyCalories: result.dailyCalories,
        dailyProtein: result.dailyProtein,
        dailyCarbs: result.dailyCarbs,
        dailyFat: result.dailyFat,
      }, { emitEvent: false });
      this.suppressCalorieWatch = false;
      this.suppressMacroWatch = false;
    }
  }

  private rescaleMacros(newCalories: number) {
    const v = this.goalsForm.getRawValue();
    const macros = this.calc.recalcMacrosFromCalories(newCalories, v.dailyProtein, v.dailyCarbs, v.dailyFat);
    this.suppressMacroWatch = true;
    this.goalsForm.patchValue({
      dailyProtein: macros.protein,
      dailyCarbs: macros.carbs,
      dailyFat: macros.fat,
    }, { emitEvent: false });
    this.suppressMacroWatch = false;
  }

  private redistributeMacros(changedField: 'dailyProtein' | 'dailyCarbs' | 'dailyFat', newValue: number) {
    const v = this.goalsForm.getRawValue();
    const macroField = changedField.replace('daily', '').toLowerCase() as 'protein' | 'carbs' | 'fat';
    const result = this.calc.adjustMacroKeepCalories(
      v.dailyCalories, macroField, newValue, v.dailyProtein, v.dailyCarbs, v.dailyFat,
    );
    this.suppressMacroWatch = true;
    const patch: Record<string, number> = {};
    if (changedField !== 'dailyProtein') patch['dailyProtein'] = result.protein;
    if (changedField !== 'dailyCarbs') patch['dailyCarbs'] = result.carbs;
    if (changedField !== 'dailyFat') patch['dailyFat'] = result.fat;
    this.goalsForm.patchValue(patch, { emitEvent: false });
    this.suppressMacroWatch = false;
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
