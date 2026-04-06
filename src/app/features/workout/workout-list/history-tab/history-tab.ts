import { Component, input, output, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../../../shared/components';
import { WorkoutSession } from '../../../../core/models';
import { expandCollapse } from '../../../../shared/animations/expand-collapse';

interface EditingSet {
  sessionId: string;
  groupIndex: number;
  exerciseIndex: number;
  setIndex: number;
  weight: number;
  reps: number;
}

@Component({
  selector: 'app-history-tab',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, BadgeComponent],
  templateUrl: './history-tab.html',
  styleUrl: './history-tab.scss',
  animations: [expandCollapse],
})
export class HistoryTabComponent {
  readonly sessions = input.required<WorkoutSession[]>();
  readonly loading = input(false);

  readonly deleteSession = output<string>();
  readonly updateSet = output<{
    sessionId: string;
    groupIndex: number;
    exerciseIndex: number;
    setIndex: number;
    weight: number;
    reps: number;
  }>();

  protected readonly expandedSession = signal<string | null>(null);
  protected readonly editingSet = signal<EditingSet | null>(null);
  protected readonly confirmingDelete = signal<string | null>(null);

  protected toggleExpand(sessionId: string) {
    this.expandedSession.update(current => (current === sessionId ? null : sessionId));
    // Close any editing when collapsing
    if (this.expandedSession() !== sessionId) {
      this.editingSet.set(null);
    }
  }

  protected getSessionDuration(session: WorkoutSession): string {
    if (!session.completedAt || !session.startedAt) return '';
    const start = session.startedAt instanceof Date
      ? session.startedAt
      : new Date((session.startedAt as any).seconds * 1000);
    const end = session.completedAt instanceof Date
      ? session.completedAt
      : new Date((session.completedAt as any).seconds * 1000);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  protected getExerciseCount(session: WorkoutSession): number {
    return session.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getTotalSets(session: WorkoutSession): number {
    let count = 0;
    for (const group of session.exerciseGroups) {
      for (const ex of group.exercises) {
        count += ex.sets.filter(s => s.completed).length;
      }
    }
    return count;
  }

  protected getTotalVolume(session: WorkoutSession): number {
    let volume = 0;
    for (const group of session.exerciseGroups) {
      for (const ex of group.exercises) {
        for (const set of ex.sets) {
          if (set.completed) {
            volume += set.weight * set.actualReps;
          }
        }
      }
    }
    return Math.round(volume);
  }

  protected toDate(value: Date | { seconds: number }): Date {
    return value instanceof Date ? value : new Date((value as { seconds: number }).seconds * 1000);
  }

  protected startEdit(
    sessionId: string,
    groupIndex: number,
    exerciseIndex: number,
    setIndex: number,
    weight: number,
    reps: number,
  ) {
    this.editingSet.set({ sessionId, groupIndex, exerciseIndex, setIndex, weight, reps });
  }

  protected isEditing(sessionId: string, groupIndex: number, exerciseIndex: number, setIndex: number): boolean {
    const e = this.editingSet();
    return e !== null
      && e.sessionId === sessionId
      && e.groupIndex === groupIndex
      && e.exerciseIndex === exerciseIndex
      && e.setIndex === setIndex;
  }

  protected cancelEdit() {
    this.editingSet.set(null);
  }

  protected saveEdit() {
    const e = this.editingSet();
    if (!e) return;
    this.updateSet.emit({
      sessionId: e.sessionId,
      groupIndex: e.groupIndex,
      exerciseIndex: e.exerciseIndex,
      setIndex: e.setIndex,
      weight: e.weight,
      reps: e.reps,
    });
    this.editingSet.set(null);
  }

  protected requestDelete(sessionId: string, event: Event) {
    event.stopPropagation();
    this.confirmingDelete.set(sessionId);
  }

  protected cancelDelete(event: Event) {
    event.stopPropagation();
    this.confirmingDelete.set(null);
  }

  protected confirmDelete(sessionId: string, event: Event) {
    event.stopPropagation();
    this.confirmingDelete.set(null);
    this.deleteSession.emit(sessionId);
  }
}
