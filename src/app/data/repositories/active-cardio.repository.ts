import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { CardioActivityType } from '../../core/models/cardio-session.model';

/**
 * Minimal record stored at `active-cardio/{userId}` while a session is in
 * progress. Acts as the "is a session in flight" flag that survives page
 * reloads. The full per-second point buffer continues to live in IndexedDB —
 * this doc only carries the metadata needed to re-link to it.
 */
export interface ActiveCardioRecord {
  userId: string;
  sessionLocalId: string;
  activityType: CardioActivityType;
  startedAt: number;
  /** Last time the recording wrote a point — used for stale-session expiry. */
  lastSeenAt: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class ActiveCardioRepository {
  private readonly firestore = inject(Firestore);
  private readonly collection = 'active-cardio';

  private docRef(userId: string) {
    return doc(this.firestore, this.collection, userId);
  }

  watch(userId: string): Observable<ActiveCardioRecord | undefined> {
    return docData(this.docRef(userId)) as Observable<ActiveCardioRecord | undefined>;
  }

  async upsert(record: ActiveCardioRecord): Promise<void> {
    await setDoc(
      this.docRef(record.userId),
      {
        ...record,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async touch(userId: string, lastSeenAt: number): Promise<void> {
    await setDoc(
      this.docRef(userId),
      { lastSeenAt, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async clear(userId: string): Promise<void> {
    try {
      await deleteDoc(this.docRef(userId));
    } catch {
      /* noop — may already be deleted */
    }
  }
}
