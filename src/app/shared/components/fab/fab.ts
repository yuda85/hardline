import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-fab',
  standalone: true,
  template: `
    <button
      class="fab"
      [attr.aria-label]="ariaLabel()"
      (click)="fabClick.emit($event)"
    >
      <span
        class="material-symbols-outlined"
        style="font-variation-settings: 'FILL' 1"
      >{{ icon() }}</span>
    </button>
  `,
  styleUrl: './fab.scss',
})
export class FabComponent {
  readonly icon = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly fabClick = output<Event>();
}
