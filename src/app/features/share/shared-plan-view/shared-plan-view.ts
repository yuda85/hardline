import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Share } from '../../../store/share/share.actions';
import { ShareState } from '../../../store/share/share.state';
import { ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent } from '../../../shared/components';
import { WorkoutDay } from '../../../core/models';

@Component({
  selector: 'app-shared-plan-view',
  standalone: true,
  imports: [ButtonComponent, CardComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './shared-plan-view.html',
  styleUrl: './shared-plan-view.scss',
})
export class SharedPlanViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  protected readonly previewPlan = this.store.selectSignal(ShareState.previewPlan);
  protected readonly loading = this.store.selectSignal(ShareState.loading);
  protected readonly error = this.store.selectSignal(ShareState.error);
  protected readonly saved = signal(false);
  protected readonly saving = signal(false);

  protected readonly expiryText = computed(() => {
    const plan = this.previewPlan();
    if (!plan) return '';
    const expiresAt = plan.expiresAt instanceof Date
      ? plan.expiresAt
      : new Date((plan.expiresAt as any).seconds * 1000);
    const days = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  });

  ngOnInit() {
    const shareId = this.route.snapshot.paramMap.get('shareId');
    if (shareId) {
      this.store.dispatch(new Share.LoadSharedPlan(shareId));
    }
  }

  protected savePlan() {
    this.saving.set(true);
    this.store.dispatch(new Share.CloneSharedPlan()).subscribe(() => {
      this.saving.set(false);
      this.saved.set(true);
    });
  }

  protected goToPlans() {
    this.store.dispatch(new Share.Reset());
    this.router.navigate(['/workouts']);
  }

  protected goHome() {
    this.store.dispatch(new Share.Reset());
    this.router.navigate(['/dashboard']);
  }

  protected getExerciseCount(day: WorkoutDay): number {
    return day.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  }

  protected getGroupTypes(day: WorkoutDay): string[] {
    const types = new Set<string>();
    for (const group of day.exerciseGroups) {
      if (group.type === 'superset') types.add('SS');
      else if (group.type === 'circuit') types.add('CIR');
    }
    return [...types];
  }
}
