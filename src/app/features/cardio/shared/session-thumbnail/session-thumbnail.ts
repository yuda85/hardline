import { Component, computed, inject, input } from '@angular/core';
import { CardioBounds } from '../../../../core/models/cardio-session.model';
import { RouteEncodingService } from '../../services/route-encoding.service';

const VB_W = 100;
const VB_H = 40;
const PAD = 4;

@Component({
  selector: 'app-session-thumbnail',
  standalone: true,
  templateUrl: './session-thumbnail.html',
  styleUrl: './session-thumbnail.scss',
})
export class SessionThumbnailComponent {
  readonly polyline = input<string>('');
  readonly bounds = input<CardioBounds | null>(null);
  readonly strokeOpacity = input<number>(1);

  private readonly encoder = inject(RouteEncodingService);

  protected readonly path = computed(() => {
    const encoded = this.polyline();
    if (!encoded) return '';
    const pts = this.encoder.decodePolyline(encoded);
    if (pts.length === 0) return '';

    const b = this.bounds() ?? this.computeBounds(pts);
    const w = Math.max(1e-9, b.maxLng - b.minLng);
    const h = Math.max(1e-9, b.maxLat - b.minLat);
    const scaleX = (VB_W - PAD * 2) / w;
    const scaleY = (VB_H - PAD * 2) / h;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (VB_W - w * scale) / 2;
    const offsetY = (VB_H - h * scale) / 2;

    const coords = pts.map(p => {
      const x = (p.lng - b.minLng) * scale + offsetX;
      // Flip Y so north is up.
      const y = VB_H - ((p.lat - b.minLat) * scale + offsetY);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M${coords.join(' L')}`;
  });

  protected readonly viewBox = `0 0 ${VB_W} ${VB_H}`;

  private computeBounds(pts: Array<{ lat: number; lng: number }>): CardioBounds {
    let minLat = pts[0].lat;
    let maxLat = pts[0].lat;
    let minLng = pts[0].lng;
    let maxLng = pts[0].lng;
    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    return { minLat, maxLat, minLng, maxLng };
  }
}
