import { Component, computed, input } from '@angular/core';
import { TelemetrySample } from '../../../../core/models/cardio-session.model';

interface ChartGeom {
  area: string;
  line: string;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-elevation-chart',
  standalone: true,
  templateUrl: './elevation-chart.html',
  styleUrl: './elevation-chart.scss',
})
export class ElevationChartComponent {
  readonly samples = input<TelemetrySample[]>([]);

  protected readonly geom = computed<ChartGeom | null>(() => {
    const data = this.samples().filter(s => s.ele !== null) as Array<TelemetrySample & { ele: number }>;
    if (data.length < 2) return null;
    const W = 320;
    const H = 80;
    const PAD = 4;
    const xs = data.map(s => s.d);
    const ys = data.map(s => s.ele);
    const minX = xs[0];
    const maxX = xs[xs.length - 1];
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);

    const proj = (x: number, y: number) => {
      const px = PAD + ((x - minX) / rangeX) * (W - PAD * 2);
      const py = H - PAD - ((y - minY) / rangeY) * (H - PAD * 2);
      return [px, py] as const;
    };

    const line = data
      .map((s, i) => {
        const [x, y] = proj(s.d, s.ele);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    const [firstX] = proj(data[0].d, data[0].ele);
    const [lastX] = proj(data[data.length - 1].d, data[data.length - 1].ele);
    const area = `${line} L${lastX.toFixed(2)},${H - PAD} L${firstX.toFixed(2)},${H - PAD} Z`;

    return { area, line, minY, maxY, width: W, height: H };
  });
}
