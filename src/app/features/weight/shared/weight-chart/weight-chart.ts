import { Component, input, computed } from '@angular/core';

export interface ChartPoint {
  date: string;
  weight: number;
}

export interface TrendPoint {
  date: string;
  avg: number;
}

@Component({
  selector: 'app-weight-chart',
  standalone: true,
  templateUrl: './weight-chart.html',
  styleUrl: './weight-chart.scss',
})
export class WeightChartComponent {
  readonly dataPoints = input<ChartPoint[]>([]);
  readonly trendPoints = input<TrendPoint[]>([]);

  private readonly padding = 30;
  private readonly width = 300;
  private readonly height = 150;

  protected readonly yRange = computed(() => {
    const pts = this.dataPoints();
    if (pts.length === 0) return { min: 0, max: 100 };
    const weights = pts.map(p => p.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const buffer = max === min ? 1 : (max - min) * 0.2;
    return { min: min - buffer, max: max + buffer };
  });

  protected readonly dataLine = computed(() => {
    const pts = this.dataPoints();
    if (pts.length < 2) return '';
    return pts.map((p, i) => {
      const x = this.toX(i, pts.length);
      const y = this.toY(p.weight);
      return `${x},${y}`;
    }).join(' ');
  });

  protected readonly trendLine = computed(() => {
    const trend = this.trendPoints();
    const data = this.dataPoints();
    if (trend.length < 2 || data.length < 2) return '';

    return trend.map(t => {
      const idx = data.findIndex(d => d.date === t.date);
      if (idx === -1) return null;
      const x = this.toX(idx, data.length);
      const y = this.toY(t.avg);
      return `${x},${y}`;
    }).filter(Boolean).join(' ');
  });

  protected readonly circles = computed(() => {
    const pts = this.dataPoints();
    return pts.map((p, i) => ({
      cx: this.toX(i, pts.length),
      cy: this.toY(p.weight),
      weight: p.weight,
    }));
  });

  protected readonly xLabels = computed(() => {
    const pts = this.dataPoints();
    if (pts.length === 0) return [];

    const maxLabels = pts.length <= 7 ? pts.length : 7;
    const step = Math.max(1, Math.floor((pts.length - 1) / (maxLabels - 1)));

    const labels: { x: number; label: string }[] = [];
    for (let i = 0; i < pts.length; i += step) {
      const date = new Date(pts[i].date + 'T00:00:00');
      const label = pts.length <= 7
        ? date.toLocaleDateString('en', { weekday: 'short' })
        : date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      labels.push({ x: this.toX(i, pts.length), label });
    }
    return labels;
  });

  protected readonly yLabels = computed(() => {
    const { min, max } = this.yRange();
    const mid = (min + max) / 2;
    return [
      { y: this.toY(max), label: max.toFixed(1) },
      { y: this.toY(mid), label: mid.toFixed(1) },
      { y: this.toY(min), label: min.toFixed(1) },
    ];
  });

  protected readonly gridLines = computed(() => {
    const { min, max } = this.yRange();
    const mid = (min + max) / 2;
    return [this.toY(max), this.toY(mid), this.toY(min)];
  });

  private toX(index: number, total: number): number {
    if (total <= 1) return this.width / 2;
    return this.padding + (index / (total - 1)) * (this.width - 2 * this.padding);
  }

  private toY(weight: number): number {
    const { min, max } = this.yRange();
    const range = max - min || 1;
    return this.height - this.padding - ((weight - min) / range) * (this.height - 2 * this.padding);
  }
}
