/// lib/types/health.ts
import { z } from "zod";

// ============================================================
// NORMALIZED BIOMARKERS  (output of OCR + lab parser)
// ============================================================

export const BiomarkerStatusSchema = z.enum(["low", "normal", "high", "optimal", "critical"]);

export const NormalizedBiomarkersSchema = z.object({
  biomarkerId: z.string(),       // generated UUID
  name: z.string(),              // e.g. "Vitamin D", "TSH", "CRP"
  value: z.number(),
  unit: z.string(),
  referenceRange: z.object({
    low: z.number().nullable(),
    high: z.number().nullable(),
  }),
  status: BiomarkerStatusSchema,
  source: z.string(),            // 'lab' | 'blood_test' | 'dexa'
  date: z.string(),              // ISO date string YYYY-MM-DD
});

export type NormalizedBiomarkers = z.infer<typeof NormalizedBiomarkersSchema>;

// ============================================================
// NORMALIZED WEARABLE DATA  (daily snapshot from any device)
// ============================================================

export const NormalizedWearableDataSchema = z.object({
  hrv: z.number(),               // RMSSD in ms
  restingHR: z.number(),         // bpm
  sleepScore: z.number(),        // 0–100
  deepSleepMinutes: z.number(),
  remSleepMinutes: z.number(),
  recoveryScore: z.number(),     // 0–100
  strainScore: z.number(),       // 0–100 normalized (WHOOP raw is 0–21)
  readinessScore: z.number(),    // 0–100
  steps: z.number(),
  activeCalories: z.number(),
  date: z.string(),              // YYYY-MM-DD
  source: z.string(),            // 'whoop'|'oura'|'garmin'|'apple_health'
});

export type NormalizedWearableData = z.infer<typeof NormalizedWearableDataSchema>;

// ============================================================
// USER PROFILE  (from session + protocol settings)
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  chronologicalAge: number;
  targetAge: number;
  goals: string[];
  budget: "low" | "medium" | "high";
  preferences: {
    vegan?: boolean;
    caffeineFree?: boolean;
    noFishOil?: boolean;
    [key: string]: unknown;
  };
  plan: "free" | "pro" | "clinic";
}

// ============================================================
// PROTOCOL OUTPUT  (Claude's analysis result — new schema)
// ============================================================

export const RecommendationActionSchema = z.enum([
  "supplement",
  "lifestyle",
  "diagnostic",
  "nutrition",
]);

export const PillarStatusSchema = z.enum([
  "critical",
  "suboptimal",
  "good",
  "optimal",
]);

export const PillarRecommendationSchema = z.object({
  title: z.string(),
  explanation: z.string(),            // must cite specific biomarker/metric
  biomarkerLinks: z.array(z.string()), // e.g. ["HRV: 42ms (low)", "CRP: 3.2 mg/L (elevated)"]
  actionType: RecommendationActionSchema,
  priority: z.enum(["high", "medium", "low"]),
  productQuery: z.string().optional(), // iHerb/Amazon search query for supplements
});

export const ProtocolPillarSchema = z.object({
  name: z.string(),
  status: PillarStatusSchema,
  insight: z.string(),                // data-driven, cites specific metric
  recommendations: z.array(PillarRecommendationSchema),
});

export const ProtocolOutputSchema = z.object({
  summary: z.string(),               // 2–3 sentence personalized summary
  priorityScore: z.number().min(0).max(100),
  pillars: z.array(ProtocolPillarSchema),
});

export type PillarRecommendation = z.infer<typeof PillarRecommendationSchema>;
export type ProtocolPillar = z.infer<typeof ProtocolPillarSchema>;
export type ProtocolOutput = z.infer<typeof ProtocolOutputSchema>;

// ============================================================
// PRODUCT CATALOG  (iHerb / Amazon search result)
// ============================================================

export interface CatalogProduct {
  id: string;
  title: string;
  brand: string;
  price: string;          // formatted, e.g. "$24.99"
  imageUrl: string;
  affiliateUrl: string;
  source: "iherb" | "amazon";
}

// ============================================================
// INGEST API SHAPES
// ============================================================

export interface IngestResult {
  uploadId: string;
  normalizedBiomarkers: NormalizedBiomarkers[];
  normalizedWearable?: NormalizedWearableData;
  warnings: string[];
}
