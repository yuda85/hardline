import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { Meal } from '../../core/models/energy.model';

@Injectable({ providedIn: 'root' })
export class MealRepository extends BaseRepository<Meal> {
  protected readonly collectionName = 'meals';

  getByDate(userId: string, date: string): Observable<Meal[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('date', '==', date),
      orderBy('timestamp', 'desc'),
    ]);
  }

  getByDateRange(userId: string, startDate: Date, endDate: Date): Observable<Meal[]> {
    return this.queryDocs([
      where('userId', '==', userId),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc'),
    ]);
  }
}
