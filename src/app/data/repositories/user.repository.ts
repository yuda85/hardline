import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { doc, docData, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { UserProfile, DEFAULT_USER_GOALS, DEFAULT_USER_PREFERENCES } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class UserRepository extends BaseRepository<UserProfile> {
  protected readonly collectionName = 'users';

  getByUid(uid: string): Observable<UserProfile | undefined> {
    return docData(doc(this.firestore, this.collectionName, uid), {
      idField: 'id',
    }) as Observable<UserProfile | undefined>;
  }

  async createOrUpdate(user: UserProfile): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, user.uid);
    await setDoc(
      ref,
      {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        goals: user.goals ?? DEFAULT_USER_GOALS,
        preferences: user.preferences ?? DEFAULT_USER_PREFERENCES,
        updatedAt: serverTimestamp(),
        createdAt: user.createdAt ?? serverTimestamp(),
      },
      { merge: true },
    );
  }
}
