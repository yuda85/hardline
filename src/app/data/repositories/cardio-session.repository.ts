import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { limit, orderBy, where } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { CardioSession } from '../../core/models/cardio-session.model';

@Injectable({ providedIn: 'root' })
export class CardioSessionRepository extends BaseRepository<CardioSession> {
  protected readonly collectionName = 'cardio-sessions';

  listByUser(userId: string, max = 30): Observable<CardioSession[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(max),
    ]);
  }
}
