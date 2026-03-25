import { Pipe, PipeTransform } from '@angular/core';
import { SessionSet } from '../../core/models';

@Pipe({
  name: 'completedSets',
  standalone: true,
})
export class CompletedSetsPipe implements PipeTransform {
  transform(sets: SessionSet[]): number {
    return sets.filter(s => s.completed).length;
  }
}
