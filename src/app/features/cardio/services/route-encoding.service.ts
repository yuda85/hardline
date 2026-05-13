import { Injectable } from '@angular/core';
import { RawTrackPoint, TelemetrySample } from '../../../core/models/cardio-session.model';

/** Default downsampling cadence in seconds. */
export const DEFAULT_TELEMETRY_INTERVAL_SEC = 5;

/**
 * Encodes/decodes Google polyline strings and downsamples raw point streams
 * into compact telemetry samples for chart rendering.
 *
 * Polyline algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
@Injectable({ providedIn: 'root' })
export class RouteEncodingService {
  /**
   * Encode an array of {lat,lng} pairs to a Google polyline string.
   * @param precision Number of decimal places preserved (default 5 → ~1.1m).
   */
  encodePolyline(points: Array<{ lat: number; lng: number }>, precision = 5): string {
    if (points.length === 0) return '';
    const factor = Math.pow(10, precision);
    let result = '';
    let prevLat = 0;
    let prevLng = 0;
    for (const { lat, lng } of points) {
      const eLat = Math.round(lat * factor);
      const eLng = Math.round(lng * factor);
      result += this.encodeSigned(eLat - prevLat);
      result += this.encodeSigned(eLng - prevLng);
      prevLat = eLat;
      prevLng = eLng;
    }
    return result;
  }

  /**
   * Decode a Google polyline string back to {lat,lng} pairs.
   */
  decodePolyline(s: string, precision = 5): Array<{ lat: number; lng: number }> {
    const factor = Math.pow(10, precision);
    const result: Array<{ lat: number; lng: number }> = [];
    let i = 0;
    let lat = 0;
    let lng = 0;
    while (i < s.length) {
      const [dLat, ni1] = this.decodeSigned(s, i);
      i = ni1;
      const [dLng, ni2] = this.decodeSigned(s, i);
      i = ni2;
      lat += dLat;
      lng += dLng;
      result.push({ lat: lat / factor, lng: lng / factor });
    }
    return result;
  }

  /** Encode a 1D series of integers using the polyline algorithm (e.g. elevations). */
  encodeIntegers(values: number[]): string {
    let result = '';
    let prev = 0;
    for (const v of values) {
      const rounded = Math.round(v);
      result += this.encodeSigned(rounded - prev);
      prev = rounded;
    }
    return result;
  }

  decodeIntegers(s: string): number[] {
    const result: number[] = [];
    let i = 0;
    let acc = 0;
    while (i < s.length) {
      const [d, ni] = this.decodeSigned(s, i);
      i = ni;
      acc += d;
      result.push(acc);
    }
    return result;
  }

  /**
   * Downsample raw 1Hz points to telemetry samples at a target interval.
   * Picks the point closest to each interval boundary; preserves the global
   * elevation max/min so peaks/valleys are never dropped.
   */
  downsample(
    points: RawTrackPoint[],
    intervalSec = DEFAULT_TELEMETRY_INTERVAL_SEC,
  ): TelemetrySample[] {
    if (points.length === 0) return [];
    const startMs = points[0].t;
    const intervalMs = intervalSec * 1000;

    // Cumulative distance per point (Haversine).
    const distances = this.cumulativeDistances(points);

    // Pick points at interval boundaries.
    const picked = new Set<number>();
    picked.add(0);
    picked.add(points.length - 1);
    let nextBoundary = startMs + intervalMs;
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const delta = Math.abs(p.t - nextBoundary);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
      if (p.t >= nextBoundary) {
        picked.add(bestIdx);
        nextBoundary += intervalMs;
        bestDelta = Math.abs(p.t - nextBoundary);
        bestIdx = i;
      }
    }

    // Preserve elevation extrema.
    let maxIdx = -1;
    let minIdx = -1;
    let maxEle = -Infinity;
    let minEle = Infinity;
    for (let i = 0; i < points.length; i++) {
      const e = points[i].ele;
      if (e === null) continue;
      if (e > maxEle) {
        maxEle = e;
        maxIdx = i;
      }
      if (e < minEle) {
        minEle = e;
        minIdx = i;
      }
    }
    if (maxIdx >= 0) picked.add(maxIdx);
    if (minIdx >= 0) picked.add(minIdx);

    const indices = Array.from(picked).sort((a, b) => a - b);
    return indices.map<TelemetrySample>(i => {
      const p = points[i];
      return {
        t: Math.round((p.t - startMs) / 1000),
        d: Math.round(distances[i]),
        ele: p.ele === null ? null : Math.round(p.ele),
        spd: p.spd === null ? null : Math.round(p.spd * 100) / 100,
      };
    });
  }

  /**
   * Re-aggregate distance and elevation gain/loss from a sequence of points.
   * Used when restoring an active session after a page reload.
   */
  aggregate(points: RawTrackPoint[]): {
    distanceM: number;
    elevationGainM: number;
    elevationLossM: number;
    maxSpeedMs: number;
  } {
    const ELE_FLOOR = 3;
    const MAX_ACC = 30;
    let distance = 0;
    let elevGain = 0;
    let elevLoss = 0;
    let maxSpeed = 0;
    let last: RawTrackPoint | null = null;
    for (const p of points) {
      if (p.spd && p.spd > maxSpeed) maxSpeed = p.spd;
      if (p.acc > MAX_ACC || p.paused === 1) {
        continue;
      }
      if (last) {
        distance += this.haversineMeters(last, p);
        if (p.ele !== null && last.ele !== null) {
          const dEle = p.ele - last.ele;
          if (Math.abs(dEle) >= ELE_FLOOR) {
            if (dEle > 0) elevGain += dEle;
            else elevLoss += -dEle;
          }
        }
      }
      last = p;
    }
    return { distanceM: distance, elevationGainM: elevGain, elevationLossM: elevLoss, maxSpeedMs: maxSpeed };
  }

  /**
   * Haversine distance in meters between two lat/lng pairs.
   */
  haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const sa =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(sa)));
  }

  private cumulativeDistances(points: RawTrackPoint[]): number[] {
    const out: number[] = new Array(points.length).fill(0);
    for (let i = 1; i < points.length; i++) {
      out[i] = out[i - 1] + this.haversineMeters(points[i - 1], points[i]);
    }
    return out;
  }

  private encodeSigned(value: number): string {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let result = '';
    while (v >= 0x20) {
      result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    result += String.fromCharCode(v + 63);
    return result;
  }

  private decodeSigned(s: string, index: number): [number, number] {
    let shift = 0;
    let result = 0;
    let byte: number;
    let i = index;
    do {
      byte = s.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const delta = result & 1 ? ~(result >> 1) : result >> 1;
    return [delta, i];
  }
}
