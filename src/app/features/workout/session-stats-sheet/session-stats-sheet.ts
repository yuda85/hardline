import { Component, computed, input, output } from '@angular/core';
import { SessionExerciseGroup, MuscleGroup } from '../../../core/models';
import { EXERCISES } from '../exercise-data';

@Component({
  selector: 'app-session-stats-sheet',
  standalone: true,
  templateUrl: './session-stats-sheet.html',
  styleUrl: './session-stats-sheet.scss',
})
export class SessionStatsSheetComponent {
  readonly totalVolume = input.required<number>();
  readonly setsDone = input.required<number>();
  readonly setsTotal = input.required<number>();
  readonly prsHit = input.required<number>();
  readonly estimatedCalories = input.required<number>();
  readonly elapsedSeconds = input.required<number>();
  readonly exerciseGroups = input.required<SessionExerciseGroup[]>();
  readonly closed = output<void>();

  protected readonly formattedDuration = computed(() => {
    const total = this.elapsedSeconds();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  });

  protected readonly muscleGroupVolume = computed(() => {
    const volumeMap: Record<string, number> = {};
    const exerciseLookup = new Map(EXERCISES.map(e => [e.id, e]));

    for (const group of this.exerciseGroups()) {
      for (const exercise of group.exercises) {
        const definition = exerciseLookup.get(exercise.exerciseId);
        if (!definition) continue;

        const muscleGroup = definition.muscleGroup;
        const exerciseVolume = exercise.sets
          .filter(s => s.completed)
          .reduce((sum, s) => sum + s.weight * s.actualReps, 0);

        volumeMap[muscleGroup] = (volumeMap[muscleGroup] ?? 0) + exerciseVolume;
      }
    }

    return Object.entries(volumeMap)
      .map(([group, volume]) => ({ group, volume }))
      .sort((a, b) => b.volume - a.volume);
  });

  protected readonly maxMuscleVolume = computed(() => {
    const entries = this.muscleGroupVolume();
    if (entries.length === 0) return 1;
    return Math.max(...entries.map(e => e.volume));
  });

  protected readonly exerciseBreakdown = computed(() => {
    const breakdown: {
      name: string;
      setsCompleted: number;
      setsTotal: number;
      volume: number;
      bestSet: string;
    }[] = [];

    for (const group of this.exerciseGroups()) {
      for (const exercise of group.exercises) {
        const completedSets = exercise.sets.filter(s => s.completed);
        const volume = completedSets.reduce(
          (sum, s) => sum + s.weight * s.actualReps,
          0
        );

        let bestSet = '-';
        if (completedSets.length > 0) {
          const best = completedSets.reduce((prev, curr) => {
            const prevMax = prev.weight * prev.actualReps;
            const currMax = curr.weight * curr.actualReps;
            return currMax > prevMax ? curr : prev;
          });
          bestSet = `${best.weight}kg x ${best.actualReps}`;
        }

        breakdown.push({
          name: exercise.exerciseName,
          setsCompleted: completedSets.length,
          setsTotal: exercise.sets.length,
          volume,
          bestSet,
        });
      }
    }

    return breakdown;
  });

  protected formatVolume(value: number): string {
    return value.toLocaleString('en-US');
  }

  protected formatMuscleGroup(group: string): string {
    return group.replace(/_/g, ' ');
  }

  protected barWidth(volume: number): string {
    const max = this.maxMuscleVolume();
    return `${(volume / max) * 100}%`;
  }
}
