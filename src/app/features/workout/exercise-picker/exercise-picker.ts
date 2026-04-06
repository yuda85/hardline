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
  readonly multiSelect = input(false);
  readonly picked = output<Exercise>();
  readonly pickedMultiple = output<Exercise[]>();
  readonly closed = output<void>();

  protected readonly selectedExercises = signal<Exercise[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly selectedGroups = signal<Set<MuscleGroup>>(new Set());
  protected readonly showCreateForm = signal(false);
  protected readonly customExercises = signal<Exercise[]>([]);

  // Create form
  protected readonly newName = signal('');
  protected readonly newMuscleGroup = signal<MuscleGroup>(MuscleGroup.Chest);
  protected readonly newEquipment = signal('Barbell');
  protected readonly newTags = signal('');

  protected readonly muscleGroups: { value: MuscleGroup; label: string }[] = [
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
    const groups = this.selectedGroups();
    const query = this.searchQuery().toLowerCase().trim();

    if (preFilter) {
      list = list.filter(e => e.muscleGroup === preFilter);
    } else if (groups.size > 0) {
      list = list.filter(e => groups.has(e.muscleGroup));
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
      this.selectedGroups.set(new Set([preFilter]));
    }
  }

  protected toggleGroup(group: MuscleGroup) {
    this.selectedGroups.update(set => {
      const next = new Set(set);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  protected selectExercise(exercise: Exercise) {
    if (this.multiSelect()) {
      this.toggleSelection(exercise);
    } else {
      this.picked.emit(exercise);
    }
  }

  protected toggleSelection(exercise: Exercise) {
    this.selectedExercises.update(list => {
      const exists = list.find(e => e.id === exercise.id);
      return exists ? list.filter(e => e.id !== exercise.id) : [...list, exercise];
    });
  }

  protected isSelected(exercise: Exercise): boolean {
    return this.selectedExercises().some(e => e.id === exercise.id);
  }

  protected confirmSelection() {
    this.pickedMultiple.emit(this.selectedExercises());
    this.selectedExercises.set([]);
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
