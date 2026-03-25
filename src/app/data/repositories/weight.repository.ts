import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, limit } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { WeightEntry } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class WeightRepository extends BaseRepository<WeightEntry> {
  protected readonly collectionName = 'weightEntries';

  getByDate(userId: string, date: string): Observable<WeightEntry[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '==', date),
    ]);
  }

  getHistory(userId: string, count: number): Observable<WeightEntry[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(count),
    ]);
  }
}
