import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Energy } from '../../../store/energy/energy.actions';
import { EnergyState } from '../../../store/energy/energy.state';
import { ButtonComponent, IconButtonComponent } from '../../../shared/components';
import { MealItem, MealType } from '../../../core/models/energy.model';

@Component({
  selector: 'app-add-meal-energy',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconButtonComponent],
  templateUrl: './add-meal.html',
  styleUrl: './add-meal.scss',
})
export class AddMealEnergyComponent {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly selectedMealType = signal<MealType>('lunch');
  protected readonly mealTypes: { value: MealType; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    items: this.fb.array([this.createItem()]),
  });

  protected get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  protected createItem() {
    return this.fb.nonNullable.group({
      name: ['', Validators.required],
      calories: [0, [Validators.required, Validators.min(0)]],
      protein: [0, [Validators.required, Validators.min(0)]],
      carbs: [0, [Validators.required, Validators.min(0)]],
      fat: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(0.1)]],
      unit: ['serving'],
    });
  }

  protected addItem() { this.items.push(this.createItem()); }

  protected removeItem(index: number) {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  protected save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const items: MealItem[] = this.items.value as MealItem[];
    const date = this.store.selectSnapshot(EnergyState.selectedDate);

    this.store.dispatch(new Energy.AddMeal({
      date,
      mealType: this.selectedMealType(),
      items,
      totalCalories: items.reduce((s, i) => s + i.calories, 0),
      totalProtein: items.reduce((s, i) => s + i.protein, 0),
      totalCarbs: items.reduce((s, i) => s + i.carbs, 0),
      totalFat: items.reduce((s, i) => s + i.fat, 0),
      source: 'manual',
      confidence: 1,
    })).subscribe(() => {
      this.saving.set(false);
      this.closed.emit();
    });
  }

  protected close() { this.closed.emit(); }
}
