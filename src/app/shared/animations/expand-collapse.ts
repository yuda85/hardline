import { trigger, transition, style, animate } from '@angular/animations';

export const expandCollapse = trigger('expandCollapse', [
  transition(':enter', [
    style({ height: 0, opacity: 0, overflow: 'hidden' }),
    animate('200ms ease-out', style({ height: '*', opacity: 1 })),
  ]),
  transition(':leave', [
    style({ overflow: 'hidden' }),
    animate('200ms ease-in', style({ height: 0, opacity: 0 })),
  ]),
]);
