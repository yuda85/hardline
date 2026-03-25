import { Component, input, output } from '@angular/core';
import { SessionExerciseGroup } from '../../../core/models';

@Component({
  selector: 'app-exercise-list-sheet',
  standalone: true,
  templateUrl: './exercise-list-sheet.html',
  styleUrl: './exercise-list-sheet.scss',
})
export class ExerciseListSheetComponent {
  readonly groups = input.required<SessionExerciseGroup[]>();
  readonly currentGroupIndex = input(0);
  readonly currentExerciseIndex = input(0);
  readonly closed = output<void>();
  readonly selected = output<{ groupIndex: number; exerciseIndex: number }>();

  protected isCurrentExercise(gi: number, ei: number): boolean {
    return gi === this.currentGroupIndex() && ei === this.currentExerciseIndex();
  }

  protected isGroupDone(group: SessionExerciseGroup): boolean {
    return group.exercises.every(ex => ex.sets.every(s => s.completed));
  }

  protected isExerciseDone(ex: { sets: { completed: boolean }[] }): boolean {
    return ex.sets.every(s => s.completed);
  }

  protected completedSets(ex: { sets: { completed: boolean }[] }): number {
    return ex.sets.filter(s => s.completed).length;
  }
}
