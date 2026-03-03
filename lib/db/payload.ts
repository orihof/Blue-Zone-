/// lib/db/payload.ts
import { z } from "zod";

export const RecItemSchema = z.object({
  id: z.string(),
  category: z.enum(["supplement", "nutrition", "home"]),
  title: z.string(),
  rationaleBullets: z.array(z.string()).min(2).max(3),
  howToUse: z.string(),
  whatToTrack: z.array(z.string()),
  whenToAvoid: z.array(z.string()),
  tags: z.array(z.string()),
  links: z.object({
    iherb: z.string().nullable(),
    amazon: z.string().nullable(),
  }),
});

export const ClinicItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  specialty: z.array(z.string()),
  whyRelevant: z.array(z.string()),
  website: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  placeId: z.string().nullable(),
});

export const ProtocolPayloadSchema = z.object({
  scores: z.object({
    biologicalAgeEstimate: z.number().nullable(),
    confidence: z.number().min(0).max(1),
    recovery: z.number().min(0).max(100),
    sleep: z.number().min(0).max(100),
    metabolic: z.number().min(0).max(100),
    readiness: z.number().min(0).max(100),
  }),
  biologicalAgeNarrative: z
    .object({
      deltaFromChronological: z.number(),
      headline: z.string(),
      topDraggingUp: z.array(z.string()),
      topPullingDown: z.array(z.string()),
      sixMonthProjection: z.string(),
    })
    .nullable(),
  timeline: z.array(
    z.object({
      week: z.number(),
      focus: z.string(),
      expectedWins: z.array(z.string()),
    })
  ),
  recommendations: z.object({
    supplements: z.array(RecItemSchema),
    nutrition: z.array(RecItemSchema),
    home: z.array(RecItemSchema),
    clinics: z.array(ClinicItemSchema),
  }),
  stackSafetyNotes: z.array(z.string()),
  habits: z.object({
    dailyChecklist: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        frequency: z.enum(["daily", "weekly"]),
        timeOfDay: z.enum(["am", "pm"]).nullable(),
      })
    ),
    weeklyCheckInQuestions: z.array(z.string()),
  }),
  explainability: z.object({
    keyDrivers: z.array(
      z.object({
        title: z.string(),
        evidence: z.array(z.string()),
        sourcedFrom: z.enum(["wearable", "labs", "questionnaire", "upload"]),
      })
    ),
  }),
  safety: z.object({
    disclaimers: z.array(z.string()),
    redFlags: z.array(z.string()),
    generalContraindications: z.array(z.string()),
  }),
});

export type RecItem = z.infer<typeof RecItemSchema>;
export type ClinicItem = z.infer<typeof ClinicItemSchema>;
export type ProtocolPayload = z.infer<typeof ProtocolPayloadSchema>;
