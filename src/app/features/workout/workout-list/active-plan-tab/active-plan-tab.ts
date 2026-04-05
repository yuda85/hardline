import { Component, input, output, signal, computed } from '@angular/core';
import { WorkoutPlan, WorkoutDay, ExerciseGroup } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components';
import { expandCollapse } from '../../../../shared/animations/expand-collapse';

@Component({
  selector: 'app-active-plan-tab',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './active-plan-tab.html',
  styleUrl: './active-plan-tab.scss',
  animations: [expandCollapse],
})
export class ActivePlanTabComponent {
  readonly activePlan = input<WorkoutPlan | null>(null);
  readonly switchTab = output<void>();
  readonly startDay = output<{ planId: string; dayNumber: number }>();

  protected readonly expandedDay = signal<number | null>(null);

  /** Pick the current day based on day-of-week cycling, skipping rest days */
  protected readonly currentDay = computed(() => {
    const plan = this.activePlan();
    if (!plan || plan.days.length === 0) return null;
    const workoutDays = plan.days.filter(d => d.exerciseGroups.length > 0);
    if (workoutDays.length === 0) return null;
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return workoutDays[dayOfYear % workoutDays.length];
  });

  protected toggleDay(dayNumber: number) {
    this.expandedDay.update(current => (current === dayNumber ? null : dayNumber));
  }

  protected isRestDay(day: WorkoutDay): boolean {
    return day.exerciseGroups.length === 0;
  }

  protected getExerciseCount(day: WorkoutDay): number {
    return day.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getEstimatedMinutes(day: WorkoutDay): number {
    const totalSets = day.exerciseGroups.reduce(
      (sum, g) => sum + g.exercises.reduce((s, e) => s + e.sets.length, 0),
      0,
    );
    return Math.round(totalSets * 2.5);
  }

  protected formatSets(sets: { targetReps: number }[]): string {
    if (sets.length === 0) return '';
    const allSame = sets.every(s => s.targetReps === sets[0].targetReps);
    if (allSame) return `${sets.length} x ${sets[0].targetReps}`;
    return sets.map(s => s.targetReps).join(', ');
  }

  protected getGroupLabel(group: ExerciseGroup): string {
    if (group.exercises.length === 1) {
      const sets = group.exercises[0].sets;
      if (sets.length > 0 && sets[0].targetReps <= 5) return 'Compound';
      if (sets.length > 0 && sets[0].targetReps <= 10) return 'Strength';
      return 'Hypertrophy';
    }
    return '';
  }

  protected getTotalExercises(): number {
    const plan = this.activePlan();
    if (!plan) return 0;
    return plan.days.reduce((sum, day) => sum + this.getExerciseCount(day), 0);
  }

  protected exerciseLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected onStartDay(planId: string, dayNumber: number) {
    this.startDay.emit({ planId, dayNumber });
  }
}
