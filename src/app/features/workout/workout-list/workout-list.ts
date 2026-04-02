import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkoutState } from '../../../store/workout/workout.state';
import { AuthState } from '../../../store/auth/auth.state';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutIOService } from '../../../core/services/workout-io.service';
import { ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent } from '../../../shared/components';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { WorkoutPlan, WorkoutDay } from '../../../core/models';
import { analyzeVolume, VolumeAnalysis, MuscleGroupVolume } from '../../../core/services/volume-analysis.service';
import { SAMPLE_PLANS_DAYS } from '../exercise-data';
import { expandCollapse } from '../../../shared/animations/expand-collapse';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [DecimalPipe, ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent, RelativeTimePipe],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.scss',
  animations: [expandCollapse],
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
    // Clear volume cache when plans change
    this.store.select(WorkoutState.plans).subscribe(() => this.volumeCache.clear());
  }

  protected togglePlan(planId: string) {
    this.expandedPlan.update(current => (current === planId ? null : planId));
  }

  protected previewDay(planId: string, dayNumber: number, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'day', planId, dayNumber]);
  }

  protected startDay(planId: string, dayNumber: number, event?: Event) {
    event?.stopPropagation();
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
    for (const plan of this.plans()) {
      if (plan.id) {
        await new Promise<void>(resolve => {
          this.store.dispatch(new Workout.DeletePlan(plan.id!)).subscribe(() => resolve());
        });
      }
    }
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

  private readonly volumeCache = new Map<string, VolumeAnalysis>();

  protected getVolumeAnalysis(plan: WorkoutPlan): VolumeAnalysis {
    const key = plan.id ?? plan.name;
    const cached = this.volumeCache.get(key);
    if (cached) return cached;
    const analysis = analyzeVolume(plan);
    this.volumeCache.set(key, analysis);
    return analysis;
  }

  protected getBarWidth(group: MuscleGroupVolume): number {
    if (group.sets === 0) return 0;
    const max = group.maxRecommended || 1;
    return Math.min(100, Math.round((group.sets / max) * 100));
  }

  protected getScoreLevel(score: number): string {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warn';
    return 'bad';
  }

  protected getExerciseCount(day: WorkoutDay): number {
    return day.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getGroupTypes(day: WorkoutDay): string[] {
    const types = new Set<string>();
    for (const group of day.exerciseGroups) {
      if (group.type === 'superset') types.add('SS');
      else if (group.type === 'circuit') types.add('CIR');
    }
    return [...types];
  }
}
