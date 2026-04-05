import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Exercise, MuscleGroup } from '../../../core/models';
import { ButtonComponent, IconButtonComponent } from '../../../shared/components';
import { EXERCISES } from '../exercise-data';

@Component({
  selector: 'app-exercise-picker',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconButtonComponent],
  templateUrl: './exercise-picker.html',
  styleUrl: './exercise-picker.scss',
})
export class ExercisePickerComponent {
  readonly filterMuscleGroup = input<MuscleGroup | null>(null);
  readonly picked = output<Exercise>();
  readonly closed = output<void>();

  protected readonly searchQuery = signal('');
  protected readonly selectedGroup = signal<MuscleGroup | ''>('');
  protected readonly showCreateForm = signal(false);
  protected readonly customExercises = signal<Exercise[]>([]);

  // Create form
  protected readonly newName = signal('');
  protected readonly newMuscleGroup = signal<MuscleGroup>(MuscleGroup.Chest);
  protected readonly newEquipment = signal('Barbell');
  protected readonly newTags = signal('');

  protected readonly muscleGroups: { value: MuscleGroup | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: MuscleGroup.Chest, label: 'Chest' },
    { value: MuscleGroup.Back, label: 'Back' },
    { value: MuscleGroup.Shoulders, label: 'Shoulders' },
    { value: MuscleGroup.UpperLegs, label: 'Upper Legs' },
    { value: MuscleGroup.LowerLegs, label: 'Lower Legs' },
    { value: MuscleGroup.Biceps, label: 'Biceps' },
    { value: MuscleGroup.Triceps, label: 'Triceps' },
    { value: MuscleGroup.Core, label: 'Core' },
    { value: MuscleGroup.FullBody, label: 'Full Body' },
  ];

  protected readonly equipmentOptions = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Band'];

  protected readonly allExercises = computed(() => [...EXERCISES, ...this.customExercises()]);

  protected readonly filteredExercises = computed(() => {
    let list = this.allExercises();
    const preFilter = this.filterMuscleGroup();
    const group = preFilter ?? (this.selectedGroup() || null);
    const query = this.searchQuery().toLowerCase().trim();

    if (group) {
      list = list.filter(e => e.muscleGroup === group);
    }

    if (query) {
      list = list.filter(
        e =>
          e.name.toLowerCase().includes(query) ||
          e.tags.some(t => t.toLowerCase().includes(query)) ||
          e.equipment.toLowerCase().includes(query),
      );
    }

    return list;
  });

  constructor() {
    const preFilter = this.filterMuscleGroup();
    if (preFilter) {
      this.selectedGroup.set(preFilter);
    }
  }

  protected selectExercise(exercise: Exercise) {
    this.picked.emit(exercise);
  }

  protected createExercise() {
    const name = this.newName().trim();
    if (!name) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name,
      muscleGroup: this.newMuscleGroup(),
      equipment: this.newEquipment(),
      tags: this.newTags()
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean),
    };

    this.customExercises.update(list => [...list, exercise]);
    this.picked.emit(exercise);

    // Reset form
    this.newName.set('');
    this.newTags.set('');
    this.showCreateForm.set(false);
  }
}
