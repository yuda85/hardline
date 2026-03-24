import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: '',
  styleUrl: './skeleton.scss',
  host: {
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'computedRadius()',
    '[class]': `'skeleton skeleton--' + variant()`,
  },
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly borderRadius = input('0.5rem');
  readonly variant = input<'text' | 'circle' | 'rect'>('text');

  protected computedRadius() {
    if (this.variant() === 'circle') return '50%';
    return this.borderRadius();
  }
}
