import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RecoveryStatus } from '../../../../core/services/insights.service';
import { MuscleGroup } from '../../../../core/models/workout.model';
import { MuscleBodyComponent } from '../../../../shared/components/muscle-body/muscle-body';

const STATUS_COLORS: Record<RecoveryStatus['status'], string> = {
  recovering: '#ef6719',
  sore: '#ffb595',
  ready: '#66d9a0',
  undertrained: '#414755',
};

@Component({
  selector: 'app-recovery-map',
  standalone: true,
  imports: [MuscleBodyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recovery-map.html',
  styleUrl: './recovery-map.scss',
})
export class RecoveryMapComponent {
  readonly recoveryData = input<RecoveryStatus[]>([]);

  protected readonly highlighted = computed<MuscleGroup[]>(() =>
    this.recoveryData().map(r => r.group),
  );

  protected readonly colorFn = (group: MuscleGroup): string => {
    const entry = this.recoveryData().find(r => r.group === group);
    return entry ? STATUS_COLORS[entry.status] : '';
  };

  protected readonly classFn = (group: MuscleGroup): string => {
    const entry = this.recoveryData().find(r => r.group === group);
    return entry?.status === 'recovering' ? 'pulse-glow' : '';
  };
}
