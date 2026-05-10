import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MuscleGroup } from '../../../core/models';
import { EXERCISES, muscleGroupLabel } from '../exercise-data';

type Mode = 'smart' | 'all';

@Component({
  selector: 'app-swap-exercise-sheet',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './swap-exercise-sheet.html',
  styleUrl: './swap-exercise-sheet.scss',
})
export class SwapExerciseSheetComponent {
  @Input({ required: true }) currentExerciseId!: string;
  @Input({ required: true }) currentMuscleGroup!: MuscleGroup;

  @Output() closed = new EventEmitter<void>();
  @Output() picked = new EventEmitter<{ exerciseId: string; exerciseName: string }>();

  protected readonly mode = signal<Mode>('smart');
  protected readonly searchQuery = signal('');
  protected readonly selectedMuscleFilter = signal<MuscleGroup | 'all'>('all');

  protected readonly muscleGroups: MuscleGroup[] = [
    MuscleGroup.Chest,
    MuscleGroup.Back,
    MuscleGroup.Shoulders,
    MuscleGroup.UpperLegs,
    MuscleGroup.Hamstrings,
    MuscleGroup.Glutes,
    MuscleGroup.LowerLegs,
    MuscleGroup.Biceps,
    MuscleGroup.Triceps,
    MuscleGroup.Core,
    MuscleGroup.FullBody,
  ];

  protected readonly smartList = computed(() => {
    return EXERCISES.filter(
      ex => ex.muscleGroup === this.currentMuscleGroup && ex.id !== this.currentExerciseId,
    );
  });

  protected readonly allFiltered = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const muscle = this.selectedMuscleFilter();
    return EXERCISES.filter(ex => {
      if (ex.id === this.currentExerciseId) return false;
      if (muscle !== 'all' && ex.muscleGroup !== muscle) return false;
      if (!query) return true;
      return (
        ex.name.toLowerCase().includes(query) ||
        ex.equipment.toLowerCase().includes(query) ||
        ex.tags.some(t => t.toLowerCase().includes(query))
      );
    });
  });

  protected readonly groupedAll = computed(() => {
    const filtered = this.allFiltered();
    const groups = new Map<string, (typeof EXERCISES)[0][]>();
    for (const ex of filtered) {
      const key = ex.muscleGroup;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(ex);
    }
    return Array.from(groups.entries()).map(([group, exercises]) => ({ group, exercises }));
  });

  protected label(group: MuscleGroup | string): string {
    return muscleGroupLabel(group);
  }

  protected setMode(m: Mode) {
    this.mode.set(m);
  }

  protected setMuscleFilter(group: MuscleGroup | 'all') {
    this.selectedMuscleFilter.set(group);
  }

  protected pick(ex: (typeof EXERCISES)[0]) {
    this.picked.emit({ exerciseId: ex.id!, exerciseName: ex.name });
  }
}
