import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { DecimalPipe } from '@angular/common';
import { SessionRepository } from '../../../data/repositories/session.repository';
import { PRRepository } from '../../../data/repositories/pr.repository';
import { OneRepMaxService } from '../../../core/services/one-rep-max.service';
import { AuthState } from '../../../store/auth/auth.state';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import { WorkoutSession, PersonalRecord } from '../../../core/models';

@Component({
  selector: 'app-session-summary',
  standalone: true,
  imports: [DecimalPipe, ButtonComponent, CardComponent, BadgeComponent],
  templateUrl: './session-summary.html',
  styleUrl: './session-summary.scss',
})
export class SessionSummaryComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly sessionRepo = inject(SessionRepository);
  private readonly prRepo = inject(PRRepository);
  private readonly oneRMService = inject(OneRepMaxService);

  protected readonly session = signal<WorkoutSession | null>(null);
  protected readonly prs = signal<PersonalRecord[]>([]);
  protected readonly totalVolume = signal(0);
  protected readonly totalSets = signal(0);
  protected readonly totalReps = signal(0);
  protected readonly duration = signal('');

  // PRs that match exercises in this session
  protected readonly sessionPRs = computed(() => {
    const s = this.session();
    const allPRs = this.prs();
    if (!s || !allPRs.length) return [];
    const exerciseIds = new Set<string>();
    for (const group of s.exerciseGroups) {
      for (const ex of group.exercises) {
        exerciseIds.add(ex.exerciseId);
      }
    }
    return allPRs.filter(pr => exerciseIds.has(pr.exerciseId));
  });

  ngOnInit() {
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) { this.router.navigate(['/workouts']); return; }

    this.sessionRepo.getHistory(uid, 1).pipe(take(1)).subscribe(sessions => {
      const latest = sessions[0];
      if (!latest) { this.router.navigate(['/workouts']); return; }
      this.session.set(latest);
      this.calculateStats(latest);
    });

    this.prRepo.getAllForUser(uid).pipe(take(1)).subscribe(records => {
      this.prs.set(records);
    });
  }

  protected goToWorkouts() {
    this.router.navigate(['/workouts']);
  }

  protected getEstimated1RM(weight: number, reps: number): number {
    return this.oneRMService.calculate(weight, reps);
  }

  protected getPR(exerciseId: string): PersonalRecord | undefined {
    return this.prs().find(pr => pr.exerciseId === exerciseId);
  }

  protected getExerciseReps(ex: { sets: { completed: boolean; actualReps: number }[] }): number {
    return ex.sets.filter(s => s.completed).reduce((sum, s) => sum + s.actualReps, 0);
  }

  private calculateStats(session: WorkoutSession) {
    let volume = 0, sets = 0, reps = 0;
    for (const group of session.exerciseGroups) {
      for (const ex of group.exercises) {
        for (const set of ex.sets) {
          if (set.completed) {
            sets++;
            reps += set.actualReps;
            volume += set.actualReps * set.weight;
          }
        }
      }
    }
    this.totalVolume.set(volume);
    this.totalSets.set(sets);
    this.totalReps.set(reps);

    if (session.startedAt && session.completedAt) {
      const start = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt as unknown as string);
      const end = session.completedAt instanceof Date ? session.completedAt : new Date(session.completedAt as unknown as string);
      const mins = Math.floor((end.getTime() - start.getTime()) / 60000);
      this.duration.set(`${mins} min`);
    }
  }
}
