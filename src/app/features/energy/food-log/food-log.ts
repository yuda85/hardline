import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { MacroBarsComponent } from '../shared/macro-bars/macro-bars';
import { CalorieRingComponent } from '../shared/calorie-ring/calorie-ring';
import { AddMealEnergyComponent } from '../add-meal/add-meal';
import { AIMealInputEnergyComponent } from '../ai-meal-input/ai-meal-input';
import { MealType } from '../../../core/models/energy.model';
import { toDate } from '../../../core/services/date.util';

interface DayItem {
  dateStr: string;
  dayAbbr: string;
  dateLabel: string;
  offset: number;
}

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'egg_alt',
  lunch: 'lunch_dining',
  dinner: 'dinner_dining',
  snack: 'cookie',
};

const MEAL_EMPTY_LABELS: Record<MealType, string> = {
  breakfast: 'No Breakfast Logged',
  lunch: 'No Lunch Logged',
  dinner: 'Dinner Pending',
  snack: 'No Snacks Logged',
};

@Component({
  selector: 'app-food-log',
  standalone: true,
  imports: [TitleCasePipe, MacroBarsComponent, CalorieRingComponent, AddMealEnergyComponent, AIMealInputEnergyComponent],
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

  // Editorial date nav: show 5 days centered on selected date
  protected readonly weekDays = computed<DayItem[]>(() => {
    const selected = new Date(this.selectedDate() + 'T00:00:00');
    const days: DayItem[] = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(selected);
      d.setDate(selected.getDate() + i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        dayAbbr: d.toLocaleDateString('en', { weekday: 'short' }).toUpperCase(),
        dateLabel: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase(),
        offset: i,
      });
    }
    return days;
  });

  protected readonly remainingCalories = computed(() => {
    const g = this.goals();
    const s = this.summary();
    if (!g) return 0;
    return g.dailyCalories - (s?.consumedCalories ?? 0);
  });

  ngOnInit() {
    this.store.dispatch(new Energy.LoadGoalSettings());
    const today = new Date().toISOString().split('T')[0];
    this.store.dispatch(new Energy.FetchDayData(today));
  }

  protected selectDay(dateStr: string) {
    this.store.dispatch(new Energy.SetDate(dateStr));
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

  protected getMealIcon(type: MealType): string {
    return MEAL_ICONS[type];
  }

  protected getEmptyLabel(type: MealType): string {
    return MEAL_EMPTY_LABELS[type];
  }

  protected formatTime(timestamp: Date | unknown): string {
    if (!timestamp) return '';
    const date = toDate(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
}
