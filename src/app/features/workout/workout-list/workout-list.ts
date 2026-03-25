import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkoutState } from '../../../store/workout/workout.state';
import { AuthState } from '../../../store/auth/auth.state';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutIOService } from '../../../core/services/workout-io.service';
import { ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent, SkeletonComponent } from '../../../shared/components';
import { WorkoutPlan, WorkoutDay } from '../../../core/models';
import { SAMPLE_PLANS_DAYS } from '../exercise-data';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.scss',
})
export class WorkoutListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly workoutIO = inject(WorkoutIOService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected readonly plans = this.store.selectSignal(WorkoutState.plans);
  protected readonly loading = this.store.selectSignal(WorkoutState.loading);
  protected readonly seeding = signal(false);
  protected readonly importError = signal<string | null>(null);
  protected readonly expandedPlan = signal<string | null>(null);

  ngOnInit() {
    this.store.dispatch(new Workout.FetchPlans());
  }

  protected togglePlan(planId: string) {
    this.expandedPlan.update(current => (current === planId ? null : planId));
  }

  protected startDay(planId: string, dayNumber: number) {
    this.router.navigate(['/workouts', 'day', planId, dayNumber]);
  }

  protected editPlan(planId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'edit', planId]);
  }

  protected deletePlan(planId: string, event: Event) {
    event.stopPropagation();
    this.store.dispatch(new Workout.DeletePlan(planId));
  }

  protected exportPlan(plan: WorkoutPlan, event: Event) {
    event.stopPropagation();
    this.workoutIO.exportPlan(plan);
  }

  protected triggerImport() {
    this.fileInput.nativeElement.click();
  }

  protected async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importError.set(null);
    try {
      const planData = await this.workoutIO.importPlan(file);
      const uid = this.store.selectSnapshot(AuthState.uid);
      if (!uid) return;
      this.store.dispatch(new Workout.SavePlan({ ...planData, userId: uid }));
    } catch (err) {
      this.importError.set(err instanceof Error ? err.message : 'Import failed');
    }
    input.value = '';
  }

  protected async clearAndReload() {
    this.seeding.set(true);
    // Delete all existing plans
    for (const plan of this.plans()) {
      if (plan.id) {
        await new Promise<void>(resolve => {
          this.store.dispatch(new Workout.DeletePlan(plan.id!)).subscribe(() => resolve());
        });
      }
    }
    // Seed fresh plans
    await this.seedExamples();
  }

  protected async seedExamples() {
    this.seeding.set(true);
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;
    for (const plan of SAMPLE_PLANS_DAYS) {
      await new Promise<void>(resolve => {
        this.store
          .dispatch(new Workout.SavePlan({ ...plan, userId: uid }))
          .subscribe(() => resolve());
      });
    }
    this.seeding.set(false);
  }

  protected getExerciseCount(day: WorkoutDay): number {
    return day.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getGroupTypeLabel(type: string): string {
    if (type === 'superset') return 'SS';
    if (type === 'circuit') return 'CIR';
    return '';
  }
}
