/// lib/db/analysis-payload.ts
// Zod schemas + TypeScript types for biomarker analysis reports.

import { z } from "zod";

export const BiomarkerFindingSchema = z.object({
  marker:  z.string(),
  status:  z.enum(["optimal", "suboptimal", "concerning", "critical"]),
  value:   z.string(),
  insight: z.string(),
  action:  z.string(),
});

export const PriorityActionSchema = z.object({
  priority:  z.union([z.literal(1), z.literal(2), z.literal(3)]),
  action:    z.string(),
  rationale: z.string(),
  timeframe: z.string(),
});

export const AnalysisSupplementSchema = z.object({
  name:         z.string(),
  dose:         z.string(),
  timing:       z.string(),
  rationale:    z.string(),
  targetMarker: z.string(),
});

export const LifestyleInterventionSchema = z.object({
  intervention:  z.string(),
  impact:        z.string(),
  targetMarkers: z.array(z.string()),
});

export const RetestingItemSchema = z.object({
  marker:    z.string(),
  frequency: z.string(),
  rationale: z.string(),
});

export const BiomarkerReportPayloadSchema = z.object({
  summary:                   z.string(),
  scores: z.object({
    overall:        z.number().int().min(0).max(100),
    metabolic:      z.number().int().min(0).max(100),
    cardiovascular: z.number().int().min(0).max(100),
    hormonal:       z.number().int().min(0).max(100),
    recovery:       z.number().int().min(0).max(100),
  }),
  keyFindings:               z.array(BiomarkerFindingSchema).min(1),
  priorityActions:           z.array(PriorityActionSchema).min(1).max(5),
  supplementRecommendations: z.array(AnalysisSupplementSchema),
  lifestyleInterventions:    z.array(LifestyleInterventionSchema),
  retestingSchedule:         z.array(RetestingItemSchema),
  redFlags:                  z.array(z.string()),
});

export type BiomarkerFinding        = z.infer<typeof BiomarkerFindingSchema>;
export type PriorityAction          = z.infer<typeof PriorityActionSchema>;
export type AnalysisSupplement      = z.infer<typeof AnalysisSupplementSchema>;
export type LifestyleIntervention   = z.infer<typeof LifestyleInterventionSchema>;
export type RetestingItem           = z.infer<typeof RetestingItemSchema>;
export type BiomarkerReportPayload  = z.infer<typeof BiomarkerReportPayloadSchema>;
