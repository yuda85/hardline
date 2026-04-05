import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { ProfileState } from '../../../store/profile/profile.state';
import {
  ButtonComponent,
  CardComponent,
  IconButtonComponent,
  BadgeComponent,
} from '../../../shared/components';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker';
import {
  EquipmentType,
  DailyWorkoutResult,
} from '../../../core/models/ai-workout.model';
import {
  WorkoutPlan,
  WorkoutSession,
  Exercise,
  ExerciseGroup,
  WorkoutDay,
  PlanExercise,
} from '../../../core/models';

@Component({
  selector: 'app-smart-workout',
  standalone: true,
  imports: [FormsModule, ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent, ExercisePickerComponent],
  templateUrl: './smart-workout.html',
  styleUrl: './smart-workout.scss',
})
export class SmartWorkoutComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly generating = this.store.selectSignal(WorkoutState.generating);
  protected readonly dailyWorkout = this.store.selectSignal(WorkoutState.dailyWorkout);
  protected readonly generateError = this.store.selectSignal(WorkoutState.generateError);
  protected readonly activePlanId = this.store.selectSignal(ProfileState.activePlanId);

  protected readonly availableMinutes = signal(60);
  protected readonly selectedExercises = signal<Exercise[]>([]);
  protected readonly showPicker = signal(false);
  protected readonly equipment = signal<Record<EquipmentType, boolean>>({
    Barbell: true,
    Dumbbell: true,
    Cable: true,
    Machine: true,
    Bodyweight: true,
  });

  protected readonly equipmentTypes: EquipmentType[] = [
    'Barbell',
    'Dumbbell',
    'Cable',
    'Machine',
    'Bodyweight',
  ];

  protected readonly minuteOptions = [30, 45, 60, 75, 90];

  protected toggleEquipment(type: EquipmentType) {
    const current = this.equipment();
    this.equipment.set({ ...current, [type]: !current[type] });
  }

  protected generate() {
    const availableEquipment = this.equipmentTypes.filter(
      t => this.equipment()[t],
    );
    this.store.dispatch(
      new Workout.GenerateDailyWorkout(
        this.availableMinutes(),
        availableEquipment,
      ),
    );
  }

  protected startNow(result: DailyWorkoutResult) {
    this.store.dispatch(new Workout.StartGeneratedWorkout(result)).subscribe(() => {
      const session = this.store.selectSnapshot(WorkoutState.activeSession);
      if (session) {
        this.router.navigate(['/workouts', 'active', session.planId, session.dayNumber]);
      } else {
        this.router.navigate(['/workouts']);
      }
    });
  }

  protected saveToActivePlan(result: DailyWorkoutResult) {
    this.store.dispatch(new Workout.AddDayToActivePlan(result.workout)).subscribe(() => {
      this.router.navigate(['/workouts']);
    });
  }

  protected onExercisesPicked(exercises: Exercise[]) {
    this.selectedExercises.update(list => {
      const ids = new Set(list.map(e => e.id));
      const newOnes = exercises.filter(e => !ids.has(e.id));
      return [...list, ...newOnes];
    });
    this.showPicker.set(false);
  }

  protected removeExercise(exercise: Exercise) {
    this.selectedExercises.update(list => list.filter(e => e.id !== exercise.id));
  }

  protected startQuickWorkout() {
    const exercises = this.selectedExercises();
    if (exercises.length === 0) return;

    const day: WorkoutDay = {
      dayNumber: 1,
      name: `Quick Workout`,
      exerciseGroups: exercises.map((ex): ExerciseGroup => ({
        type: 'single',
        exercises: [{
          exerciseId: ex.id!,
          exerciseName: ex.name,
          sets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }],
        }],
        restSeconds: 90,
      })),
    };

    const result: DailyWorkoutResult = {
      workout: day,
      reasoning: 'Manual selection',
      estimatedMinutes: exercises.length * 8,
      musclesCovered: [...new Set(exercises.map(e => e.muscleGroup))],
    };

    this.store.dispatch(new Workout.StartGeneratedWorkout(result)).subscribe(() => {
      const session = this.store.selectSnapshot(WorkoutState.activeSession);
      if (session) {
        this.router.navigate(['/workouts', 'active', session.planId, session.dayNumber]);
      }
    });
  }

  protected goBack() {
    this.router.navigate(['/workouts']);
  }
}
