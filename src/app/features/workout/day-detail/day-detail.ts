import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { ButtonComponent, CardComponent, BadgeComponent, IconButtonComponent } from '../../../shared/components';
import { WorkoutDay } from '../../../core/models';
import { EXERCISES } from '../exercise-data';

@Component({
  selector: 'app-day-detail',
  standalone: true,
  imports: [ButtonComponent, CardComponent, BadgeComponent, IconButtonComponent],
  templateUrl: './day-detail.html',
  styleUrl: './day-detail.scss',
})
export class DayDetailComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly plan = this.store.selectSignal(WorkoutState.activePlan);
  protected readonly loading = this.store.selectSignal(WorkoutState.loading);

  private readonly planId = signal('');
  private readonly dayNumber = signal(0);

  protected readonly day = computed((): WorkoutDay | null => {
    const p = this.plan();
    if (!p) return null;
    return p.days.find(d => d.dayNumber === this.dayNumber()) ?? null;
  });

  protected readonly equipment = computed((): string[] => {
    const d = this.day();
    if (!d) return [];
    const gear = new Set<string>();
    for (const group of d.exerciseGroups) {
      for (const ex of group.exercises) {
        const found = EXERCISES.find(e => e.id === ex.exerciseId);
        if (found?.equipment) {
          gear.add(found.equipment);
        }
      }
    }
    return Array.from(gear).sort();
  });

  protected readonly totalExercises = computed(() => {
    const d = this.day();
    if (!d) return 0;
    return d.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  });

  protected readonly totalSets = computed(() => {
    const d = this.day();
    if (!d) return 0;
    let count = 0;
    for (const g of d.exerciseGroups) {
      for (const ex of g.exercises) {
        count += ex.sets.length;
      }
    }
    return count;
  });

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
    if (!current || current.id !== planId) {
      this.store.dispatch(new Workout.LoadPlan(planId));
    }
  }

  protected startWorkout() {
    this.router.navigate(['/workouts', 'active', this.planId(), this.dayNumber()]);
  }

  protected goBack() {
    this.router.navigate(['/workouts']);
  }

  protected formatSets(sets: { targetReps: number }[]): string {
    if (sets.length === 0) return '';
    const allSame = sets.every(s => s.targetReps === sets[0].targetReps);
    if (allSame) {
      return `${sets.length} x ${sets[0].targetReps}`;
    }
    return sets.map(s => s.targetReps).join(', ');
  }

  protected formatRest(seconds: number): string {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  }
}
