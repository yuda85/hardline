import { Component, computed, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MuscleGroup } from '../../../core/models';
import { EXERCISES, muscleGroupLabel } from '../exercise-data';

@Component({
  selector: 'app-add-exercise-sheet',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './add-exercise-sheet.html',
  styleUrl: './add-exercise-sheet.scss',
})
export class AddExerciseSheetComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() exerciseAdded = new EventEmitter<{
    exerciseId: string;
    exerciseName: string;
    sets: number;
    targetReps: number;
  }>();

  protected readonly searchQuery = signal('');
  protected readonly selectedExercise = signal<(typeof EXERCISES)[0] | null>(null);
  protected readonly sets = signal(3);
  protected readonly targetReps = signal(10);

  protected readonly filteredExercises = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return EXERCISES;

    return EXERCISES.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query) ||
        ex.tags.some((t) => t.toLowerCase().includes(query)),
    );
  });

  protected readonly groupedExercises = computed(() => {
    const filtered = this.filteredExercises();
    const groups = new Map<string, (typeof EXERCISES)[0][]>();

    for (const ex of filtered) {
      const key = ex.muscleGroup;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ex);
    }

    return Array.from(groups.entries()).map(([group, exercises]) => ({
      group,
      exercises,
    }));
  });

  protected muscleGroupLabel(group: MuscleGroup | string): string {
    return muscleGroupLabel(group);
  }

  protected selectExercise(ex: (typeof EXERCISES)[0]) {
    this.selectedExercise.set(ex);
  }

  protected confirmAdd() {
    const ex = this.selectedExercise();
    if (!ex) return;

    this.exerciseAdded.emit({
      exerciseId: ex.id!,
      exerciseName: ex.name,
      sets: this.sets(),
      targetReps: this.targetReps(),
    });

    this.selectedExercise.set(null);
    this.sets.set(3);
    this.targetReps.set(10);
  }

  protected cancelSelection() {
    this.selectedExercise.set(null);
  }

  protected incrementSets(delta: number) {
    this.sets.update((v) => Math.max(1, v + delta));
  }

  protected incrementReps(delta: number) {
    this.targetReps.update((v) => Math.max(1, v + delta));
  }
}
