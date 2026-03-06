/// lib/db/sports-payload.ts
// TypeScript types for sports event preparation protocol output.

import { z } from "zod";

// ── Zod schema (validates Claude JSON response) ──────────────────────────────

export const SportsTimelinePhaseSchema = z.object({
  phase:          z.string(),
  durationWeeks:  z.number().int().positive(),
  trainingFocus:  z.string(),
  keyActions:     z.array(z.string()).min(1).max(6),
});

export const SportsRedFlagsSchema = z.object({
  contraindications: z.array(z.string()),
  doctorDiscussion:  z.array(z.string()),
  weeklyMonitoring:  z.array(z.string()),
});

export const SportsTierSupplementSchema = z.object({
  name:          z.string(),
  dose:          z.string(),
  timing:        z.string(),
  notes:         z.string(),
  purchaseUrl:   z.string().optional(),
  priceEstimate: z.string().optional(),
  priority:      z.enum(["essential", "high", "moderate"]).optional(),
});

export const SportsServiceSchema = z.object({
  name:       z.string(),
  rationale:  z.string().optional(),
  urgency:    z.enum(["high", "medium", "low"]).optional(),
  priceRange: z.string().optional(),
  bookingUrl: z.string().optional(),
});

export const SportsTierPackSchema = z.object({
  tier:               z.number().int().min(1).max(4),
  supplements:        z.array(SportsTierSupplementSchema),
  testing:            z.array(z.string()),
  gear:               z.array(z.string()),
  // Accept both legacy strings and new rich objects (backward compat)
  services:           z.array(z.union([z.string(), SportsServiceSchema])),
  biggestROI:         z.array(z.string()).min(1).max(5),
  whatYouAreMissing:  z.array(z.string()),
});

export const SportsSupplementScheduleItemSchema = z.object({
  name:     z.string(),
  dose:     z.string(),
  timing:   z.string(),
  withFood: z.boolean(),
  notes:    z.string(),
});

export const SportsWearableMetricSchema = z.object({
  metric:           z.string(),
  goodTrend:        z.string(),
  concerningTrend:  z.string(),
  trainingGuidance: z.string(),
});

// ── New schemas for enriched output fields ───────────────────────────────────

export const SportsIntelligenceItemSchema = z.object({
  input:    z.string(),
  decision: z.string(),
  icon:     z.string(),
});

export const SportsBiomarkerDecisionSchema = z.object({
  biomarker:        z.string(),
  value:            z.string(),
  unit:             z.string().optional(),
  status:           z.enum(["normal", "flagged", "optimal"]).optional(),
  range:            z.string().optional(),
  protocolResponse: z.string(),
});

export const SportsProtocolPayloadSchema = z.object({
  periodizedTimeline:  z.array(SportsTimelinePhaseSchema).min(1),
  redFlags:            SportsRedFlagsSchema,
  tierPack:            SportsTierPackSchema,
  supplementSchedule:  z.array(SportsSupplementScheduleItemSchema),
  wearableMetrics:     z.array(SportsWearableMetricSchema).min(1).max(5),
  // Optional enriched fields (present on new protocols only)
  intelligenceItems:        z.array(SportsIntelligenceItemSchema).optional(),
  biomarkerDecisions:       z.array(SportsBiomarkerDecisionSchema).optional(),
  phaseTransitionSummary:   z.string().optional(),
  todayTrainingDirective:   z.string().optional(),
  tonightRecoveryDirective: z.string().optional(),
});

// ── TypeScript types ─────────────────────────────────────────────────────────

export type SportsTimelinePhase       = z.infer<typeof SportsTimelinePhaseSchema>;
export type SportsRedFlags            = z.infer<typeof SportsRedFlagsSchema>;
export type SportsTierSupplement      = z.infer<typeof SportsTierSupplementSchema>;
export type SportsService             = z.infer<typeof SportsServiceSchema>;
export type SportsTierPack            = z.infer<typeof SportsTierPackSchema>;
export type SportsSupplementItem      = z.infer<typeof SportsSupplementScheduleItemSchema>;
export type SportsWearableMetric      = z.infer<typeof SportsWearableMetricSchema>;
export type SportsIntelligenceItem    = z.infer<typeof SportsIntelligenceItemSchema>;
export type SportsBiomarkerDecision   = z.infer<typeof SportsBiomarkerDecisionSchema>;
export type SportsProtocolPayload     = z.infer<typeof SportsProtocolPayloadSchema>;

// ── Form data (collected across 4 steps) ────────────────────────────────────

export const RACE_DISTANCES = ["5k", "10k", "half_marathon", "marathon", "ultra_marathon"] as const;
export type RaceDistance = typeof RACE_DISTANCES[number];

export const RACE_DISTANCE_LABELS: Record<RaceDistance, string> = {
  "5k":            "5K",
  "10k":           "10K",
  "half_marathon": "Half Marathon",
  "marathon":      "Marathon",
  "ultra_marathon":"Ultra Marathon",
};

export interface SportsPrepFormData {
  competitionType:    string;
  eventDate:          string;        // ISO date string
  weeksToEvent:       number;
  priorityOutcome:    string;
  age:                number;
  gender:             string;
  experienceLevel:    string;
  currentInjuries:    string[];
  knownConditions:    string[];
  medications:        string;
  stimulantTolerance: string;
  budgetValue:        number;
  budgetTier:         1 | 2 | 3 | 4;
  raceDistance?:      string;        // only for competitionType === "running_race"
}

export const BUDGET_TIERS: { tier: 1|2|3|4; label: string; range: string; description: string; min: number; max: number }[] = [
  { tier: 1, label: "Core Essentials",    range: "$1–$250",       description: "Core supplements only — highest-impact essentials",            min: 1,    max: 250   },
  { tier: 2, label: "Optimized Stack",    range: "$251–$1,000",   description: "Optimized supplement stack + targeted testing",                min: 251,  max: 1000  },
  { tier: 3, label: "Advanced Prep",      range: "$1,001–$5,000", description: "Advanced testing, gear upgrades + coaching services",          min: 1001, max: 5000  },
  { tier: 4, label: "White-Glove Elite",  range: "$5,001–$20,000",description: "Full diagnostics, elite gear, expert services",               min: 5001, max: 20000 },
];

export function getBudgetTier(value: number): 1|2|3|4 {
  if (value <= 250)   return 1;
  if (value <= 1000)  return 2;
  if (value <= 5000)  return 3;
  return 4;
}
