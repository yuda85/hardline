import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { Meal } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class MealRepository extends BaseRepository<Meal> {
  protected readonly collectionName = 'meals';

  getTodaysMeals(userId: string): Observable<Meal[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.queryDocs([
      where('userId', '==', userId),
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<=', endOfDay),
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
