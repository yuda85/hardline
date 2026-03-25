import { Injectable } from '@angular/core';
import { WorkoutPlan, WorkoutDay } from '../models';

export interface ExportedPlan {
  version: 2;
  name: string;
  description?: string;
  days: WorkoutDay[];
  exportedAt: string;
}

@Injectable({ providedIn: 'root' })
export class WorkoutIOService {
  exportPlan(plan: WorkoutPlan): void {
    const exported: ExportedPlan = {
      version: 2,
      name: plan.name,
      description: plan.description,
      days: plan.days,
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(exported, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importPlan(file: File): Promise<Omit<WorkoutPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    const text = await file.text();
    const data = JSON.parse(text);
    return this.validateImport(data);
  }

  private validateImport(data: unknown): Omit<WorkoutPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid file: not a JSON object');
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj['name'] !== 'string' || !obj['name']) {
      throw new Error('Invalid file: missing plan name');
    }

    if (!Array.isArray(obj['days']) || obj['days'].length === 0) {
      throw new Error('Invalid file: no days found');
    }

    const days: WorkoutDay[] = (obj['days'] as Record<string, unknown>[]).map((day, di) => {
      const d = day as Record<string, unknown>;
      const groups = Array.isArray(d['exerciseGroups']) ? d['exerciseGroups'] : [];

      return {
        dayNumber: Number(d['dayNumber']) || di + 1,
        name: String(d['name'] || `Day ${di + 1}`),
        exerciseGroups: (groups as Record<string, unknown>[]).map(g => {
          const group = g as Record<string, unknown>;
          const exercises = Array.isArray(group['exercises']) ? group['exercises'] : [];

          return {
            type: (['single', 'superset', 'circuit'].includes(String(group['type']))
              ? String(group['type'])
              : 'single') as 'single' | 'superset' | 'circuit',
            restSeconds: Math.max(0, Number(group['restSeconds']) || 60),
            exercises: (exercises as Record<string, unknown>[]).map(ex => ({
              exerciseId: String(ex['exerciseId'] || 'unknown'),
              exerciseName: String(ex['exerciseName'] || 'Unknown Exercise'),
              sets: Array.isArray(ex['sets'])
                ? (ex['sets'] as Record<string, unknown>[]).map(s => ({
                    targetReps: Math.max(1, Number(s['targetReps']) || 10),
                  }))
                : [{ targetReps: 10 }],
              notes: ex['notes'] ? String(ex['notes']) : undefined,
            })),
          };
        }),
      };
    });

    return {
      name: String(obj['name']),
      description: obj['description'] ? String(obj['description']) : undefined,
      days,
    };
  }
}
