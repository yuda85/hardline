import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent, BadgeComponent } from '../../../shared/components';

@Component({
  selector: 'app-share-bottom-sheet',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent],
  templateUrl: './share-bottom-sheet.html',
  styleUrl: './share-bottom-sheet.scss',
})
export class ShareBottomSheetComponent {
  readonly shareUrl = input.required<string>();
  readonly loading = input(false);

  readonly copyLink = output<void>();
  readonly closed = output<void>();

  protected readonly copied = signal(false);

  protected onCopy() {
    this.copyLink.emit();
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected onBackdropClick() {
    this.closed.emit();
  }
}
