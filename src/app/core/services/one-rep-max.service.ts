import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { PRRepository } from '../../data/repositories/pr.repository';
import { AuthState } from '../../store/auth/auth.state';
import { PersonalRecord } from '../models';

@Injectable({ providedIn: 'root' })
export class OneRepMaxService {
  private readonly prRepo = inject(PRRepository);
  private readonly store = inject(Store);

  /** Epley formula: 1RM = weight × (1 + reps / 30) */
  calculate(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  }

  /** Check if this set is a new PR and save if so. Returns the 1RM value. */
  async checkAndUpdatePR(
    exerciseId: string,
    exerciseName: string,
    weight: number,
    reps: number,
  ): Promise<{ oneRepMax: number; isNewPR: boolean }> {
    if (weight <= 0 || reps <= 0 || reps > 10) {
      return { oneRepMax: 0, isNewPR: false };
    }

    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return { oneRepMax: 0, isNewPR: false };

    const oneRepMax = this.calculate(weight, reps);

    const existing = await new Promise<PersonalRecord[]>(resolve => {
      this.prRepo
        .getByExercise(uid, exerciseId)
        .pipe(take(1))
        .subscribe(records => resolve(records));
    });

    const currentBest = existing[0]?.oneRepMax ?? 0;

    if (oneRepMax > currentBest) {
      if (existing[0]?.id) {
        await this.prRepo.update(existing[0].id, {
          oneRepMax,
          weight,
          reps,
          date: new Date(),
        });
      } else {
        await this.prRepo.create({
          userId: uid,
          exerciseId,
          exerciseName,
          oneRepMax,
          weight,
          reps,
          date: new Date(),
        });
      }
      return { oneRepMax, isNewPR: true };
    }

    return { oneRepMax, isNewPR: false };
  }
}
