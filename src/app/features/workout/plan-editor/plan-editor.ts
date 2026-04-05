import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { Workout } from '../../../store/workout/workout.actions';
import { AuthState } from '../../../store/auth/auth.state';
import { WorkoutRepository } from '../../../data/repositories/workout.repository';
import { ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent } from '../../../shared/components';
import { ExercisePickerComponent } from '../exercise-picker/exercise-picker';
import { SetEditorComponent } from '../set-editor/set-editor';
import { expandCollapse } from '../../../shared/animations/expand-collapse';
import { PLAN_TEMPLATES, PlanTemplate } from './plan-templates';
import { WorkoutDay, ExerciseGroup, PlanExercise, PlanSet, Exercise, MuscleGroup } from '../../../core/models';
import { EXERCISES } from '../exercise-data';

@Component({
  selector: 'app-plan-editor',
  standalone: true,
  imports: [
    FormsModule, DragDropModule,
    ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent,
    ExercisePickerComponent, SetEditorComponent,
  ],
  templateUrl: './plan-editor.html',
  styleUrl: './plan-editor.scss',
  animations: [expandCollapse],
})
export class PlanEditorComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workoutRepo = inject(WorkoutRepository);

  protected readonly templates = PLAN_TEMPLATES;
  protected readonly isNew = signal(true);
  protected readonly planId = signal('');
  protected readonly planName = signal('');
  protected readonly planDescription = signal('');
  protected readonly days = signal<WorkoutDay[]>([]);
  protected readonly saving = signal(false);
  protected readonly showTemplatePicker = signal(false);
  protected readonly expandedDay = signal<number | null>(null);
  protected readonly editingExercise = signal<{ dayIdx: number; groupIdx: number; exIdx: number } | null>(null);
  protected readonly showExercisePicker = signal(false);
  protected readonly pickerTarget = signal<{ dayIdx: number; mode: 'add' | 'superset' | 'swap'; swapGroupIdx?: number; swapExIdx?: number; swapMuscleGroup?: MuscleGroup } | null>(null);
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('planId') ?? 'new';
    if (id === 'new') {
      this.isNew.set(true);
      this.showTemplatePicker.set(true);
    } else {
      this.isNew.set(false);
      this.planId.set(id);
      this.loadExistingPlan(id);
    }
  }

  // --- Template picker ---
  protected selectTemplate(template: PlanTemplate) {
    this.planName.set(template.id === 'blank' ? '' : template.name);
    this.planDescription.set(template.id === 'blank' ? '' : template.description);
    this.days.set(JSON.parse(JSON.stringify(template.days)));
    this.showTemplatePicker.set(false);
    if (this.days().length > 0) {
      this.expandedDay.set(0);
    }
  }

  // --- Days ---
  protected addDay() {
    const current = this.days();
    const newDay: WorkoutDay = {
      dayNumber: current.length + 1,
      name: `Day ${current.length + 1}`,
      exerciseGroups: [],
    };
    this.days.set([...current, newDay]);
    this.expandedDay.set(current.length);
    this.autoSave();
  }

  protected deleteDay(index: number) {
    const updated = this.days().filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    this.days.set(updated);
    this.expandedDay.set(null);
    this.autoSave();
  }

  protected duplicateDay(index: number) {
    const source = this.days()[index];
    const copy: WorkoutDay = {
      ...JSON.parse(JSON.stringify(source)),
      dayNumber: this.days().length + 1,
      name: `${source.name} (Copy)`,
    };
    this.days.set([...this.days(), copy]);
  }

  protected updateDayName(index: number, name: string) {
    this.days.update(days => days.map((d, i) => (i === index ? { ...d, name } : d)));
    this.autoSave();
  }

  protected dropDay(event: CdkDragDrop<WorkoutDay[]>) {
    const days = [...this.days()];
    moveItemInArray(days, event.previousIndex, event.currentIndex);
    this.days.set(days.map((d, i) => ({ ...d, dayNumber: i + 1 })));
    this.haptic();
    this.autoSave();
  }

  // --- Exercises ---
  protected openExercisePicker(dayIdx: number, mode: 'add' | 'superset') {
    this.pickerTarget.set({ dayIdx, mode });
    this.showExercisePicker.set(true);
  }

  protected openSwapPicker(dayIdx: number, groupIdx: number, exIdx: number) {
    const group = this.days()[dayIdx].exerciseGroups[groupIdx];
    const ex = group.exercises[exIdx];
    const found = EXERCISES.find(e => e.id === ex.exerciseId);
    this.pickerTarget.set({
      dayIdx,
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

    this.days.update(days => {
      const updated = [...days];
      const day = { ...updated[target.dayIdx] };
      const groups = [...day.exerciseGroups];

      for (const exercise of exercises) {
        const newGroup: ExerciseGroup = {
          type: 'single',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }] }],
          restSeconds: 60,
        };
        groups.push(newGroup);
      }

      day.exerciseGroups = groups;
      updated[target.dayIdx] = day;
      return updated;
    });

    this.showExercisePicker.set(false);
    this.pickerTarget.set(null);
    this.autoSave();
  }

  protected onExercisePicked(exercise: Exercise) {
    const target = this.pickerTarget();
    if (!target) return;

    this.days.update(days => {
      const updated = [...days];
      const day = { ...updated[target.dayIdx] };
      const groups = [...day.exerciseGroups];

      if (target.mode === 'add') {
        const newGroup: ExerciseGroup = {
          type: 'single',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }] }],
          restSeconds: 60,
        };
        groups.push(newGroup);
      } else if (target.mode === 'superset') {
        const newGroup: ExerciseGroup = {
          type: 'superset',
          exercises: [{ exerciseId: exercise.id!, exerciseName: exercise.name, sets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }] }],
          restSeconds: 60,
        };
        groups.push(newGroup);
      } else if (target.mode === 'swap' && target.swapGroupIdx !== undefined && target.swapExIdx !== undefined) {
        const group = { ...groups[target.swapGroupIdx] };
        const exercises = [...group.exercises];
        exercises[target.swapExIdx] = { ...exercises[target.swapExIdx], exerciseId: exercise.id!, exerciseName: exercise.name };
        group.exercises = exercises;
        groups[target.swapGroupIdx] = group;
      }

      day.exerciseGroups = groups;
      updated[target.dayIdx] = day;
      return updated;
    });

    this.showExercisePicker.set(false);
    this.pickerTarget.set(null);
    this.autoSave();
  }

  protected addExerciseToSuperset(dayIdx: number, groupIdx: number, exercise: Exercise) {
    this.days.update(days => {
      const updated = [...days];
      const day = { ...updated[dayIdx] };
      const groups = [...day.exerciseGroups];
      const group = { ...groups[groupIdx] };
      group.exercises = [...group.exercises, { exerciseId: exercise.id!, exerciseName: exercise.name, sets: [{ targetReps: 10 }, { targetReps: 10 }, { targetReps: 10 }] }];
      groups[groupIdx] = group;
      day.exerciseGroups = groups;
      updated[dayIdx] = day;
      return updated;
    });
  }

  protected deleteExerciseGroup(dayIdx: number, groupIdx: number) {
    this.days.update(days => {
      const updated = [...days];
      const day = { ...updated[dayIdx] };
      day.exerciseGroups = day.exerciseGroups.filter((_, i) => i !== groupIdx);
      updated[dayIdx] = day;
      return updated;
    });
    this.autoSave();
  }

  protected dropExercise(dayIdx: number, event: CdkDragDrop<ExerciseGroup[]>) {
    this.days.update(days => {
      const updated = [...days];
      const day = { ...updated[dayIdx] };
      const groups = [...day.exerciseGroups];
      moveItemInArray(groups, event.previousIndex, event.currentIndex);
      day.exerciseGroups = groups;
      updated[dayIdx] = day;
      return updated;
    });
    this.haptic();
    this.autoSave();
  }

  // --- Sets/Rest/Notes update ---
  protected updateSets(dayIdx: number, groupIdx: number, exIdx: number, sets: PlanSet[]) {
    this.days.update(days => {
      const updated = JSON.parse(JSON.stringify(days));
      updated[dayIdx].exerciseGroups[groupIdx].exercises[exIdx].sets = sets;
      return updated;
    });
    this.autoSave();
  }

  protected updateRest(dayIdx: number, groupIdx: number, rest: number) {
    this.days.update(days => {
      const updated = JSON.parse(JSON.stringify(days));
      updated[dayIdx].exerciseGroups[groupIdx].restSeconds = rest;
      return updated;
    });
    this.autoSave();
  }

  protected updateNotes(dayIdx: number, groupIdx: number, exIdx: number, notes: string) {
    this.days.update(days => {
      const updated = JSON.parse(JSON.stringify(days));
      const ex = updated[dayIdx].exerciseGroups[groupIdx].exercises[exIdx];
      if (notes.trim()) {
        ex.notes = notes;
      } else {
        delete ex.notes;
      }
      return updated;
    });
    this.autoSave();
  }

  // --- Save ---
  protected async save() {
    const name = this.planName().trim();
    if (!name || this.days().length === 0) return;

    this.saving.set(true);
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;

    const plan = {
      userId: uid,
      name,
      ...(this.planDescription().trim() ? { description: this.planDescription().trim() } : {}),
      days: this.days(),
    };

    if (this.isNew()) {
      this.store.dispatch(new Workout.SavePlan(plan)).subscribe(() => {
        this.saving.set(false);
        this.router.navigate(['/workouts']);
      });
    } else {
      this.store.dispatch(new Workout.UpdatePlan(this.planId(), plan)).subscribe(() => {
        this.saving.set(false);
        this.router.navigate(['/workouts']);
      });
    }
  }

  protected duplicatePlan() {
    this.planName.update(n => `${n} (Copy)`);
    this.isNew.set(true);
    this.planId.set('');
  }

  protected goBack() {
    this.router.navigate(['/workouts']);
  }

  protected formatSets(sets: PlanSet[]): string {
    if (sets.length === 0) return '0 sets';
    const allSame = sets.every(s => s.targetReps === sets[0].targetReps);
    if (allSame) return `${sets.length}x${sets[0].targetReps}`;
    return sets.map(s => s.targetReps).join(', ');
  }

  protected toggleEditExercise(dayIdx: number, groupIdx: number, exIdx: number) {
    const current = this.editingExercise();
    if (current?.dayIdx === dayIdx && current?.groupIdx === groupIdx && current?.exIdx === exIdx) {
      this.editingExercise.set(null);
    } else {
      this.editingExercise.set({ dayIdx, groupIdx, exIdx });
    }
  }

  protected isEditing(dayIdx: number, groupIdx: number, exIdx: number): boolean {
    const e = this.editingExercise();
    return e?.dayIdx === dayIdx && e?.groupIdx === groupIdx && e?.exIdx === exIdx;
  }

  // --- Auto-save ---
  private autoSave() {
    if (this.isNew()) return;

    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.savedTimer) clearTimeout(this.savedTimer);

    this.saveTimer = setTimeout(() => {
      this.saveStatus.set('saving');
      this.store
        .dispatch(
          new Workout.UpdatePlan(this.planId(), {
            name: this.planName(),
            description: this.planDescription().trim() || undefined,
            days: this.days(),
          }),
        )
        .subscribe(() => {
          this.saveStatus.set('saved');
          this.savedTimer = setTimeout(() => this.saveStatus.set('idle'), 2000);
        });
    }, 1500);
  }

  ngOnDestroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      // Save immediately if a debounced save was pending
      if (!this.isNew()) {
        this.store.dispatch(
          new Workout.UpdatePlan(this.planId(), {
            name: this.planName(),
            description: this.planDescription().trim() || undefined,
            days: this.days(),
          }),
        );
      }
    }
    if (this.savedTimer) clearTimeout(this.savedTimer);
  }

  private loadExistingPlan(id: string) {
    this.workoutRepo.getById(id).pipe(take(1)).subscribe(plan => {
      if (!plan) { this.router.navigate(['/workouts']); return; }
      this.planName.set(plan.name);
      this.planDescription.set(plan.description ?? '');
      this.days.set(JSON.parse(JSON.stringify(plan.days ?? [])));
      if (this.days().length > 0) this.expandedDay.set(0);
    });
  }

  private haptic() {
    if ('vibrate' in navigator) navigator.vibrate(10);
  }
}
