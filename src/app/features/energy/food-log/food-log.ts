import { Component, inject, OnInit, signal } from '@angular/core';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { AuthState } from '../../../store/auth/auth.state';
import { ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent, SkeletonComponent } from '../../../shared/components';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import { CalorieRingComponent } from '../shared/calorie-ring/calorie-ring';
import { AddMealEnergyComponent } from '../add-meal/add-meal';
import { AIMealInputEnergyComponent } from '../ai-meal-input/ai-meal-input';
import { MealType } from '../../../core/models/energy.model';
import { toDate } from '../../../core/services/date.util';

@Component({
  selector: 'app-food-log',
  standalone: true,
  imports: [ButtonComponent, CardComponent, IconButtonComponent, BadgeComponent, SkeletonComponent, MacroBarsComponent, CalorieRingComponent, AddMealEnergyComponent, AIMealInputEnergyComponent],
  templateUrl: './food-log.html',
  styleUrl: './food-log.scss',
})
export class FoodLogComponent implements OnInit {
  private readonly store = inject(Store);

  protected readonly meals = this.store.selectSignal(EnergyState.todaysMeals);
  protected readonly goals = this.store.selectSignal(EnergyState.goalSettings);
  protected readonly summary = this.store.selectSignal(EnergyState.dailySummary);
  protected readonly loading = this.store.selectSignal(EnergyState.loading);
  protected readonly selectedDate = this.store.selectSignal(EnergyState.selectedDate);

  protected readonly showAddMeal = signal(false);
  protected readonly mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings());
    const today = new Date().toISOString().split('T')[0];
    this.store.dispatch(new Energy.FetchDayData(today));
  }

  protected prevDay() {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() - 1);
    this.store.dispatch(new Energy.SetDate(current.toISOString().split('T')[0]));
  }

  protected nextDay() {
    const current = new Date(this.selectedDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() + 1);
    if (current <= today) {
      this.store.dispatch(new Energy.SetDate(current.toISOString().split('T')[0]));
    }
  }

  protected removeMeal(mealId: string | undefined) {
    if (mealId) this.store.dispatch(new Energy.RemoveMeal(mealId));
  }

  protected getMealsByType(type: MealType) {
    return this.meals().filter(m => m.mealType === type);
  }

  protected getMealTypeCalories(type: MealType): number {
    return this.getMealsByType(type).reduce((s, m) => s + m.totalCalories, 0);
  }

  protected formatDate(dateStr: string): string {
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    if (target.getTime() === today.getTime()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (target.getTime() === yesterday.getTime()) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  protected formatTime(timestamp: Date | unknown): string {
    if (!timestamp) return '';
    const date = toDate(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}
