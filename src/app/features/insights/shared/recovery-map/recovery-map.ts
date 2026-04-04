import { Component, input, computed } from '@angular/core';
import { RecoveryStatus } from '../../../../core/services/insights.service';
import { MuscleGroup } from '../../../../core/models/workout.model';

const STATUS_COLORS: Record<RecoveryStatus['status'], string> = {
  recovering: '#ef6719',
  sore: '#ffb595',
  ready: '#66d9a0',
  undertrained: '#414755',
};

@Component({
  selector: 'app-recovery-map',
  standalone: true,
  templateUrl: './recovery-map.html',
  styleUrl: './recovery-map.scss',
})
export class RecoveryMapComponent {
  readonly recoveryData = input<RecoveryStatus[]>([]);

  protected colorFor(group: MuscleGroup): string {
    const entry = this.recoveryData().find(r => r.group === group);
    return entry ? STATUS_COLORS[entry.status] : '#2a2a2a';
  }

  protected classFor(group: MuscleGroup): string {
    const entry = this.recoveryData().find(r => r.group === group);
    return entry?.status === 'recovering' ? 'pulse-glow' : '';
  }

  protected readonly MuscleGroup = MuscleGroup;
}
