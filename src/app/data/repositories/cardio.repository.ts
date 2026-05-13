import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { CardioEntry } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class CardioRepository extends BaseRepository<CardioEntry> {
  protected readonly collectionName = 'cardioEntries';

  getByDate(userId: string, date: string): Observable<CardioEntry[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '==', date),
      orderBy('timestamp', 'desc'),
    ]);
  }

  getByDateRange(userId: string, startDate: string, endDate: string): Observable<CardioEntry[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
    ]);
  }

  getByUser(userId: string): Observable<CardioEntry[]> {
    return this.queryDocs([where('userId', '==', userId), orderBy('date', 'desc')]);
  }
}
