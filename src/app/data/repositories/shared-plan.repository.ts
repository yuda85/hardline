import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { SharedPlan } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class SharedPlanRepository extends BaseRepository<SharedPlan> {
  protected readonly collectionName = 'sharedPlans';

  getByShareId(shareId: string): Observable<SharedPlan[]> {
    return this.queryDocs([where('shareId', '==', shareId)]);
  }

  getByUser(userId: string): Observable<SharedPlan[]> {
    return this.queryDocs([where('sharedByUserId', '==', userId), orderBy('createdAt', 'desc')]);
  }
}
