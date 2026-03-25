import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanSet } from '../../../core/models';

@Component({
  selector: 'app-set-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './set-editor.html',
  styleUrl: './set-editor.scss',
})
export class SetEditorComponent {
  readonly sets = input.required<PlanSet[]>();
  readonly restSeconds = input(90);
  readonly notes = input('');

  readonly setsChange = output<PlanSet[]>();
  readonly restChange = output<number>();
  readonly notesChange = output<string>();

  protected readonly restPresets = [60, 90, 120, 180];
  protected readonly customRest = signal(false);

  protected updateReps(index: number, value: number) {
    const updated = this.sets().map((s, i) => (i === index ? { targetReps: Math.max(1, value || 1) } : s));
    this.setsChange.emit(updated);
  }

  protected addSet() {
    const current = this.sets();
    const lastReps = current.length > 0 ? current[current.length - 1].targetReps : 10;
    this.setsChange.emit([...current, { targetReps: lastReps }]);
  }

  protected removeSet(index: number) {
    if (this.sets().length <= 1) return;
    this.setsChange.emit(this.sets().filter((_, i) => i !== index));
  }

  protected setRest(seconds: number) {
    this.customRest.set(false);
    this.restChange.emit(seconds);
  }

  protected onCustomRest(value: number) {
    this.restChange.emit(Math.max(0, value || 0));
  }

  protected onNotesChange(value: string) {
    this.notesChange.emit(value);
  }
}
