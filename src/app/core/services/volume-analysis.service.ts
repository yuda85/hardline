import { MuscleGroup, WorkoutPlan } from '../models';
import { EXERCISES } from '../../features/workout/exercise-data';

export interface MuscleGroupVolume {
  muscleGroup: MuscleGroup;
  label: string;
  sets: number;
  minRecommended: number;
  maxRecommended: number;
  status: 'optimal' | 'under' | 'over' | 'low' | 'high' | 'none';
}

export interface VolumeAnalysis {
  groups: MuscleGroupVolume[];
  balanceScore: number;
  recommendations: string[];
}

export const RECOMMENDED_RANGES: Record<MuscleGroup, { min: number; max: number }> = {
  [MuscleGroup.Chest]: { min: 10, max: 20 },
  [MuscleGroup.Back]: { min: 10, max: 20 },
  [MuscleGroup.Shoulders]: { min: 10, max: 15 },
  [MuscleGroup.UpperLegs]: { min: 6, max: 12 },
  [MuscleGroup.Hamstrings]: { min: 6, max: 12 },
  [MuscleGroup.Glutes]: { min: 6, max: 12 },
  [MuscleGroup.LowerLegs]: { min: 6, max: 12 },
  [MuscleGroup.Biceps]: { min: 4, max: 10 },
  [MuscleGroup.Triceps]: { min: 4, max: 10 },
  [MuscleGroup.Core]: { min: 6, max: 10 },
  [MuscleGroup.FullBody]: { min: 0, max: 10 },
};

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  [MuscleGroup.Chest]: 'Chest',
  [MuscleGroup.Back]: 'Back',
  [MuscleGroup.Shoulders]: 'Shoulders',
  [MuscleGroup.UpperLegs]: 'Quads',
  [MuscleGroup.Hamstrings]: 'Hamstrings',
  [MuscleGroup.Glutes]: 'Glutes',
  [MuscleGroup.LowerLegs]: 'Calves',
  [MuscleGroup.Biceps]: 'Biceps',
  [MuscleGroup.Triceps]: 'Triceps',
  [MuscleGroup.Core]: 'Core',
  [MuscleGroup.FullBody]: 'Full Body',
};

function getStatus(
  sets: number,
  min: number,
  max: number,
): MuscleGroupVolume['status'] {
  if (sets === 0) return 'none';
  if (sets >= min && sets <= max) return 'optimal';
  if (sets < min && sets >= min * 0.5) return 'under';
  if (sets < min * 0.5) return 'low';
  if (sets > max && sets <= max * 1.5) return 'over';
  return 'high';
}

export function analyzeVolume(plan: WorkoutPlan): VolumeAnalysis {
  // Build exercise lookup map
  const exerciseMap = new Map(EXERCISES.map(e => [e.id, e.muscleGroup]));

  // Count sets per muscle group across all days
  const setCounts = new Map<MuscleGroup, number>();
  for (const day of plan.days) {
    for (const group of day.exerciseGroups) {
      for (const exercise of group.exercises) {
        const muscleGroup = exerciseMap.get(exercise.exerciseId);
        if (muscleGroup) {
          setCounts.set(
            muscleGroup,
            (setCounts.get(muscleGroup) ?? 0) + exercise.sets.length,
          );
        }
      }
    }
  }

  // Build volume analysis for each muscle group (skip FullBody if 0 sets)
  const displayOrder: MuscleGroup[] = [
    MuscleGroup.Chest,
    MuscleGroup.Back,
    MuscleGroup.Shoulders,
    MuscleGroup.UpperLegs,
    MuscleGroup.Hamstrings,
    MuscleGroup.Glutes,
    MuscleGroup.LowerLegs,
    MuscleGroup.Biceps,
    MuscleGroup.Triceps,
    MuscleGroup.Core,
    MuscleGroup.FullBody,
  ];

  const groups: MuscleGroupVolume[] = displayOrder
    .map(mg => {
      const sets = setCounts.get(mg) ?? 0;
      const range = RECOMMENDED_RANGES[mg];
      return {
        muscleGroup: mg,
        label: MUSCLE_GROUP_LABELS[mg],
        sets,
        minRecommended: range.min,
        maxRecommended: range.max,
        status: getStatus(sets, range.min, range.max),
      };
    })
    .filter(g => g.muscleGroup !== MuscleGroup.FullBody || g.sets > 0);

  // Balance score: % of trained muscle groups that are in optimal range
  const trainedGroups = groups.filter(g => g.sets > 0);
  const optimalGroups = trainedGroups.filter(g => g.status === 'optimal');
  const balanceScore =
    trainedGroups.length > 0
      ? Math.round((optimalGroups.length / trainedGroups.length) * 100)
      : 0;

  // Recommendations
  const recommendations: string[] = [];
  for (const g of groups) {
    if (g.status === 'low' || g.status === 'under') {
      const deficit = g.minRecommended - g.sets;
      recommendations.push(
        `Add ${deficit} more ${g.label} set${deficit !== 1 ? 's' : ''} (currently ${g.sets}, aim for ${g.minRecommended}–${g.maxRecommended})`,
      );
    } else if (g.status === 'over' || g.status === 'high') {
      const surplus = g.sets - g.maxRecommended;
      recommendations.push(
        `Consider reducing ${g.label} by ${surplus} set${surplus !== 1 ? 's' : ''} (currently ${g.sets}, max recommended ${g.maxRecommended})`,
      );
    } else if (g.status === 'none' && g.muscleGroup !== MuscleGroup.FullBody) {
      recommendations.push(
        `No ${g.label} exercises — consider adding ${g.minRecommended}–${g.maxRecommended} sets/week`,
      );
    }
  }

  return { groups, balanceScore, recommendations };
}
