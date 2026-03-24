import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  host: { '[class]': `'icon-btn icon-btn--' + variant() + ' icon-btn--' + size()` },
})
export class IconButtonComponent {
  readonly icon = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly variant = input<'standard' | 'filled' | 'tonal'>('standard');
  readonly disabled = input(false);
}
