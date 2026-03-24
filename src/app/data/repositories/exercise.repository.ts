import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { where, orderBy } from '@angular/fire/firestore';
import { BaseRepository } from './base.repository';
import { Exercise, MuscleGroup } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class ExerciseRepository extends BaseRepository<Exercise> {
  protected readonly collectionName = 'exercises';

  getByMuscleGroup(group: MuscleGroup): Observable<Exercise[]> {
    return this.queryDocs([where('muscleGroup', '==', group), orderBy('name', 'asc')]);
  }
}
