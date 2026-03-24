import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { WorkoutPlan } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class WorkoutRepository extends BaseRepository<WorkoutPlan> {
  protected readonly collectionName = 'workoutPlans';

  getByUser(userId: string): Observable<WorkoutPlan[]> {
    return this.queryDocs([where('userId', '==', userId), orderBy('createdAt', 'desc')]);
  }
}
