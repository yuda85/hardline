import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { GeolocationTrackerService } from '../services/geolocation-tracker.service';
import { WakeLockService } from '../services/wake-lock.service';
import { Cardio } from '../../../store/cardio/cardio.actions';
import { CardioActivityType, CARDIO_ACTIVITIES } from '../../../core/models/cardio-session.model';

type StepStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';

@Component({
  selector: 'app-permission-onboarding',
  standalone: true,
  templateUrl: './permission-onboarding.html',
  styleUrl: './permission-onboarding.scss',
})
export class PermissionOnboardingComponent implements OnInit {
  private readonly tracker = inject(GeolocationTrackerService);
  private readonly wakeLock = inject(WakeLockService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);

  protected readonly geoStatus = signal<StepStatus>('idle');
  protected readonly wakeStatus = signal<StepStatus>('idle');
  protected readonly activityType = signal<CardioActivityType>('mtb');

  protected readonly activities = CARDIO_ACTIVITIES;

  async ngOnInit(): Promise<void> {
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type && type in CARDIO_ACTIVITIES) {
      this.activityType.set(type as CardioActivityType);
    }
    this.wakeStatus.set(this.wakeLock.isSupported() ? 'idle' : 'unsupported');

    // Silent check: if geolocation is already granted, skip straight to recording.
    if (await this.isGeolocationGranted()) {
      this.geoStatus.set('granted');
      this.store.dispatch(new Cardio.StartSession(this.activityType()));
      this.router.navigate(['/cardio/active']);
    }
  }

  private async isGeolocationGranted(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.permissions) return false;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state === 'granted';
    } catch {
      return false;
    }
  }

  protected async grantGeo(): Promise<void> {
    this.geoStatus.set('pending');
    try {
      await this.tracker.requestPermission();
      this.geoStatus.set('granted');
    } catch {
      this.geoStatus.set('denied');
    }
  }

  protected async grantWakeLock(): Promise<void> {
    if (!this.wakeLock.isSupported()) {
      this.wakeStatus.set('unsupported');
      return;
    }
    this.wakeStatus.set('pending');
    try {
      await this.wakeLock.acquire();
      await this.wakeLock.release();
      this.wakeStatus.set('granted');
    } catch {
      this.wakeStatus.set('denied');
    }
  }

  protected canContinue(): boolean {
    return this.geoStatus() === 'granted';
  }

  protected continue(): void {
    if (!this.canContinue()) return;
    this.store.dispatch(new Cardio.StartSession(this.activityType()));
    this.router.navigate(['/cardio/active']);
  }

  protected back(): void {
    this.router.navigate(['/cardio']);
  }
}
