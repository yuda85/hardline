import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-weight-prompt',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './weight-prompt.html',
  styleUrl: './weight-prompt.scss',
})
export class WeightPromptComponent {
  private readonly fb = inject(FormBuilder);

  readonly saved = output<{ weightKg: number; notes?: string }>();
  readonly skipped = output<void>();

  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    weight: [0, [Validators.required, Validators.min(20), Validators.max(300)]],
    notes: [''],
  });

  protected save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const { weight, notes } = this.form.getRawValue();
    this.saved.emit({ weightKg: weight, notes: notes || undefined });
    // Reset so re-opening the prompt in the same session shows a clean form.
    this.saving.set(false);
    this.form.reset({ weight: 0, notes: '' });
  }

  protected skip() {
    this.skipped.emit();
  }
}
