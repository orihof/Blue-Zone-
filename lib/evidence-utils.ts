/// lib/evidence-utils.ts

export type EvidenceStrength = "strong" | "moderate" | "limited";

// ⚠️ CONSERVATIVE ESTIMATES — these RCT counts are approximate figures based on
// publicly available meta-analyses (Examine.com, ClinicalTrials.gov, PubMed).
// Replace with exact counts sourced from primary literature before launch.
export const FALLBACK_EVIDENCE: Record<string, { strength: EvidenceStrength; rctCount: number }> = {
  "vitd3k2":        { strength: "strong",   rctCount: 300 },
  "mag":            { strength: "strong",   rctCount: 150 },
  "omega3":         { strength: "strong",   rctCount: 200 },
  "creatine":       { strength: "strong",   rctCount: 247 },
  "glycine":        { strength: "moderate", rctCount: 43  },
  "coq10":          { strength: "moderate", rctCount: 60  },
  "ashwagandha":    { strength: "moderate", rctCount: 35  },
  "zinc":           { strength: "strong",   rctCount: 120 },
  "vitamin-b12":    { strength: "strong",   rctCount: 100 },
  "iron":           { strength: "strong",   rctCount: 180 },
  "probiotics":     { strength: "moderate", rctCount: 80  },
  "melatonin":      { strength: "strong",   rctCount: 90  },
  "l-theanine":     { strength: "moderate", rctCount: 25  },
  "berberine":      { strength: "moderate", rctCount: 50  },
};

export function getEvidenceStrength(rctCount: number): EvidenceStrength {
  if (rctCount >= 100) return "strong";
  if (rctCount >= 20)  return "moderate";
  return "limited";
}

export function resolveEvidence(
  productId: string,
  rctCount: number | undefined | null,
): { strength: EvidenceStrength; rctCount: number } {
  if (rctCount != null) {
    return { strength: getEvidenceStrength(rctCount), rctCount };
  }
  return FALLBACK_EVIDENCE[productId] ?? { strength: "limited", rctCount: 0 };
}
