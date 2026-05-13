import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

type WakeLockType = 'screen';

interface WakeLockSentinel extends EventTarget {
  release(): Promise<void>;
}

interface WakeLockNavigator {
  wakeLock?: {
    request(type: WakeLockType): Promise<WakeLockSentinel>;
  };
}

/**
 * Wraps the Screen Wake Lock API to keep the device display awake while
 * a cardio session is recording.
 *
 * Browser support:
 * - Chrome / Edge: full support
 * - Safari: 16.4+
 * - Firefox: 126+
 *
 * The OS may release the lock when the page becomes hidden (tab switch,
 * lock screen). We listen for `visibilitychange` and re-acquire on return,
 * and surface `released$` so the active-recording screen can prompt the user.
 */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private wantsLock = false;
  private visibilityListener: (() => void) | null = null;

  readonly active = signal(false);
  readonly released$ = new Subject<void>();

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in (navigator as WakeLockNavigator);
  }

  async acquire(): Promise<void> {
    this.wantsLock = true;
    if (!this.isSupported()) return;
    await this.requestLock();
    this.ensureVisibilityHook();
  }

  async release(): Promise<void> {
    this.wantsLock = false;
    this.removeVisibilityHook();
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        /* noop */
      }
      this.sentinel = null;
    }
    this.active.set(false);
  }

  private async requestLock(): Promise<void> {
    if (this.sentinel) return;
    try {
      const nav = navigator as WakeLockNavigator;
      const s = await nav.wakeLock!.request('screen');
      this.sentinel = s;
      this.active.set(true);
      s.addEventListener('release', () => {
        const wasActive = this.active();
        this.sentinel = null;
        this.active.set(false);
        if (wasActive && this.wantsLock) {
          this.released$.next();
        }
      });
    } catch {
      this.active.set(false);
    }
  }

  private ensureVisibilityHook(): void {
    if (this.visibilityListener || typeof document === 'undefined') return;
    this.visibilityListener = () => {
      if (document.visibilityState === 'visible' && this.wantsLock) {
        void this.requestLock();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);
  }

  private removeVisibilityHook(): void {
    if (this.visibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }
}
