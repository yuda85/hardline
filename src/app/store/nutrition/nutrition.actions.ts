import { Meal } from '../../core/models';

export namespace Nutrition {
  export class FetchMeals {
    static readonly type = '[Nutrition] Fetch Meals';
    constructor(public date: string) {}
  }

  export class AddMeal {
    static readonly type = '[Nutrition] Add Meal';
    constructor(public meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) {}
  }

  export class RemoveMeal {
    static readonly type = '[Nutrition] Remove Meal';
    constructor(public mealId: string) {}
  }

  export class UpdateMeal {
    static readonly type = '[Nutrition] Update Meal';
    constructor(
      public mealId: string,
      public changes: Partial<Meal>,
    ) {}
  }

  export class SetDate {
    static readonly type = '[Nutrition] Set Date';
    constructor(public date: string) {}
  }

  export class Reset {
    static readonly type = '[Nutrition] Reset';
  }
}
