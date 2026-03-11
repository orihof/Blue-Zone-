/// lib/biomarker-utils.ts

export type BiomarkerDeltaResult =
  | { status: "below";  direction: "↑"; delta: number; unit: string }
  | { status: "within"; direction: null }
  | { status: "above";  direction: "↓"; delta: number; unit: string };

/**
 * Returns the optimal zone's min/max from a rangeZones array.
 * Matches by label (case-insensitive "optimal") first, then by the provided green color token.
 * Returns null if no optimal zone can be identified.
 */
export function getOptimalRange(
  rangeZones: Array<{ label: string; max: number; color: string }>,
  greenColor: string,
): { optimalMin: number; optimalMax: number } | null {
  const idx = rangeZones.findIndex(
    z => z.label.toLowerCase().includes("optimal") || z.color === greenColor,
  );
  if (idx === -1) return null;
  const optimalMin = idx === 0 ? 0 : rangeZones[idx - 1].max;
  const optimalMax = rangeZones[idx].max;
  return { optimalMin, optimalMax };
}

/**
 * Calculates how far a biomarker value is from the optimal range.
 * Deltas are rounded to 1 decimal place.
 */
export function getBiomarkerDelta(
  current: number,
  optimalMin: number,
  optimalMax: number,
  unit: string,
): BiomarkerDeltaResult {
  if (current < optimalMin) {
    return {
      status: "below",
      direction: "↑",
      delta: +Math.abs(optimalMin - current).toFixed(1),
      unit,
    };
  }
  if (current > optimalMax) {
    return {
      status: "above",
      direction: "↓",
      delta: +Math.abs(current - optimalMax).toFixed(1),
      unit,
    };
  }
  return { status: "within", direction: null };
}
