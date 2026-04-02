import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html',
  styleUrl: './card.scss',
  host: {
    '[class]': `'card card--elevation-' + elevation() + ' card--padding-' + padding() + (clickable() ? ' card--clickable' : '') + ' card--accent-' + accentBorder()`,
  },
})
export class CardComponent {
  readonly elevation = input<0 | 1 | 2>(1);
  readonly padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  readonly clickable = input(false);
  readonly accentBorder = input<'primary' | 'muted' | 'none'>('none');
}
