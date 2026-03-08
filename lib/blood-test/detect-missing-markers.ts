/// lib/blood-test/detect-missing-markers.ts

import { BIOMARKER_REGISTRY, BiomarkerDefinition, BiomarkerCategory } from "./biomarker-registry";

export interface DetectionResult {
  isComplete:         boolean;
  completenessScore:  number;                                  // 0–100, based on essential markers only
  detectedMarkers:    string[];                                // biomarker IDs found
  missingEssential:   BiomarkerDefinition[];
  missingRecommended: BiomarkerDefinition[];
  missingByCategory:  Partial<Record<BiomarkerCategory, BiomarkerDefinition[]>>;
  shouldShowModal:    boolean;                                 // true when 2+ essential markers are missing
}

/**
 * Takes the raw parsed blood test data (key-value map of marker name → value)
 * and returns a structured detection result.
 *
 * Typical usage after /api/ingest:
 *   const markerMap = Object.fromEntries(
 *     normalizedBiomarkers.map(b => [b.name, b.value])
 *   );
 *   const detection = detectMissingMarkers(markerMap);
 */
export function detectMissingMarkers(
  parsedMarkers: Record<string, number | string>,
): DetectionResult {
  const parsedKeys = Object.keys(parsedMarkers).map((k) => k.toLowerCase().trim());

  const detectedIds:         string[]              = [];
  const missingEssential:    BiomarkerDefinition[] = [];
  const missingRecommended:  BiomarkerDefinition[] = [];

  for (const marker of BIOMARKER_REGISTRY) {
    const found = marker.aliases.some((alias) => {
      const a = alias.toLowerCase();
      return parsedKeys.some((key) => key.includes(a) || a.includes(key));
    });

    if (found) {
      detectedIds.push(marker.id);
    } else {
      if (marker.tier === "essential")   missingEssential.push(marker);
      if (marker.tier === "recommended") missingRecommended.push(marker);
      // "advanced" markers intentionally omitted — too overwhelming in the modal
    }
  }

  // Group missing markers by category
  const missingByCategory: Partial<Record<BiomarkerCategory, BiomarkerDefinition[]>> = {};
  const allMissing = [...missingEssential, ...missingRecommended];
  for (const marker of allMissing) {
    if (!missingByCategory[marker.category]) missingByCategory[marker.category] = [];
    missingByCategory[marker.category]!.push(marker);
  }

  // Completeness score based on essential markers only
  const totalEssential = BIOMARKER_REGISTRY.filter((m) => m.tier === "essential").length;
  const foundEssential = totalEssential - missingEssential.length;
  const completenessScore = Math.round((foundEssential / totalEssential) * 100);

  return {
    isComplete:         missingEssential.length === 0,
    completenessScore,
    detectedMarkers:    detectedIds,
    missingEssential,
    missingRecommended,
    missingByCategory,
    shouldShowModal:    missingEssential.length >= 2,
  };
}
