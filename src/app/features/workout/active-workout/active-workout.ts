import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Workout } from '../../../store/workout/workout.actions';
import { WorkoutState } from '../../../store/workout/workout.state';
import { OneRepMaxService } from '../../../core/services/one-rep-max.service';
import { ButtonComponent, IconButtonComponent, BadgeComponent } from '../../../shared/components';
import { ExerciseListSheetComponent } from '../exercise-list-sheet/exercise-list-sheet';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconButtonComponent, BadgeComponent, ExerciseListSheetComponent],
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

  protected readonly currentGroupIndex = signal(0);
  protected readonly currentExerciseIndex = signal(0);
  protected readonly showExerciseList = signal(false);
  protected readonly resting = signal(false);
  protected readonly restTimeLeft = signal(0);
  protected readonly weight = signal(0);
  protected readonly reps = signal(0);
  protected readonly elapsedSeconds = signal(0);
  protected readonly newPR = signal<string | null>(null);
  protected readonly showFinishConfirm = signal(false);
  protected readonly showAbandonConfirm = signal(false);

  private restInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private wakeLock: WakeLockSentinel | null = null;

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
    const group = this.currentGroup();
    if (!group) return 0;
    const total = group.restSeconds;
    const left = this.restTimeLeft();
    if (total <= 0) return 0;
    return ((total - left) / total) * 552; // 552 = 2*pi*r where r=88
  });

  ngOnInit() {
    const planId = this.route.snapshot.paramMap.get('planId');
    const dayNumber = Number(this.route.snapshot.paramMap.get('dayNumber'));
    if (!planId || !dayNumber) {
      this.router.navigate(['/workouts']);
      return;
    }
    this.store.dispatch(new Workout.StartSession(planId, dayNumber));
    this.acquireWakeLock();
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
  }

  ngOnDestroy() {
    this.clearRestTimer();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.releaseWakeLock();
  }

  protected completeSet() {
    const gi = this.currentGroupIndex();
    const ei = this.currentExerciseIndex();
    const si = this.completedSetsCount();
    const w = this.weight() || 0;
    const r = this.reps() || this.currentSet()?.targetReps || 0;

    this.store.dispatch(new Workout.CompleteSet(gi, ei, si, r, w));

    if (w > 0 && r > 0 && r <= 10) {
      const estimated = this.oneRM.calculate(w, r);
      const pr = this.exercisePR();
      if (!pr || estimated > pr.oneRepMax) {
        this.newPR.set(`New PR! Est. 1RM: ${estimated}kg`);
        setTimeout(() => this.newPR.set(null), 3000);
      }
    }

    const group = this.currentGroup();
    if (si + 1 < this.totalSetsCount() && group) {
      this.startRestTimer(group.restSeconds);
    }

    this.weight.set(0);
    this.reps.set(0);
  }

  protected addSet() {
    this.store.dispatch(new Workout.AddSet(this.currentGroupIndex(), this.currentExerciseIndex()));
  }

  protected calculate1RM(weight: number, reps: number): number {
    return this.oneRM.calculate(weight, reps);
  }

  protected navigateTo(target: { groupIndex: number; exerciseIndex: number }) {
    this.clearRestTimer();
    this.currentGroupIndex.set(target.groupIndex);
    this.currentExerciseIndex.set(target.exerciseIndex);
    this.showExerciseList.set(false);
    this.weight.set(0);
    this.reps.set(0);
  }

  protected nextExercise() {
    this.clearRestTimer();
    const s = this.session();
    if (!s) return;
    const group = s.exerciseGroups[this.currentGroupIndex()];
    if (this.currentExerciseIndex() < group.exercises.length - 1) {
      this.currentExerciseIndex.update(i => i + 1);
    } else if (this.currentGroupIndex() < s.exerciseGroups.length - 1) {
      this.currentGroupIndex.update(i => i + 1);
      this.currentExerciseIndex.set(0);
    }
    this.weight.set(0);
    this.reps.set(0);
  }

  protected prevExercise() {
    this.clearRestTimer();
    if (this.currentExerciseIndex() > 0) {
      this.currentExerciseIndex.update(i => i - 1);
    } else if (this.currentGroupIndex() > 0) {
      this.currentGroupIndex.update(i => i - 1);
      const group = this.session()?.exerciseGroups[this.currentGroupIndex()];
      this.currentExerciseIndex.set((group?.exercises.length ?? 1) - 1);
    }
    this.weight.set(0);
    this.reps.set(0);
  }

  protected addRestTime() {
    this.restTimeLeft.update(t => t + 15);
  }

  protected skipRest() {
    this.clearRestTimer();
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

  private startRestTimer(seconds: number) {
    this.resting.set(true);
    this.restTimeLeft.set(seconds);
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
