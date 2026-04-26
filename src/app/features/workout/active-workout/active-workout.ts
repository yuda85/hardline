import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { OneRepMaxService } from '../../../core/services/one-rep-max.service';
import { calculatePlates, PlateResult } from '../../../core/utils/plate-calculator';
import { ExerciseListSheetComponent } from '../exercise-list-sheet/exercise-list-sheet';
import { ExerciseHistorySheetComponent } from '../exercise-history-sheet/exercise-history-sheet';
import { SessionStatsSheetComponent } from '../session-stats-sheet/session-stats-sheet';
import { AddExerciseSheetComponent } from '../add-exercise-sheet/add-exercise-sheet';
import { SwapExerciseSheetComponent } from '../swap-exercise-sheet/swap-exercise-sheet';
import { SessionExercise, MuscleGroup } from '../../../core/models';
import { EXERCISES } from '../exercise-data';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [
    FormsModule,
    ExerciseListSheetComponent,
    ExerciseHistorySheetComponent,
    SessionStatsSheetComponent,
    AddExerciseSheetComponent,
    SwapExerciseSheetComponent,
  ],
  templateUrl: './active-workout.html',
  styleUrl: './active-workout.scss',
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly oneRM = inject(OneRepMaxService);

  protected readonly session = this.store.selectSignal(WorkoutState.activeSession);
  protected readonly loading = this.store.selectSignal(WorkoutState.loading);
  protected readonly lastSessionData = this.store.selectSignal(WorkoutState.lastSessionData);
  protected readonly prs = this.store.selectSignal(WorkoutState.prs);
  protected readonly exerciseHistory = this.store.selectSignal(WorkoutState.exerciseHistory);

  // Navigation state
  protected readonly currentGroupIndex = signal(0);
  protected readonly currentExerciseIndex = signal(0);

  // UI toggles
  protected readonly showExerciseList = signal(false);
  protected readonly showHistorySheet = signal(false);
  protected readonly showStatsSheet = signal(false);
  protected readonly showAddExercise = signal(false);
  protected readonly showSwapExercise = signal(false);
  protected readonly showFinishConfirm = signal(false);
  protected readonly showAbandonConfirm = signal(false);
  protected readonly showConflictDialog = signal(false);
  private pendingPlanId: string | null = null;
  private pendingDayNumber: number | null = null;

  // Editing completed sets
  protected readonly editingSetIndex = signal<number | null>(null);

  // Carousel animation
  protected readonly slideDirection = signal<'none' | 'left' | 'right' | 'enter-left' | 'enter-right'>('none');

  // Rest timer state
  protected readonly resting = signal(false);
  protected readonly restTimeLeft = signal(0);
  /** Effective total used for the progress ring (grows when user taps +15s). */
  protected readonly restTotal = signal(0);

  // Input state
  protected readonly weight = signal(0);
  protected readonly reps = signal(0);

  // Session timer
  protected readonly elapsedSeconds = signal(0);

  // PR tracking
  protected readonly newPR = signal<string | null>(null);
  private readonly prsHitExercises = signal<Set<string>>(new Set());

  private restInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;

  // Confetti pieces for PR celebration
  protected readonly confettiPieces = Array.from({ length: 40 }, (_, i) => i);

  // Swipe tracking
  private touchStartX = 0;
  private touchStartY = 0;

  // ── Computed ──

  protected readonly currentGroup = computed(() => {
    return this.session()?.exerciseGroups[this.currentGroupIndex()] ?? null;
  });

  protected readonly currentExercise = computed(() => {
    return this.currentGroup()?.exercises[this.currentExerciseIndex()] ?? null;
  });

  protected readonly completedSetsCount = computed(() => {
    return this.currentExercise()?.sets.filter(s => s.completed).length ?? 0;
  });

  protected readonly totalSetsCount = computed(() => {
    return this.currentExercise()?.sets.length ?? 0;
  });

  protected readonly currentSet = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return null;
    return ex.sets[this.completedSetsCount()] ?? null;
  });

  protected readonly isExerciseDone = computed(() => {
    return this.completedSetsCount() >= this.totalSetsCount();
  });

  protected readonly isAllDone = computed(() => {
    const s = this.session();
    if (!s) return false;
    return s.exerciseGroups.every(g =>
      g.exercises.every(ex => ex.sets.every(set => set.completed)),
    );
  });

  protected readonly totalProgress = computed(() => {
    const s = this.session();
    if (!s) return 0;
    let total = 0, done = 0;
    for (const g of s.exerciseGroups) {
      for (const ex of g.exercises) {
        total += ex.sets.length;
        done += ex.sets.filter(set => set.completed).length;
      }
    }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  });

  protected readonly formattedTime = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  protected readonly exercisePR = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return null;
    return this.prs()[ex.exerciseId] ?? null;
  });

  protected readonly lastData = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return null;
    return this.lastSessionData()[ex.exerciseId] ?? null;
  });

  protected readonly flatExerciseIndex = computed(() => {
    const s = this.session();
    if (!s) return 0;
    let count = 0;
    for (let gi = 0; gi < this.currentGroupIndex(); gi++) {
      count += s.exerciseGroups[gi].exercises.length;
    }
    return count + this.currentExerciseIndex();
  });

  protected readonly totalExerciseCount = computed(() => {
    const s = this.session();
    if (!s) return 0;
    return s.exerciseGroups.reduce((sum, g) => sum + g.exercises.length, 0);
  });

  protected readonly restProgress = computed(() => {
    const total = this.restTotal();
    const left = this.restTimeLeft();
    if (total <= 0) return 0;
    const value = ((total - left) / total) * 816; // 2*pi*130
    return Math.max(0, Math.min(816, value));
  });

  // ── New computed for redesign ──

  protected readonly totalVolume = computed(() => {
    const s = this.session();
    if (!s) return 0;
    let vol = 0;
    for (const g of s.exerciseGroups) {
      for (const ex of g.exercises) {
        for (const set of ex.sets) {
          if (set.completed) vol += set.weight * set.actualReps;
        }
      }
    }
    return Math.round(vol);
  });

  protected readonly completedSetsTotal = computed(() => {
    const s = this.session();
    if (!s) return { done: 0, total: 0 };
    let done = 0, total = 0;
    for (const g of s.exerciseGroups) {
      for (const ex of g.exercises) {
        total += ex.sets.length;
        done += ex.sets.filter(set => set.completed).length;
      }
    }
    return { done, total };
  });

  protected readonly prsHitCount = computed(() => this.prsHitExercises().size);

  protected readonly estimatedCalories = computed(() => {
    // Rough estimate: ~0.05 kcal per kg lifted + base metabolic cost of time
    const vol = this.totalVolume();
    const minutes = this.elapsedSeconds() / 60;
    return Math.round(vol * 0.05 + minutes * 5);
  });

  protected readonly nextExerciseInfo = computed((): SessionExercise | null => {
    const s = this.session();
    if (!s) return null;
    const gi = this.currentGroupIndex();
    const ei = this.currentExerciseIndex();
    const group = s.exerciseGroups[gi];
    if (ei < group.exercises.length - 1) {
      return group.exercises[ei + 1];
    }
    if (gi < s.exerciseGroups.length - 1) {
      return s.exerciseGroups[gi + 1].exercises[0];
    }
    return null;
  });

  protected readonly nextExercisePlates = computed((): PlateResult | null => {
    const next = this.nextExerciseInfo();
    if (!next) return null;
    const lastData = this.lastSessionData()[next.exerciseId];
    if (!lastData || lastData.length === 0) return null;
    return calculatePlates(lastData[0].weight);
  });

  protected readonly nextExerciseLastWeight = computed(() => {
    const next = this.nextExerciseInfo();
    if (!next) return null;
    const lastData = this.lastSessionData()[next.exerciseId];
    if (!lastData || lastData.length === 0) return null;
    return lastData[0];
  });

  protected readonly prDistanceKg = computed(() => {
    const pr = this.exercisePR();
    if (!pr) return null;
    const w = this.weight();
    const r = this.reps();
    if (w <= 0 || r <= 0) return null;
    const est = this.oneRM.calculate(w, r || 1);
    const diff = pr.oneRepMax - est;
    return diff > 0 ? Math.round(diff * 10) / 10 : 0;
  });

  protected readonly currentExerciseMuscleGroup = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return '';
    const match = EXERCISES.find(e => e.id === ex.exerciseId);
    return match?.muscleGroup ?? '';
  });

  protected readonly currentExerciseMuscleGroupRaw = computed<MuscleGroup | null>(() => {
    const ex = this.currentExercise();
    if (!ex) return null;
    return EXERCISES.find(e => e.id === ex.exerciseId)?.muscleGroup ?? null;
  });

  protected readonly canSwapCurrent = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return false;
    if (!this.currentExerciseMuscleGroupRaw()) return false;
    return ex.sets.every(s => !s.completed);
  });

  protected readonly currentExerciseEquipment = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return '';
    const match = EXERCISES.find(e => e.id === ex.exerciseId);
    return match?.equipment ?? '';
  });

  protected readonly workoutDayName = computed(() => {
    const s = this.session();
    if (!s) return '';
    const plan = this.store.selectSnapshot(WorkoutState.activePlan);
    if (!plan) return `Day ${s.dayNumber}`;
    const day = plan.days.find(d => d.dayNumber === s.dayNumber);
    return day?.name ?? `Day ${s.dayNumber}`;
  });

  protected readonly currentExerciseHistory = computed(() => {
    const ex = this.currentExercise();
    if (!ex) return [];
    return this.exerciseHistory()[ex.exerciseId] ?? [];
  });

  // ── Lifecycle ──

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('planId');
    const dayNumber = Number(this.route.snapshot.paramMap.get('dayNumber'));
    if (!planId || !dayNumber) {
      this.router.navigate(['/workouts']);
      return;
    }

    const existing = this.session();
    if (existing && existing.planId === planId && existing.dayNumber === dayNumber) {
      // Resume existing session — calculate elapsed time from startedAt
      this.initTimerFromSession(existing.startedAt);
    } else if (existing) {
      // Conflict: different workout is active — ask user
      this.pendingPlanId = planId;
      this.pendingDayNumber = dayNumber;
      this.showConflictDialog.set(true);
      this.initTimerFromSession(existing.startedAt);
    } else {
      // No active session — start fresh
      this.store.dispatch(new Workout.StartSession(planId, dayNumber));
      this.startTimer(0);
    }

    this.acquireWakeLock();
  }

  private initTimerFromSession(startedAt: Date | any) {
    const start = startedAt instanceof Date
      ? startedAt
      : startedAt?.toDate?.() ?? new Date(startedAt);
    const elapsed = Math.floor((Date.now() - start.getTime()) / 1000);
    this.startTimer(Math.max(0, elapsed));
  }

  private startTimer(initialSeconds: number) {
    this.elapsedSeconds.set(initialSeconds);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  protected onConflictFinishOld() {
    this.store.dispatch(new Workout.FinishSession()).subscribe(() => {
      this.showConflictDialog.set(false);
      if (this.pendingPlanId && this.pendingDayNumber) {
        this.store.dispatch(new Workout.StartSession(this.pendingPlanId, this.pendingDayNumber));
        this.startTimer(0);
      }
    });
  }

  protected onConflictDiscardOld() {
    this.store.dispatch(new Workout.AbandonSession()).subscribe(() => {
      this.showConflictDialog.set(false);
      if (this.pendingPlanId && this.pendingDayNumber) {
        this.store.dispatch(new Workout.StartSession(this.pendingPlanId, this.pendingDayNumber));
        this.startTimer(0);
      }
    });
  }

  protected onConflictCancel() {
    this.showConflictDialog.set(false);
    // Stay on the existing workout
    const existing = this.session();
    if (existing) {
      this.router.navigate(['/workouts', 'active', existing.planId, existing.dayNumber]);
    }
  }

  ngOnDestroy() {
    this.clearRestTimer();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.releaseWakeLock();
  }

  // ── Actions ──

  protected completeCurrentSet() {
    const si = this.completedSetsCount();
    const el = document.querySelector(`.aw__set-row[data-set-index="${si}"]`);
    const wInput = el?.querySelector<HTMLInputElement>('.aw__set-input--weight');
    const rInput = el?.querySelector<HTMLInputElement>('.aw__set-input--reps');
    const w = wInput ? +wInput.value : 0;
    const r = rInput ? +rInput.value : 0;
    this.completeSetAt(si, w, r);
  }

  protected completeSetAt(setIndex: number, w: number, r: number) {
    const gi = this.currentGroupIndex();
    const ei = this.currentExerciseIndex();
    const ex = this.currentExercise();
    if (!ex) return;

    const targetReps = ex.sets[setIndex]?.targetReps || 10;
    const actualW = w || 0;
    const actualR = r || targetReps;

    const exerciseId = ex.exerciseId;

    // Check PR locally before dispatching — we have current PR data and can calculate 1RM
    if (actualW > 0 && actualR > 0 && actualR <= 10) {
      const estimated = this.oneRM.calculate(actualW, actualR);
      const currentPR = this.prs()[exerciseId]?.oneRepMax ?? 0;
      if (estimated > currentPR) {
        this.newPR.set(`${actualW}kg × ${actualR} reps — Est. 1RM: ${Math.round(estimated)}kg`);
        this.prsHitExercises.update(s => new Set([...s, exerciseId]));
      }
    }

    this.store.dispatch(new Workout.CompleteSet(gi, ei, setIndex, actualR, actualW));

    const group = this.currentGroup();
    const nextUncompleted = ex.sets.findIndex((s, i) => i > setIndex && !s.completed);
    if (nextUncompleted !== -1 && group) {
      this.startRestTimer(group.restSeconds);
    }
  }

  protected addSet() {
    this.store.dispatch(new Workout.AddSet(this.currentGroupIndex(), this.currentExerciseIndex()));
  }

  protected removeSet(setIndex: number) {
    if (this.editingSetIndex() === setIndex) this.editingSetIndex.set(null);
    this.store.dispatch(new Workout.RemoveSet(this.currentGroupIndex(), this.currentExerciseIndex(), setIndex));
  }

  protected editSet(setIndex: number) {
    this.editingSetIndex.set(setIndex);
  }

  protected saveEditedSet(setIndex: number, w: number, r: number) {
    this.editingSetIndex.set(null);
    this.completeSetAt(setIndex, w, r);
  }

  protected calculate1RM(weight: number, reps: number): number {
    return this.oneRM.calculate(weight, reps);
  }

  protected incrementWeight(delta: number) {
    this.weight.update(w => Math.max(0, +(w + delta).toFixed(2)));
  }

  protected incrementReps(delta: number) {
    this.reps.update(r => Math.max(0, r + delta));
  }

  protected navigateTo(target: { groupIndex: number; exerciseIndex: number }) {
    this.clearRestTimer();
    this.currentGroupIndex.set(target.groupIndex);
    this.currentExerciseIndex.set(target.exerciseIndex);
    this.showExerciseList.set(false);
    this.weight.set(0);
    this.reps.set(0);
  }

  protected goNextExercise() {
    this.clearRestTimer();
    const s = this.session();
    if (!s) return;
    const group = s.exerciseGroups[this.currentGroupIndex()];
    const canAdvance =
      this.currentExerciseIndex() < group.exercises.length - 1 ||
      this.currentGroupIndex() < s.exerciseGroups.length - 1;
    if (!canAdvance) return;

    this.animateSlide('left', () => {
      if (this.currentExerciseIndex() < group.exercises.length - 1) {
        this.currentExerciseIndex.update(i => i + 1);
      } else {
        this.currentGroupIndex.update(i => i + 1);
        this.currentExerciseIndex.set(0);
      }
      this.weight.set(0);
      this.reps.set(0);
    });
  }

  protected goPrevExercise() {
    this.clearRestTimer();
    const canGoBack = this.currentExerciseIndex() > 0 || this.currentGroupIndex() > 0;
    if (!canGoBack) return;

    this.animateSlide('right', () => {
      if (this.currentExerciseIndex() > 0) {
        this.currentExerciseIndex.update(i => i - 1);
      } else {
        this.currentGroupIndex.update(i => i - 1);
        const group = this.session()?.exerciseGroups[this.currentGroupIndex()];
        this.currentExerciseIndex.set((group?.exercises.length ?? 1) - 1);
      }
      this.weight.set(0);
      this.reps.set(0);
    });
  }

  private animateSlide(direction: 'left' | 'right', onMid: () => void) {
    this.slideDirection.set(direction);
    setTimeout(() => {
      onMid();
      this.slideDirection.set(direction === 'left' ? 'enter-right' : 'enter-left');
      setTimeout(() => this.slideDirection.set('none'), 130);
    }, 120);
  }

  protected addRestTime() {
    this.restTimeLeft.update(t => t + 15);
    // Grow the ring's denominator so the bar doesn't overshoot/wrap.
    this.restTotal.update(t => Math.max(t, this.restTimeLeft()));
  }

  protected subRestTime() {
    this.restTimeLeft.update(t => Math.max(0, t - 15));
  }

  protected skipRest() {
    this.clearRestTimer();
  }

  protected openHistory() {
    const ex = this.currentExercise();
    if (ex) {
      this.store.dispatch(new Workout.LoadExerciseHistory(ex.exerciseId));
    }
    this.showHistorySheet.set(true);
  }

  protected onHistoryWeightSelected(weight: number) {
    this.weight.set(weight);
    this.showHistorySheet.set(false);
  }

  protected onAddExercise(exercise: { exerciseId: string; exerciseName: string; sets: number; targetReps: number }) {
    this.store.dispatch(new Workout.AddExerciseToSession(exercise)).subscribe(() => {
      this.showAddExercise.set(false);
      // Navigate to the newly added exercise (last group, first exercise)
      const s = this.session();
      if (s) {
        this.currentGroupIndex.set(s.exerciseGroups.length - 1);
        this.currentExerciseIndex.set(0);
        this.weight.set(0);
        this.reps.set(0);
      }
    });
  }

  protected onSwapPicked(picked: { exerciseId: string; exerciseName: string }) {
    this.store.dispatch(
      new Workout.SwapExercise(
        this.currentGroupIndex(),
        this.currentExerciseIndex(),
        picked.exerciseId,
        picked.exerciseName,
      ),
    );
    this.showSwapExercise.set(false);
  }

  protected finishWorkout() {
    this.store.dispatch(new Workout.FinishSession()).subscribe(() => {
      this.router.navigate(['/workouts', 'summary']);
    });
  }

  protected abandonWorkout() {
    this.store.dispatch(new Workout.AbandonSession()).subscribe(() => {
      this.router.navigate(['/workouts']);
    });
  }

  // ── Swipe gestures ──

  protected onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  }

  protected onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    // Only trigger if horizontal swipe is dominant and > 50px
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) this.goNextExercise();
      else this.goPrevExercise();
    }
  }

  // ── Internal ──

  private startRestTimer(seconds: number) {
    this.resting.set(true);
    this.restTimeLeft.set(seconds);
    this.restTotal.set(seconds);
    this.restInterval = setInterval(() => {
      this.restTimeLeft.update(t => {
        if (t <= 1) { this.clearRestTimer(); this.alertRestDone(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  private clearRestTimer() {
    this.resting.set(false);
    this.restTimeLeft.set(0);
    this.restTotal.set(0);
    if (this.restInterval) { clearInterval(this.restInterval); this.restInterval = null; }
  }

  private alertRestDone() {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.3;
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch { /* noop */ }
  }

  private async acquireWakeLock() {
    try { if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen'); } catch { /* noop */ }
  }

  private async releaseWakeLock() {
    if (this.wakeLock) { await this.wakeLock.release(); this.wakeLock = null; }
  }
}
