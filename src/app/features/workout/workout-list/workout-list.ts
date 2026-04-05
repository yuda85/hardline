import { Component, inject, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Store } from '@ngxs/store';
import { WorkoutState } from '../../../store/workout/workout.state';
import { AuthState } from '../../../store/auth/auth.state';
import { ProfileState } from '../../../store/profile/profile.state';
import { ShareState } from '../../../store/share/share.state';
import { Workout } from '../../../store/workout/workout.actions';
import { Profile } from '../../../store/profile/profile.actions';
import { Share } from '../../../store/share/share.actions';
import { WorkoutIOService } from '../../../core/services/workout-io.service';
import { ShareService } from '../../../core/services/share.service';
import { WorkoutPlan } from '../../../core/models';
import { SAMPLE_PLANS_DAYS } from '../exercise-data';
import { BadgeComponent } from '../../../shared/components';
import { FabComponent } from '../../../shared/components/fab/fab';
import { ActivePlanTabComponent } from './active-plan-tab/active-plan-tab';
import { MyPlansTabComponent } from './my-plans-tab/my-plans-tab';
import { ShareBottomSheetComponent } from '../../share/share-bottom-sheet/share-bottom-sheet';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [BadgeComponent, FabComponent, ActivePlanTabComponent, MyPlansTabComponent, ShareBottomSheetComponent],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.scss',
})
export class WorkoutListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly workoutIO = inject(WorkoutIOService);
  private readonly shareService = inject(ShareService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(MyPlansTabComponent) myPlansTab?: MyPlansTabComponent;

  private readonly rawPlans = this.store.selectSignal(WorkoutState.plans);
  protected readonly activePlanId = this.store.selectSignal(ProfileState.activePlanId);
  protected readonly loading = this.store.selectSignal(WorkoutState.loading);
  protected readonly seeding = signal(false);
  protected readonly importError = signal<string | null>(null);
  protected readonly activeTab = signal<'active' | 'plans'>('active');
  protected readonly shareUrl = signal<string | null>(null);
  protected readonly shareLoading = signal(false);

  /** Active plan always sorted to top */
  protected readonly plans = computed(() => {
    const all = this.rawPlans();
    const activeId = this.activePlanId();
    if (!activeId) return all;
    return [...all].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      return 0;
    });
  });

  /** Derive the single active plan for the Active Plan tab */
  protected readonly activePlan = computed(() => {
    const activeId = this.activePlanId();
    if (!activeId) return null;
    return this.rawPlans().find(p => p.id === activeId) ?? null;
  });

  ngOnInit() {
    this.store.dispatch([new Workout.FetchPlans(), new Profile.FetchGoals()]);
    this.store.select(WorkoutState.plans).subscribe(() => this.myPlansTab?.clearVolumeCache());
  }

  protected startDay(planId: string, dayNumber: number) {
    this.router.navigate(['/workouts', 'active', planId, dayNumber]);
  }

  protected toggleActivePlan(planId: string, event: Event) {
    event.stopPropagation();
    const current = this.activePlanId();
    this.store.dispatch(new Profile.SetActivePlan(current === planId ? null : planId));
  }

  protected goToBuilder(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'generate']);
  }

  protected goToSmartWorkout(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'smart-workout']);
  }

  protected editPlan(planId: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'edit', planId]);
  }

  protected createNewPlan(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/workouts', 'edit', 'new']);
  }

  protected deletePlan(planId: string, event: Event) {
    event.stopPropagation();
    this.store.dispatch(new Workout.DeletePlan(planId));
  }

  protected exportPlan(plan: WorkoutPlan, event: Event) {
    event.stopPropagation();
    this.workoutIO.exportPlan(plan);
  }

  protected triggerImport() {
    this.fileInput.nativeElement.click();
  }

  protected async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importError.set(null);
    try {
      const planData = await this.workoutIO.importPlan(file);
      const uid = this.store.selectSnapshot(AuthState.uid);
      if (!uid) return;
      this.store.dispatch(new Workout.SavePlan({ ...planData, userId: uid }));
    } catch (err) {
      this.importError.set(err instanceof Error ? err.message : 'Import failed');
    }
    input.value = '';
  }

  protected async seedExamples() {
    this.seeding.set(true);
    const uid = this.store.selectSnapshot(AuthState.uid);
    if (!uid) return;
    for (const plan of SAMPLE_PLANS_DAYS) {
      await new Promise<void>(resolve => {
        this.store
          .dispatch(new Workout.SavePlan({ ...plan, userId: uid }))
          .subscribe(() => resolve());
      });
    }
    this.seeding.set(false);
  }

  protected async sharePlan(plan: WorkoutPlan, event: Event) {
    event.stopPropagation();
    this.shareLoading.set(true);
    await firstValueFrom(this.store.dispatch(new Share.CreateShare(plan)));
    const shareId = this.store.selectSnapshot(ShareState.lastShareId);
    if (shareId) {
      this.shareUrl.set(this.shareService.buildShareUrl(shareId));
    }
    this.shareLoading.set(false);
  }

  protected async copyShareLink() {
    const url = this.shareUrl();
    if (url) {
      await this.shareService.copyToClipboard(url);
    }
  }
}
