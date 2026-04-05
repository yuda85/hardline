import { Component, computed, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ExerciseHistoryEntry } from '../../../store/workout/workout.model';
import { PersonalRecord } from '../../../core/models';

@Component({
  selector: 'app-exercise-history-sheet',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './exercise-history-sheet.html',
  styleUrl: './exercise-history-sheet.scss',
})
export class ExerciseHistorySheetComponent {
  readonly exerciseName = input.required<string>();
  readonly historyEntries = input.required<ExerciseHistoryEntry[]>();
  readonly currentPR = input<PersonalRecord | null>(null);

  readonly closed = output<void>();
  readonly weightSelected = output<number>();

  readonly maxWeight = computed(() => {
    const entries = this.historyEntries();
    if (entries.length === 0) return 0;
    return Math.max(
      ...entries.flatMap(e => e.sets.map(s => s.weight))
    );
  });

  readonly chartPoints = computed(() => {
    const entries = this.historyEntries();
    if (entries.length === 0) return [];

    const chronological = [...entries].reverse();
    const max1RM = Math.max(...chronological.map(e => e.best1RM));
    if (max1RM === 0) return [];

    const count = chronological.length;
    return chronological.map((entry, i) => {
      const x = count === 1 ? 50 : (i / (count - 1)) * 100;
      const y = 40 - (entry.best1RM / max1RM) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
  });

  readonly chartPolyline = computed(() => this.chartPoints().join(' '));

  readonly chartAreaPoints = computed(() => {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    return `0,40 ${points.join(' ')} 100,40`;
  });

  readonly currentOneRepMax = computed(() => {
    const pr = this.currentPR();
    if (pr) return pr.oneRepMax;
    const entries = this.historyEntries();
    if (entries.length > 0) return entries[0].best1RM;
    return 0;
  });

  protected bestSetForEntry(entry: ExerciseHistoryEntry): { weight: number; reps: number } {
    return entry.sets.reduce(
      (best, set) => (set.weight > best.weight ? set : best),
      entry.sets[0]
    );
  }

  protected selectWeight(weight: number): void {
    this.weightSelected.emit(weight);
  }
}
