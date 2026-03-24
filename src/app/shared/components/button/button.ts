import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.html',
  styleUrl: './button.scss',
  host: { '[class]': 'hostClasses()' },
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'outline' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');
  readonly fullWidth = input(false);
  readonly icon = input<string | null>(null);

  protected hostClasses() {
    return `btn btn--${this.variant()} btn--${this.size()} ${this.fullWidth() ? 'btn--full' : ''}`;
  }
}
