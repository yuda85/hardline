import { Injectable } from '@angular/core';
import { RawTrackPoint } from '../../../core/models/cardio-session.model';

const DB_NAME = 'hardline-cardio';
const DB_VERSION = 1;
const STORE = 'live-buffer';
const META_STORE = 'session-meta';
const FLUSH_INTERVAL_MS = 2000;

interface LiveBufferRecord extends RawTrackPoint {
  key: string;
  sessionLocalId: string;
  seq: number;
}

interface SessionMetaRecord {
  sessionLocalId: string;
  activityType: string;
  startedAt: number;
  lastWriteAt: number;
}

/**
 * IndexedDB-backed buffer for raw GPS points captured during an active
 * cardio session. Writes are coalesced into 2-second batches to minimize
 * IDB transaction overhead.
 *
 * The buffer is the durable source of truth during recording; on Finish,
 * `readAll` is called once to encode and upload, then `clear` drops it.
 * If the app is killed mid-session, `findOrphans` surfaces stranded data
 * on next app start.
 */
@Injectable({ providedIn: 'root' })
export class ActiveCardioBufferService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private currentSessionId: string | null = null;
  private seqCounter = 0;
  private pending: LiveBufferRecord[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushingPromise: Promise<void> | null = null;

  async start(sessionLocalId: string, activityType: string): Promise<void> {
    this.currentSessionId = sessionLocalId;
    this.seqCounter = 0;
    this.pending = [];
    const db = await this.openDb();
    const tx = db.transaction(META_STORE, 'readwrite');
    const meta: SessionMetaRecord = {
      sessionLocalId,
      activityType,
      startedAt: Date.now(),
      lastWriteAt: Date.now(),
    };
    tx.objectStore(META_STORE).put(meta);
    await this.txDone(tx);
    this.ensureFlushTimer();
  }

  append(point: RawTrackPoint): void {
    if (!this.currentSessionId) return;
    const record: LiveBufferRecord = {
      ...point,
      sessionLocalId: this.currentSessionId,
      seq: this.seqCounter++,
      key: `${this.currentSessionId}:${this.seqCounter}`,
    };
    this.pending.push(record);
  }

  /** Force a flush of any pending points. Safe to call before readAll. */
  async flush(): Promise<void> {
    if (this.flushingPromise) {
      await this.flushingPromise;
    }
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    this.flushingPromise = this.writeBatch(batch);
    try {
      await this.flushingPromise;
    } finally {
      this.flushingPromise = null;
    }
  }

  async readAll(sessionLocalId: string): Promise<RawTrackPoint[]> {
    await this.flush();
    const db = await this.openDb();
    return new Promise<RawTrackPoint[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('sessionLocalId');
      const req = idx.getAll(IDBKeyRange.only(sessionLocalId));
      req.onsuccess = () => {
        const records = (req.result as LiveBufferRecord[]).sort((a, b) => a.seq - b.seq);
        resolve(records.map(this.stripInternal));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clear(sessionLocalId: string): Promise<void> {
    if (this.currentSessionId === sessionLocalId) {
      this.currentSessionId = null;
      this.pending = [];
      this.stopFlushTimer();
    }
    const db = await this.openDb();
    const tx = db.transaction([STORE, META_STORE], 'readwrite');
    const store = tx.objectStore(STORE);
    const idx = store.index('sessionLocalId');
    const cursorReq = idx.openKeyCursor(IDBKeyRange.only(sessionLocalId));
    await new Promise<void>((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cur = cursorReq.result;
        if (cur) {
          store.delete(cur.primaryKey);
          cur.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    tx.objectStore(META_STORE).delete(sessionLocalId);
    await this.txDone(tx);
  }

  /**
   * Find session IDs that still have buffered data from a previous run.
   * Returned in ascending startedAt order.
   */
  async findOrphans(): Promise<SessionMetaRecord[]> {
    const db = await this.openDb();
    return new Promise<SessionMetaRecord[]>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).getAll();
      req.onsuccess = () => {
        const all = (req.result as SessionMetaRecord[]).filter(
          m => m.sessionLocalId !== this.currentSessionId,
        );
        all.sort((a, b) => a.startedAt - b.startedAt);
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async writeBatch(batch: LiveBufferRecord[]): Promise<void> {
    if (batch.length === 0) return;
    const db = await this.openDb();
    const tx = db.transaction([STORE, META_STORE], 'readwrite');
    const store = tx.objectStore(STORE);
    for (const r of batch) store.put(r);
    const sessionId = batch[0].sessionLocalId;
    const metaReq = tx.objectStore(META_STORE).get(sessionId);
    metaReq.onsuccess = () => {
      const meta = metaReq.result as SessionMetaRecord | undefined;
      if (meta) {
        meta.lastWriteAt = Date.now();
        tx.objectStore(META_STORE).put(meta);
      }
    };
    await this.txDone(tx);
  }

  private ensureFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private stripInternal(r: LiveBufferRecord): RawTrackPoint {
    const { key: _k, sessionLocalId: _s, seq: _q, ...rest } = r;
    return rest;
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('sessionLocalId', 'sessionLocalId', { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'sessionLocalId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private txDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}

export type { SessionMetaRecord };
