import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  QueryConstraint,
  serverTimestamp,
} from '@angular/fire/firestore';
import { FirestoreDoc } from '../../core/models';

export abstract class BaseRepository<T extends FirestoreDoc> {
  protected abstract readonly collectionName: string;
  protected readonly firestore = inject(Firestore);

  protected get collectionRef() {
    return collection(this.firestore, this.collectionName);
  }

  protected docRef(id: string) {
    return doc(this.firestore, this.collectionName, id);
  }

  getById(id: string): Observable<T | undefined> {
    return docData(this.docRef(id), { idField: 'id' }) as Observable<T | undefined>;
  }

  getAll(): Observable<T[]> {
    return collectionData(this.collectionRef, { idField: 'id' }) as Observable<T[]>;
  }

  queryDocs(constraints: QueryConstraint[]): Observable<T[]> {
    const q = query(this.collectionRef, ...constraints);
    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const cleaned = this.stripUndefined(data) as Record<string, unknown>;
    const docRef = await addDoc(this.collectionRef, {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const { id: _id, createdAt: _ca, ...rest } = data as Record<string, unknown>;
    const cleaned = this.stripUndefined(rest) as Record<string, unknown>;
    await updateDoc(this.docRef(id), {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  }

  /** Recursively remove undefined values (Firestore rejects them) */
  private stripUndefined(obj: unknown): unknown {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.stripUndefined(item));
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value !== undefined) {
          result[key] = this.stripUndefined(value);
        }
      }
      return result;
    }
    return obj;
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }
}
