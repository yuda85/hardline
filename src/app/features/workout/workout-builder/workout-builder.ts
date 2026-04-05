import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { Profile } from '../../../store/profile/profile.actions';
import {
  ButtonComponent,
  CardComponent,
  IconButtonComponent,
  BadgeComponent,
} from '../../../shared/components';
import {
  WorkoutBuilderInput,
  ExperienceLevel,
  EquipmentType,
  TrainingStyle,
  RepRangePreference,
  SplitPreference,
} from '../../../core/models/ai-workout.model';
import { FitnessGoal, MuscleGroup } from '../../../core/models';

@Component({
  selector: 'app-workout-builder',
  standalone: true,
  imports: [FormsModule, ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent],
  templateUrl: './workout-builder.html',
  styleUrl: './workout-builder.scss',
})
export class WorkoutBuilderComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly generating = this.store.selectSignal(WorkoutState.generating);
  protected readonly generatedPlan = this.store.selectSignal(WorkoutState.generatedPlan);
  protected readonly generateError = this.store.selectSignal(WorkoutState.generateError);
  protected readonly savedPlanId = this.store.selectSignal(WorkoutState.savedPlanId);
  protected readonly showSuccessDialog = signal(false);

  constructor() {
    effect(() => {
      const plan = this.generatedPlan();
      const generating = this.generating();
      if (plan && !generating) {
        this.showSuccessDialog.set(true);
      }
    });
  }

  // Form state
  protected readonly freeTextGoal = signal('');
  protected readonly fitnessGoal = signal<FitnessGoal>('muscle_gain');
  protected readonly trainingStyle = signal<TrainingStyle>('hypertrophy');
  protected readonly repRange = signal<RepRangePreference>('medium');
  protected readonly splitPreference = signal<SplitPreference>('auto');
  protected readonly experienceLevel = signal<ExperienceLevel>('intermediate');
  protected readonly daysPerWeek = signal(4);
  protected readonly minutesPerWorkout = signal(60);
  protected readonly injuries = signal('');
  protected readonly weakPoints = signal<MuscleGroup[]>([]);

  protected readonly equipment = signal<Record<EquipmentType, boolean>>({
    Barbell: true,
    Dumbbell: true,
    Cable: true,
    Machine: true,
    Bodyweight: true,
  });

  protected readonly error = signal<string | null>(null);

  // Options
  protected readonly goalOptions: { value: FitnessGoal; label: string; sub: string }[] = [
    { value: 'fat_loss', label: 'Cutting', sub: 'Fat Loss' },
    { value: 'maintenance', label: 'Maintaining', sub: 'Stable' },
    { value: 'muscle_gain', label: 'Bulking', sub: 'Mass Gain' },
  ];

  protected readonly trainingStyleOptions: { value: TrainingStyle; label: string }[] = [
    { value: 'strength', label: 'Strength' },
    { value: 'hypertrophy', label: 'Hypertrophy' },
    { value: 'powerbuilding', label: 'Powerbuilding' },
    { value: 'athletic', label: 'Athletic' },
    { value: 'endurance', label: 'Endurance' },
  ];

  protected readonly repRangeOptions: { value: RepRangePreference; label: string }[] = [
    { value: 'low', label: '1-5 Heavy' },
    { value: 'medium', label: '6-12 Moderate' },
    { value: 'high', label: '12-20 Light' },
    { value: 'mixed', label: 'Mixed' },
  ];

  protected readonly splitOptions: { value: SplitPreference; label: string }[] = [
    { value: 'auto', label: 'Auto' },
    { value: 'ppl', label: 'PPL' },
    { value: 'upper_lower', label: 'Upper/Lower' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'bro_split', label: 'Bro Split' },
  ];

  protected readonly experienceOptions: { value: ExperienceLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  protected readonly equipmentTypes: EquipmentType[] = [
    'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight',
  ];

  protected readonly muscleGroups: { value: MuscleGroup; label: string }[] = [
    { value: MuscleGroup.Chest, label: 'Chest' },
    { value: MuscleGroup.Back, label: 'Back' },
    { value: MuscleGroup.Shoulders, label: 'Shoulders' },
    { value: MuscleGroup.UpperLegs, label: 'Upper Legs' },
    { value: MuscleGroup.LowerLegs, label: 'Lower Legs' },
    { value: MuscleGroup.Biceps, label: 'Biceps' },
    { value: MuscleGroup.Triceps, label: 'Triceps' },
    { value: MuscleGroup.Core, label: 'Core' },
  ];

  protected readonly daysOptions = [2, 3, 4, 5, 6];
  protected readonly minuteOptions = [30, 45, 60, 75, 90];

  protected toggleEquipment(type: EquipmentType) {
    const current = this.equipment();
    this.equipment.set({ ...current, [type]: !current[type] });
  }

  protected toggleWeakPoint(mg: MuscleGroup) {
    const current = this.weakPoints();
    if (current.includes(mg)) {
      this.weakPoints.set(current.filter(m => m !== mg));
    } else {
      this.weakPoints.set([...current, mg]);
    }
  }

  protected generate() {
    const availableEquipment = this.equipmentTypes.filter(
      t => this.equipment()[t],
    );

    if (availableEquipment.length === 0) {
      this.error.set('Select at least one equipment type');
      return;
    }

    this.error.set(null);

    const input: WorkoutBuilderInput = {
      fitnessGoal: this.fitnessGoal(),
      experienceLevel: this.experienceLevel(),
      availableEquipment,
      daysPerWeek: this.daysPerWeek(),
      minutesPerWorkout: this.minutesPerWorkout(),
      trainingStyle: this.trainingStyle(),
      repRangePreference: this.repRange(),
      splitPreference: this.splitPreference(),
      freeTextGoal: this.freeTextGoal().trim() || undefined,
      constraints: {
        injuries: this.injuries()
          ? this.injuries().split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        weakPoints:
          this.weakPoints().length > 0 ? this.weakPoints() : undefined,
      },
    };

    this.store.dispatch(new Workout.GeneratePlan(input));
  }

  protected makeActivePlan() {
    const planId = this.savedPlanId();
    if (planId) {
      this.store.dispatch(new Profile.SetActivePlan(planId));
    }
    this.router.navigate(['/workouts']);
  }

  protected viewPlan() {
    const planId = this.savedPlanId();
    if (planId) {
      this.router.navigate(['/workouts', 'edit', planId]);
    }
  }

  protected goBack() {
    this.router.navigate(['/workouts']);
  }
}
