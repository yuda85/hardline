import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { doc, docData, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { GoalSettings } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class GoalSettingsRepository extends BaseRepository<GoalSettings> {
  protected readonly collectionName = 'goalSettings';

  getByUser(userId: string): Observable<GoalSettings | undefined> {
    return docData(doc(this.firestore, this.collectionName, userId), {
      idField: 'id',
    }) as Observable<GoalSettings | undefined>;
  }

  async save(userId: string, settings: Omit<GoalSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, userId);
    await setDoc(ref, {
      ...settings,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
}
