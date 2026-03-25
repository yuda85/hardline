import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy, limit, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { WeeklySummary } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class WeeklySummaryRepository extends BaseRepository<WeeklySummary> {
  protected readonly collectionName = 'weeklySummaries';

  getByWeek(userId: string, weekStart: string): Observable<WeeklySummary[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('weekStart', '==', weekStart),
    ]);
  }

  getHistory(userId: string, count: number): Observable<WeeklySummary[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      orderBy('weekStart', 'desc'),
      limit(count),
    ]);
  }

  async upsert(userId: string, weekStart: string, summary: Omit<WeeklySummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const docId = `${userId}_${weekStart}`;
    const ref = doc(this.firestore, this.collectionName, docId);
    await setDoc(ref, {
      ...summary,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
}
