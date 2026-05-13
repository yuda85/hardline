import { Component, input } from '@angular/core';

@Component({
  selector: 'app-metric-tile',
  standalone: true,
  templateUrl: './metric-tile.html',
  styleUrl: './metric-tile.scss',
})
export class MetricTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly unit = input<string>('');
  readonly accent = input<'default' | 'tertiary'>('default');
  readonly icon = input<string | null>(null);
  readonly align = input<'left' | 'right'>('left');
}
