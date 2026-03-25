import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { DailySteps } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class StepsRepository extends BaseRepository<DailySteps> {
  protected readonly collectionName = 'dailySteps';

  getByDate(userId: string, date: string): Observable<DailySteps[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '==', date),
    ]);
  }

  async upsert(userId: string, date: string, steps: number, caloriesBurned: number): Promise<void> {
    const docId = `${userId}_${date}`;
    const ref = doc(this.firestore, this.collectionName, docId);
    await setDoc(ref, {
      userId,
      date,
      steps,
      caloriesBurned,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
}
