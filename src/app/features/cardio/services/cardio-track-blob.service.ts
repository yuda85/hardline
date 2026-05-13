import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { RawTrackPoint } from '../../../core/models/cardio-session.model';

const MAX_RETRIES = 5;

/**
 * Uploads/downloads the full 1Hz raw track to Firebase Storage as a
 * gzipped JSON blob. The Firestore session doc carries metadata + the
 * encoded polyline + downsampled telemetry — this service handles the
 * heavy raw stream.
 */
@Injectable({ providedIn: 'root' })
export class CardioTrackBlobService {
  private readonly storage = inject(Storage);

  pathFor(userId: string, sessionId: string): string {
    return `cardio-tracks/${userId}/${sessionId}.json.gz`;
  }

  async uploadFullTrack(
    userId: string,
    sessionId: string,
    points: RawTrackPoint[],
  ): Promise<string> {
    const path = this.pathFor(userId, sessionId);
    const json = JSON.stringify(points);
    const blob = await this.gzip(json);
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const r = ref(this.storage, path);
        await uploadBytes(r, blob, { contentType: 'application/gzip' });
        return path;
      } catch (e) {
        lastError = e;
        await this.delay(2 ** attempt * 500);
      }
    }
    throw lastError;
  }

  async downloadFullTrack(path: string): Promise<RawTrackPoint[]> {
    const url = await getDownloadURL(ref(this.storage, path));
    const res = await fetch(url);
    if (!res.body) throw new Error('Empty body');
    const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    return JSON.parse(text) as RawTrackPoint[];
  }

  private async gzip(input: string): Promise<Blob> {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressed = await new Response(stream).blob();
    return compressed;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }
}
