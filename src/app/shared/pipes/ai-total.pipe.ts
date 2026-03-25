import { Pipe, PipeTransform } from '@angular/core';
import { MealItem } from '../../core/models';

@Pipe({
  name: 'aiTotal',
  standalone: true,
})
export class AiTotalPipe implements PipeTransform {
  transform(items: MealItem[], field: keyof MealItem): number {
    return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  }
}
