import { Component, inject, OnInit, OnDestroy, computed, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { DecimalPipe } from '@angular/common';
import { ButtonComponent, CardComponent, BadgeComponent, IconButtonComponent } from '../../../shared/components';
import { SetEditorComponent } from '../set-editor/set-editor';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker';
import { WorkoutDay, ExerciseGroup, PlanExercise, PlanSet, Exercise, MuscleGroup } from '../../../core/models';
import { EXERCISES } from '../exercise-data';
import { expandCollapse } from '../../../shared/animations/expand-collapse';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [DecimalPipe, ButtonComponent, CardComponent, BadgeComponent, IconButtonComponent, SetEditorComponent, ExercisePickerComponent],
  templateUrl: './day-detail.html',
  styleUrl: './day-detail.scss',
  animations: [expandCollapse],
})
export class DayDetailComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = this.store.selectSignal(WorkoutState.loading);

  protected readonly planId = signal('');
  protected readonly dayNumber = signal(0);
  protected readonly dayData = signal<WorkoutDay | null>(null);
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly showExercisePicker = signal(false);
  protected readonly pickerTarget = signal<{ mode: 'add' | 'superset' | 'swap'; swapGroupIdx?: number; swapExIdx?: number; swapMuscleGroup?: MuscleGroup } | null>(null);
  protected readonly editingRest = signal<number | null>(null);
  protected readonly restPresets = [60, 90, 120, 180];

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  protected readonly equipment = computed((): string[] => {
    const d = this.dayData();
    if (!d) return [];
    const gear = new Set<string>();
    for (const group of d.exerciseGroups) {
      for (const ex of group.exercises) {
        const found = EXERCISES.find(e => e.id === ex.exerciseId);
        if (found?.equipment) gear.add(found.equipment);
      }
    }
    return Array.from(gear).sort();
  });

  protected readonly totalExercises = computed(() => {
    const d = this.dayData();
    if (!d) return 0;
    return d.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  });

  protected readonly totalSets = computed(() => {
    const d = this.dayData();
    if (!d) return 0;
    let count = 0;
    for (const g of d.exerciseGroups) {
      for (const ex of g.exercises) count += ex.sets.length;
    }
    return count;
  });

  constructor() {
    // Auto-save effect: debounce 1.5s after any dayData change
    effect(() => {
      const day = this.dayData();
      if (!day || !this.initialized) return;

      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.persistDay(), 1500);
    });
  }

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('planId') ?? '';
    const dayNum = Number(this.route.snapshot.paramMap.get('dayNumber'));
    this.planId.set(planId);
    this.dayNumber.set(dayNum);

    if (!planId || !dayNum) {
      this.router.navigate(['/workouts']);
      return;
    }

    const current = this.store.selectSnapshot(WorkoutState.activePlan);
    if (current && current.id === planId) {
      const day = current.days.find(d => d.dayNumber === dayNum);
      if (day) {
        this.dayData.set(JSON.parse(JSON.stringify(day)));
        this.initialized = true;
      }
    } else {
      this.store.dispatch(new Workout.LoadPlan(planId));
      this.store.select(WorkoutState.activePlan).pipe(take(2)).subscribe(plan => {
        if (plan && plan.id === planId) {
          const day = plan.days.find(d => d.dayNumber === dayNum);
          if (day) {
            this.dayData.set(JSON.parse(JSON.stringify(day)));
            this.initialized = true;
          }
        }
      });
    }
  }

  ngOnDestroy() {
    // Save immediately on leave if pending
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.persistDay();
    }
    if (this.savedTimer) clearTimeout(this.savedTimer);
  }

  // ── Editing Methods ──

  protected updateDayName(name: string) {
    this.dayData.update(d => d ? { ...d, name } : d);
  }

  protected updateSets(groupIdx: number, exIdx: number, sets: PlanSet[]) {
    this.dayData.update(d => {
      if (!d) return d;
      const updated = JSON.parse(JSON.stringify(d)) as WorkoutDay;
      updated.exerciseGroups[groupIdx].exercises[exIdx].sets = sets;
      return updated;
    });
  }

  protected updateRest(groupIdx: number, rest: number) {
    this.dayData.update(d => {
      if (!d) return d;
      const updated = JSON.parse(JSON.stringify(d)) as WorkoutDay;
      updated.exerciseGroups[groupIdx].restSeconds = rest;
      return updated;
    });
    this.editingRest.set(null);
  }

  protected updateNotes(groupIdx: number, exIdx: number, notes: string) {
    this.dayData.update(d => {
      if (!d) return d;
      const updated = JSON.parse(JSON.stringify(d)) as WorkoutDay;
      const ex = updated.exerciseGroups[groupIdx].exercises[exIdx];
      if (notes.trim()) { ex.notes = notes; } else { delete ex.notes; }
      return updated;
    });
  }

  protected deleteExerciseGroup(groupIdx: number) {
    this.dayData.update(d => {
      if (!d) return d;
      return { ...d, exerciseGroups: d.exerciseGroups.filter((_, i) => i !== groupIdx) };
    });
  }

  protected openAddExercise() {
    this.pickerTarget.set({ mode: 'add' });
    this.showExercisePicker.set(true);
  }

  protected openAddSuperset() {
    this.pickerTarget.set({ mode: 'superset' });
    this.showExercisePicker.set(true);
  }

  protected openSwapExercise(groupIdx: number, exIdx: number) {
    const d = this.dayData();
    if (!d) return;
    const ex = d.exerciseGroups[groupIdx].exercises[exIdx];
    const found = EXERCISES.find(e => e.id === ex.exerciseId);
    this.pickerTarget.set({
      mode: 'swap',
      swapGroupIdx: groupIdx,
      swapExIdx: exIdx,
      swapMuscleGroup: found?.muscleGroup,
    });
    this.showExercisePicker.set(true);
  }

  protected onMultipleExercisesPicked(exercises: Exercise[]) {
    const target = this.pickerTarget();
    if (!target) return;

    this.dayData.update(d => {
      if (!d) return d;
      const updated = JSON.parse(JSON.stringify(d)) as WorkoutDay;
      const defaultSets: PlanSet[] = [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }];

      for (const exercise of exercises) {
        updated.exerciseGroups.push({
          type: 'single',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: defaultSets }],
          restSeconds: 60,
        });
      }

      return updated;
    });

    this.showExercisePicker.set(false);
    this.pickerTarget.set(null);
  }

  protected onExercisePicked(exercise: Exercise) {
    const target = this.pickerTarget();
    if (!target) return;

    this.dayData.update(d => {
      if (!d) return d;
      const updated = JSON.parse(JSON.stringify(d)) as WorkoutDay;
      const defaultSets: PlanSet[] = [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }];

      if (target.mode === 'add') {
        updated.exerciseGroups.push({
          type: 'single',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: defaultSets }],
          restSeconds: 60,
        });
      } else if (target.mode === 'superset') {
        updated.exerciseGroups.push({
          type: 'superset',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: defaultSets }],
          restSeconds: 60,
        });
      } else if (target.mode === 'swap' && target.swapGroupIdx !== undefined && target.swapExIdx !== undefined) {
        const ex = updated.exerciseGroups[target.swapGroupIdx].exercises[target.swapExIdx];
        ex.exerciseId = exercise.id!;
        ex.exerciseName = exercise.name;
      }

      return updated;
    });

    this.showExercisePicker.set(false);
    this.pickerTarget.set(null);
  }

  protected closePicker() {
    this.showExercisePicker.set(false);
    this.pickerTarget.set(null);
  }

  protected toggleRestEditor(groupIdx: number) {
    this.editingRest.update(current => current === groupIdx ? null : groupIdx);
  }

  // ── Navigation ──

  protected startWorkout() {
    // Save immediately before starting
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.persistDay();
    }
    this.router.navigate(['/workouts', 'active', this.planId(), this.dayNumber()]);
  }

  protected goBack() {
    this.router.navigate(['/workouts']);
  }

  protected formatRest(seconds: number): string {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  }

  // ── Auto-save ──

  private persistDay() {
    const day = this.dayData();
    const planId = this.planId();
    const dayNum = this.dayNumber();
    if (!day || !planId || !dayNum) return;

    this.saveStatus.set('saving');
    this.store.dispatch(new Workout.UpdatePlanDay(planId, dayNum, day)).subscribe(() => {
      this.saveStatus.set('saved');
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => this.saveStatus.set('idle'), 2000);
    });
  }
}
