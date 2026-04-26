import { Component, input, output, signal } from '@angular/core';
import { ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent, MuscleBodyComponent } from '../../../../shared/components';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { WorkoutPlan, WorkoutDay, MuscleGroup } from '../../../../core/models';
import { analyzeVolume, VolumeAnalysis, MuscleGroupVolume } from '../../../../core/services/volume-analysis.service';
import { expandCollapse } from '../../../../shared/animations/expand-collapse';
import { getDayMuscleGroups } from '../../shared/day-muscle-groups.util';

@Component({
  selector: 'app-my-plans-tab',
  standalone: true,
  imports: [ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent, MuscleBodyComponent, RelativeTimePipe],
  templateUrl: './my-plans-tab.html',
  styleUrl: './my-plans-tab.scss',
  animations: [expandCollapse],
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class MyPlansTabComponent {
  readonly plans = input.required<WorkoutPlan[]>();
  readonly activePlanId = input<string | null>(null);
  readonly loading = input(false);
  readonly seeding = input(false);

  readonly toggleActive = output<{ planId: string; event: Event }>();
  readonly editPlan = output<{ planId: string; event: Event }>();
  readonly deletePlan = output<{ planId: string; event: Event }>();
  readonly exportPlan = output<{ plan: WorkoutPlan; event: Event }>();
  readonly sharePlan = output<{ plan: WorkoutPlan; event: Event }>();
  readonly triggerImport = output<void>();
  readonly seedExamples = output<void>();
  readonly goToBuilder = output<Event>();
  readonly goToSmartWorkout = output<Event>();
  readonly createNewPlan = output<Event>();

  protected readonly expandedPlan = signal<string | null>(null);
  protected readonly openMenu = signal<string | null>(null);

  private readonly volumeCache = new Map<string, VolumeAnalysis>();
  private readonly dayMusclesCache = new WeakMap<WorkoutDay, MuscleGroup[]>();

  protected togglePlanExpand(planId: string) {
    this.expandedPlan.update(current => (current === planId ? null : planId));
  }

  protected toggleMenu(planId: string, event: Event) {
    event.stopPropagation();
    this.openMenu.update(current => (current === planId ? null : planId));
  }

  protected onDocumentClick(event: Event) {
    if (this.openMenu() !== null) {
      this.openMenu.set(null);
    }
  }

  protected onMenuAction(action: 'edit' | 'export' | 'share' | 'delete', plan: WorkoutPlan, event: Event) {
    event.stopPropagation();
    this.openMenu.set(null);
    switch (action) {
      case 'edit':
        this.editPlan.emit({ planId: plan.id!, event });
        break;
      case 'export':
        this.exportPlan.emit({ plan, event });
        break;
      case 'share':
        this.sharePlan.emit({ plan, event });
        break;
      case 'delete':
        this.deletePlan.emit({ planId: plan.id!, event });
        break;
    }
  }

  protected getVolumeAnalysis(plan: WorkoutPlan): VolumeAnalysis {
    const key = plan.id ?? plan.name;
    const cached = this.volumeCache.get(key);
    if (cached) return cached;
    const analysis = analyzeVolume(plan);
    this.volumeCache.set(key, analysis);
    return analysis;
  }

  protected getBarWidth(group: MuscleGroupVolume): number {
    if (group.sets === 0) return 0;
    const max = group.maxRecommended || 1;
    return Math.min(100, Math.round((group.sets / max) * 100));
  }

  protected getScoreLevel(score: number): string {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warn';
    return 'bad';
  }

  protected getExerciseCount(day: WorkoutDay): number {
    return day.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getDayMuscles(day: WorkoutDay): MuscleGroup[] {
    const cached = this.dayMusclesCache.get(day);
    if (cached) return cached;
    const muscles = getDayMuscleGroups(day);
    this.dayMusclesCache.set(day, muscles);
    return muscles;
  }

  protected getGroupTypes(day: WorkoutDay): string[] {
    const types = new Set<string>();
    for (const group of day.exerciseGroups) {
      if (group.type === 'superset') types.add('SS');
      else if (group.type === 'circuit') types.add('CIR');
    }
    return [...types];
  }

  clearVolumeCache() {
    this.volumeCache.clear();
  }
}
