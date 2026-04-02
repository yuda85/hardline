import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { AIService } from '../../../core/services/ai.service';
import { EnergyState } from '../../../store/energy/energy.state';
import { Energy } from '../../../store/energy/energy.actions';
import { ButtonComponent, CardComponent, BadgeComponent } from '../../../shared/components';
import { AiTotalPipe } from '../../../shared/pipes/ai-total.pipe';
import { MealItem, MealType } from '../../../core/models/energy.model';

@Component({
  selector: 'app-ai-meal-input-energy',
  standalone: true,
  imports: [FormsModule, ButtonComponent, CardComponent, BadgeComponent, AiTotalPipe],
  templateUrl: './ai-meal-input.html',
  styleUrl: './ai-meal-input.scss',
})
export class AIMealInputEnergyComponent {
  private readonly store = inject(Store);
  private readonly aiService = inject(AIService);

  readonly mealAdded = output<void>();

  protected readonly text = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<MealItem[] | null>(null);
  protected readonly saving = signal(false);
  protected readonly selectedMealType = signal<MealType>('lunch');

  protected readonly mealTypes: { value: MealType; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
  ];

  protected async analyze() {
    const input = this.text().trim();
    if (!input) return;

    this.loading.set(true);
    this.error.set(null);
    this.preview.set(null);

    try {
      const result = await this.aiService.parseTextToMeal(input);
      this.preview.set(result.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to analyze food');
    } finally {
      this.loading.set(false);
    }
  }

  protected async confirm() {
    const items = this.preview();
    if (!items) return;

    this.saving.set(true);
    const date = this.store.selectSnapshot(EnergyState.selectedDate);

    this.store
      .dispatch(
        new Energy.AddMeal({
          date,
          mealType: this.selectedMealType(),
          items,
          totalCalories: items.reduce((s, i) => s + i.calories, 0),
          totalProtein: items.reduce((s, i) => s + i.protein, 0),
          totalCarbs: items.reduce((s, i) => s + i.carbs, 0),
          totalFat: items.reduce((s, i) => s + i.fat, 0),
          source: 'ai_text',
          confidence: 0.85,
        }),
      )
      .subscribe(() => {
        this.saving.set(false);
        this.text.set('');
        this.preview.set(null);
        this.mealAdded.emit();
      });
  }

  protected cancel() {
    this.preview.set(null);
    this.error.set(null);
  }
}
