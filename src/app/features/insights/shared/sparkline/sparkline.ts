import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    <svg [attr.width]="width()" [attr.height]="height()" [attr.viewBox]="viewBox()">
      <polyline
        [attr.points]="points()"
        fill="none"
        [attr.stroke]="color()"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: `:host { display: inline-block; line-height: 0; }`,
})
export class SparklineComponent {
  readonly data = input<number[]>([]);
  readonly color = input('#3cd7ff');
  readonly width = input(100);
  readonly height = input(30);

  protected readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  protected readonly points = computed(() => {
    const values = this.data();
    if (values.length < 2) return '';

    const w = this.width();
    const h = this.height();
    const padding = 2;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * (w - padding * 2) + padding;
        const y = h - padding - ((v - min) / range) * (h - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  });
}
