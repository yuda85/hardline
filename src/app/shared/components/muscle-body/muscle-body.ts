import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MuscleGroup } from '../../../core/models/workout.model';
import {
  ANTERIOR,
  BodyView,
  FULL_VIEWBOX,
  MUSCLE_COLOR_VAR,
  MUSCLE_FOCUS_VIEWBOX,
  MUSCLE_LABELS,
  MUSCLE_VIEW,
  POSTERIOR,
  PolygonData,
} from './muscle-body.data';

export type MuscleBodyView = BodyView | 'both' | 'auto';
export type MuscleBodySize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-muscle-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './muscle-body.html',
  styleUrl: './muscle-body.scss',
  host: {
    role: 'img',
    '[attr.aria-label]': 'ariaLabel()',
    '[class]': 'hostClasses()',
  },
})
export class MuscleBodyComponent {
  /** Muscle groups to highlight. FullBody highlights everything. */
  readonly highlighted = input<MuscleGroup[]>([]);

  /**
   * Which body side to render.
   * - 'anterior' / 'posterior': single side
   * - 'both': anterior + posterior side-by-side
   * - 'auto': single side picked from the first highlighted group (FullBody → both)
   */
  readonly view = input<MuscleBodyView>('auto');

  /** Visual size preset. */
  readonly size = input<MuscleBodySize>('sm');

  /**
   * Optional override for fill color per group. When provided, replaces the
   * static muscle palette (used by recovery-map to show recovery status colors).
   */
  readonly colorFn = input<((g: MuscleGroup) => string) | null>(null);

  /**
   * Optional override for an extra CSS class per region (e.g. recovery-map
   * uses this for the `pulse-glow` animation on recovering muscles).
   */
  readonly classFn = input<((g: MuscleGroup) => string) | null>(null);

  /** Show "Front" / "Back" labels under each rendered side. */
  readonly showLabels = input<boolean>(false);

  /**
   * When true and exactly one muscle group is highlighted, the SVG viewBox is
   * cropped to that muscle's region — the highlighted region fills more of the
   * visible area. Useful for compact per-exercise icons.
   */
  readonly focus = input<boolean>(false);

  protected readonly views = computed<readonly BodyView[]>(() => {
    const v = this.view();
    if (v === 'both') return ['anterior', 'posterior'];
    if (v !== 'auto') return [v];

    const groups = this.highlighted();
    if (groups.length === 0) return ['anterior'];
    if (groups.includes(MuscleGroup.FullBody)) return ['anterior', 'posterior'];
    return [MUSCLE_VIEW[groups[0]]];
  });

  protected readonly hostClasses = computed(() => {
    const focused = this.isFocused();
    const focusClass = focused ? ' muscle-body--focus' : '';
    return `muscle-body muscle-body--${this.size()} muscle-body--view-${this.views().length === 2 ? 'both' : this.views()[0]}${focusClass}`;
  });

  protected readonly isFocused = computed(() => {
    if (!this.focus()) return false;
    const groups = this.highlighted();
    // Focus only makes sense for a single highlighted muscle (and not FullBody).
    return groups.length === 1 && groups[0] !== MuscleGroup.FullBody;
  });

  protected viewBoxFor(_view: BodyView): string {
    if (!this.isFocused()) return FULL_VIEWBOX;
    return MUSCLE_FOCUS_VIEWBOX[this.highlighted()[0]];
  }

  protected readonly ariaLabel = computed(() => {
    const groups = this.highlighted();
    if (groups.length === 0) return 'Muscle group diagram';
    return 'Targets: ' + groups.map(g => MUSCLE_LABELS[g]).join(', ');
  });

  protected polygonsFor(view: BodyView): PolygonData[] {
    return view === 'anterior' ? ANTERIOR : POSTERIOR;
  }

  protected fillFor(group: MuscleGroup | null): string {
    if (!group) return '';
    const fn = this.colorFn();
    if (fn) return fn(group);
    return this.isHighlighted(group) ? MUSCLE_COLOR_VAR[group] : '';
  }

  protected extraClassFor(group: MuscleGroup | null): string {
    if (!group) return '';
    const fn = this.classFn();
    return fn ? fn(group) : '';
  }

  protected viewLabel(view: BodyView): string {
    return view === 'anterior' ? 'Front' : 'Back';
  }

  protected isHighlighted(group: MuscleGroup): boolean {
    const groups = this.highlighted();
    if (groups.includes(MuscleGroup.FullBody)) return true;
    return groups.includes(group);
  }
}
