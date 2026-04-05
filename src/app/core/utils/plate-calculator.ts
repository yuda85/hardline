const AVAILABLE_PLATES = [20, 10, 5, 2.5, 1.25];

export interface PlateResult {
  perSide: number[];
  barWeight: number;
  achievedWeight: number;
}

export function calculatePlates(targetWeight: number, barWeight = 20): PlateResult {
  const perSide: number[] = [];
  let remaining = (targetWeight - barWeight) / 2;

  if (remaining <= 0) {
    return { perSide, barWeight, achievedWeight: barWeight };
  }

  for (const plate of AVAILABLE_PLATES) {
    while (remaining >= plate) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  const loadedWeight = perSide.reduce((sum, p) => sum + p, 0) * 2 + barWeight;
  return { perSide, barWeight, achievedWeight: loadedWeight };
}
