import { Component, computed, input } from '@angular/core';
import { TelemetrySample } from '../../../../core/models/cardio-session.model';

interface ChartGeom {
  line: string;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-speed-chart',
  standalone: true,
  templateUrl: './speed-chart.html',
  styleUrl: './speed-chart.scss',
})
export class SpeedChartComponent {
  readonly samples = input<TelemetrySample[]>([]);
  /** If true, formats range as pace (min/km). Otherwise as km/h. */
  readonly asPace = input<boolean>(false);

  protected readonly geom = computed<ChartGeom | null>(() => {
    const data = this.samples().filter(s => s.spd !== null && s.spd > 0) as Array<
      TelemetrySample & { spd: number }
    >;
    if (data.length < 2) return null;
    const W = 320;
    const H = 80;
    const PAD = 4;
    const xs = data.map(s => s.d);
    const ys = data.map(s => s.spd);
    const minX = xs[0];
    const maxX = xs[xs.length - 1];
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(0.1, maxY - minY);

    const proj = (x: number, y: number) => {
      const px = PAD + ((x - minX) / rangeX) * (W - PAD * 2);
      const py = H - PAD - ((y - minY) / rangeY) * (H - PAD * 2);
      return [px, py] as const;
    };

    const line = data
      .map((s, i) => {
        const [x, y] = proj(s.d, s.spd);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    return { line, minY, maxY, width: W, height: H };
  });

  protected readonly rangeLabel = computed(() => {
    const g = this.geom();
    if (!g) return null;
    if (this.asPace()) {
      const fmtPace = (mps: number) => {
        if (mps <= 0) return '—';
        const sec = 1000 / mps;
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };
      return {
        min: fmtPace(g.maxY) + ' /km',
        max: fmtPace(g.minY) + ' /km',
      };
    }
    return {
      min: (g.minY * 3.6).toFixed(1) + ' km/h',
      max: (g.maxY * 3.6).toFixed(1) + ' km/h',
    };
  });
}
