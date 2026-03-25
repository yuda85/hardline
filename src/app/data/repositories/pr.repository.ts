import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, limit } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { PersonalRecord } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class PRRepository extends BaseRepository<PersonalRecord> {
  protected readonly collectionName = 'personalRecords';

  getByExercise(userId: string, exerciseId: string): Observable<PersonalRecord[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('exerciseId', '==', exerciseId),
      orderBy('oneRepMax', 'desc'),
      limit(1),
    ]);
  }

  getAllForUser(userId: string): Observable<PersonalRecord[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      orderBy('date', 'desc'),
    ]);
  }
}
