/// lib/db/goal-payload.ts
// TypeScript types + Zod schemas for health goal prep pack protocol output.
// Mirrors lib/db/sports-payload.ts — "lifestyle" replaces "gear", "intervention" replaces "trainingGuidance".

import { z } from "zod";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const GoalPhaseSchema = z.object({
  phase:         z.string(),
  durationWeeks: z.number().int().positive(),
  phaseFocus:    z.string(),
  keyActions:    z.array(z.string()).min(1).max(6),
});

export const GoalRedFlagsSchema = z.object({
  contraindications: z.array(z.string()),
  doctorDiscussion:  z.array(z.string()),
  weeklyMonitoring:  z.array(z.string()),
});

export const GoalTierSupplementSchema = z.object({
  name:          z.string(),
  dose:          z.string(),
  timing:        z.string(),
  notes:         z.string(),
  purchaseUrl:   z.string().optional(),
  priceEstimate: z.string().optional(),
  priority:      z.enum(["essential", "high", "moderate"]).optional(),
});

export const GoalServiceSchema = z.object({
  name:       z.string(),
  rationale:  z.string().optional(),
  urgency:    z.enum(["high", "medium", "low"]).optional(),
  priceRange: z.string().optional(),
});

export const GoalTierPackSchema = z.object({
  tier:              z.number().int().min(1).max(4),
  supplements:       z.array(GoalTierSupplementSchema),
  testing:           z.array(z.string()),
  lifestyle:         z.array(z.string()),   // replaces "gear"
  services:          z.array(z.union([z.string(), GoalServiceSchema])),
  biggestROI:        z.array(z.string()).min(1).max(5),
  whatYouAreMissing: z.array(z.string()),
});

export const GoalSupplementScheduleItemSchema = z.object({
  name:     z.string(),
  dose:     z.string(),
  timing:   z.string(),
  withFood: z.boolean(),
  notes:    z.string(),
});

export const GoalTrackingMetricSchema = z.object({
  metric:           z.string(),
  goodTrend:        z.string(),
  concerningTrend:  z.string(),
  intervention:     z.string(),   // replaces "trainingGuidance"
});

export const GoalProtocolPayloadSchema = z.object({
  goalPhases:         z.array(GoalPhaseSchema).min(1),
  redFlags:           GoalRedFlagsSchema,
  tierPack:           GoalTierPackSchema,
  supplementSchedule: z.array(GoalSupplementScheduleItemSchema),
  trackingMetrics:    z.array(GoalTrackingMetricSchema).min(1).max(5),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type GoalPhase                = z.infer<typeof GoalPhaseSchema>;
export type GoalRedFlags             = z.infer<typeof GoalRedFlagsSchema>;
export type GoalTierSupplement       = z.infer<typeof GoalTierSupplementSchema>;
export type GoalService              = z.infer<typeof GoalServiceSchema>;
export type GoalTierPack             = z.infer<typeof GoalTierPackSchema>;
export type GoalSupplementItem       = z.infer<typeof GoalSupplementScheduleItemSchema>;
export type GoalTrackingMetric       = z.infer<typeof GoalTrackingMetricSchema>;
export type GoalProtocolPayload      = z.infer<typeof GoalProtocolPayloadSchema>;

// ── Category metadata ─────────────────────────────────────────────────────────

export const GOAL_CATEGORIES: Record<string, { label: string; icon: string; description: string }> = {
  weight_loss:   { label: "Weight Loss",          icon: "🔥", description: "Optimize body composition & fat metabolism" },
  anti_aging:    { label: "Looking Younger",       icon: "✨", description: "Slow biological aging & improve skin health" },
  performance:   { label: "Physical Performance",  icon: "💪", description: "Strength, endurance & peak athletic output" },
  cognition:     { label: "Sharper Thinking",      icon: "🧠", description: "Focus, memory & cognitive performance" },
  sleep:         { label: "Sleep",                 icon: "🌙", description: "Deep sleep quality & circadian rhythm" },
  hair:          { label: "Hair Loss",             icon: "💆", description: "Support follicle health & reduce shedding" },
  mood:          { label: "Mood",                  icon: "☀️", description: "Emotional wellbeing & stress resilience" },
  sexual_health: { label: "Sexual Health",         icon: "❤️", description: "Hormonal balance & vitality" },
};

// ── Form data ─────────────────────────────────────────────────────────────────

export interface GoalPrepFormData {
  category:           string;
  age:                number;
  gender:             string;
  knownConditions:    string[];
  medications:        string;
  stimulantTolerance: string;
  budgetValue:        number;
  budgetTier:         1 | 2 | 3 | 4;
  categoryData:       Record<string, unknown>;  // category-specific fields
}

// ── Budget tiers (same as sports) ─────────────────────────────────────────────

export const BUDGET_TIERS: { tier: 1|2|3|4; label: string; range: string; description: string; min: number; max: number }[] = [
  { tier: 1, label: "Core Essentials",   range: "$1–$250",        description: "Core supplements only — highest-impact essentials",  min: 1,    max: 250   },
  { tier: 2, label: "Optimized Stack",   range: "$251–$1,000",    description: "Optimized supplement stack + targeted testing",       min: 251,  max: 1000  },
  { tier: 3, label: "Advanced Prep",     range: "$1,001–$5,000",  description: "Advanced testing, lifestyle upgrades + services",     min: 1001, max: 5000  },
  { tier: 4, label: "White-Glove Elite", range: "$5,001–$20,000", description: "Full diagnostics, elite services, full protocol",     min: 5001, max: 20000 },
];

export function getBudgetTier(value: number): 1|2|3|4 {
  if (value <= 250)  return 1;
  if (value <= 1000) return 2;
  if (value <= 5000) return 3;
  return 4;
}
