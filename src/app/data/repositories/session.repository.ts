import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, limit } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { WorkoutSession } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class SessionRepository extends BaseRepository<WorkoutSession> {
  protected readonly collectionName = 'workoutSessions';

  getActive(userId: string): Observable<WorkoutSession[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('completedAt', '==', null),
      orderBy('startedAt', 'desc'),
      limit(1),
    ]);
  }

  getHistory(userId: string, count: number): Observable<WorkoutSession[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(count),
    ]);
  }
}
