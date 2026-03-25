import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { DailySummary } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class DailySummaryRepository extends BaseRepository<DailySummary> {
  protected readonly collectionName = 'dailySummaries';

  getByDate(userId: string, date: string): Observable<DailySummary[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '==', date),
    ]);
  }

  getByDateRange(userId: string, startDate: string, endDate: string): Observable<DailySummary[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc'),
    ]);
  }

  async upsert(userId: string, date: string, summary: Omit<DailySummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const docId = `${userId}_${date}`;
    const ref = doc(this.firestore, this.collectionName, docId);
    await setDoc(ref, {
      ...summary,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
}
