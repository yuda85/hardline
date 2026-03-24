import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: '<ng-content />',
  styleUrl: './badge.scss',
  host: { '[class]': `'badge badge--' + variant() + ' badge--' + size()` },
})
export class BadgeComponent {
  readonly variant = input<'primary' | 'tertiary' | 'error' | 'surface'>('primary');
  readonly size = input<'sm' | 'md'>('sm');
}
