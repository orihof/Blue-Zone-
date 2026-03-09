/// lib/training-phase-detector.ts
// Server-only — import only from API routes or server components.

import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS }   from "@/lib/db/schema";

// ─── Public types ──────────────────────────────────────────────────────────────

export type TrainingPhase =
  | "base" | "build" | "peak" | "taper" | "recovery" | "offseason";

export type TrainingPhaseDetection = {
  detected_phase: TrainingPhase;
  confidence:     number;       // 0.0 – 1.0
  signals_used:   string[];
  reasoning:      string;
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

function avg(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((v): v is number => typeof v === "number");
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function clamp01(n: number): number {
  return Math.min(1.0, Math.max(0.0, Math.round(n * 1000) / 1000));
}

// ─── 1. detectTrainingPhase ────────────────────────────────────────────────────

/**
 * Infers the user's current training phase from three signal sources in
 * decreasing priority:
 *   A. Wearable snapshots (last 14 days):
 *      - HRV-RMSSD trend + strain_score → build / peak / recovery / taper
 *      - readiness_score < 60 for 5+ consecutive days → recovery
 *   B. Manual override (user_health_context.training_phase, within 30 days)
 *   C. Calendar (sports_protocols.event_date within 14 days → taper / peak)
 *
 * Note: calendar signals use sports_protocols.event_date because
 *       training_partners has no scheduled-event date column.
 */
export async function detectTrainingPhase(userId: string): Promise<TrainingPhaseDetection> {
  const db      = getAdminClient();
  const today   = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let detectedPhase: TrainingPhase = "base";
  let confidence = 0.4;
  let reasoning  = "No strong signals detected; defaulting to base training phase.";
  const signals: string[] = [];

  // ── A. Wearable signals (last 14 days) ─────────────────────────────────────
  const cutoff14d = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: wRows } = await db
    .from(TABLES.WEARABLE_SNAPSHOTS)
    .select(`${COLS.HRV_RMSSD}, ${COLS.STRAIN_SCORE}, ${COLS.READINESS_SCORE}, ${COLS.DATE}`)
    .eq(COLS.USER_ID, userId)
    .gte(COLS.DATE, cutoff14d)
    .order(COLS.DATE, { ascending: true });

  type WRow = { hrv_rmssd: number | null; strain_score: number | null; readiness_score: number | null; date: string };
  const rows = (wRows ?? []) as WRow[];

  if (rows.length >= 3) {
    // HRV trend: compare first-half avg vs second-half avg
    const mid          = Math.floor(rows.length / 2);
    const earlierHrv   = avg(rows.slice(0, mid).map((r) => r.hrv_rmssd));
    const laterHrv     = avg(rows.slice(mid).map((r) => r.hrv_rmssd));
    const meanStrain   = avg(rows.map((r) => r.strain_score));

    // Consecutive low-readiness check
    let streak = 0;
    let maxStreak = 0;
    for (const row of rows) {
      if (row.readiness_score != null && row.readiness_score < 60) {
        streak++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }
    }

    if (maxStreak >= 5) {
      detectedPhase = "recovery";
      confidence    = 0.65;
      reasoning     = "Readiness score below 60 for 5+ consecutive days indicates accumulated fatigue.";
      signals.push("wearable_low_readiness_streak");
    } else if (earlierHrv != null && laterHrv != null && earlierHrv > 0) {
      const hrvTrend  = (laterHrv - earlierHrv) / earlierHrv;   // positive = rising
      const strainHigh = meanStrain != null && meanStrain > 14;  // 14 ≈ 67% of WHOOP 0–21 scale

      if (hrvTrend < -0.05 && strainHigh) {
        detectedPhase = "build";
        confidence    = 0.60;
        reasoning     = "HRV-RMSSD trending down with elevated strain indicates build or peak load accumulation.";
        signals.push("wearable_hrv_declining", "wearable_strain_high");
      } else if (hrvTrend < -0.05) {
        detectedPhase = "build";
        confidence    = 0.50;
        reasoning     = "HRV-RMSSD trending down indicates increasing training load.";
        signals.push("wearable_hrv_declining");
      } else if (hrvTrend > 0.05) {
        const strainLow = meanStrain != null && meanStrain < 10;
        detectedPhase   = strainLow ? "taper" : "recovery";
        confidence      = 0.55;
        reasoning       = strainLow
          ? "HRV-RMSSD rising with low strain suggests taper or planned recovery week."
          : "HRV-RMSSD rising with moderate strain indicates recovery phase.";
        signals.push("wearable_hrv_rising");
        if (strainLow) signals.push("wearable_strain_low");
      }
    }
  }

  // ── B. Manual override (user_health_context.training_phase) ────────────────
  const { data: ctx } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("training_phase, training_phase_updated_at")
    .eq(COLS.USER_ID, userId)
    .maybeSingle();

  if (ctx?.training_phase) {
    const updatedAt    = ctx.training_phase_updated_at ? new Date(ctx.training_phase_updated_at as string) : null;
    const daysSinceUpdate = updatedAt
      ? (today.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      : Infinity;

    if (daysSinceUpdate <= 30) {
      detectedPhase = ctx.training_phase as TrainingPhase;
      confidence    = clamp01(confidence + 0.3);
      reasoning     = `Manual training phase override set ${Math.round(daysSinceUpdate)} day(s) ago.`;
      signals.push("manual_training_phase_override");
    }
  }

  // ── C. Calendar signals (sports_protocols.event_date within 14 days) ───────
  const in14dStr = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: upcomingEvent } = await db
    .from(TABLES.SPORTS_PROTOCOLS)
    .select(COLS.EVENT_DATE)
    .eq(COLS.USER_ID, userId)
    .gte(COLS.EVENT_DATE, todayStr)
    .lte(COLS.EVENT_DATE, in14dStr)
    .order(COLS.EVENT_DATE, { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcomingEvent?.event_date) {
    const eventDate  = new Date(upcomingEvent.event_date as string);
    const daysToEvent = Math.ceil(
      (eventDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysToEvent <= 3) {
      detectedPhase = "peak";
      confidence    = clamp01(confidence + 0.3);
      reasoning     = `Race/event in ${daysToEvent} day(s) — peak performance phase.`;
      signals.push("calendar_event_imminent");
    } else {
      detectedPhase = "taper";
      confidence    = clamp01(confidence + 0.2);
      reasoning     = `Race/event in ${daysToEvent} days — taper phase indicated.`;
      signals.push("calendar_event_approaching");
    }
  }

  return {
    detected_phase: detectedPhase,
    confidence,
    signals_used:   signals.length > 0 ? signals : ["default_base_phase"],
    reasoning,
  };
}

// ─── 2. savePhaseDetection ────────────────────────────────────────────────────

/**
 * Persists a detection result:
 *   1. Inserts a row into training_phase_detections.
 *   2. Updates user_health_context with auto_detected_training_phase,
 *      auto_phase_confidence, and auto_phase_computed_at.
 */
export async function savePhaseDetection(
  userId:    string,
  detection: TrainingPhaseDetection,
): Promise<void> {
  const db = getAdminClient();

  // 1. Insert detection record
  const { error: insertErr } = await db
    .from(TABLES.TRAINING_PHASE_DETECTIONS)
    .insert({
      user_id:           userId,
      detected_phase:    detection.detected_phase,
      confidence:        detection.confidence,
      detection_signals: {
        signals_used: detection.signals_used,
        reasoning:    detection.reasoning,
      },
    });

  if (insertErr) {
    throw new Error(`[training-phase-detector] insert failed: ${insertErr.message}`);
  }

  // 2. Update user_health_context auto-detection columns
  const { error: updateErr } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .update({
      auto_detected_training_phase: detection.detected_phase,
      auto_phase_confidence:        detection.confidence,
      auto_phase_computed_at:       new Date().toISOString(),
    })
    .eq(COLS.USER_ID, userId);

  if (updateErr) {
    throw new Error(`[training-phase-detector] context update failed: ${updateErr.message}`);
  }
}

// ─── 3. getEffectiveTrainingPhase ─────────────────────────────────────────────

/**
 * Returns the phase to use for AI context and protocol generation:
 *   1. Manual training_phase (if set) — strongest signal.
 *   2. auto_detected_training_phase — from last detection run.
 *   3. 'base' — safe fallback.
 */
export async function getEffectiveTrainingPhase(userId: string): Promise<string> {
  const db = getAdminClient();

  const { data } = await db
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("training_phase, auto_detected_training_phase")
    .eq(COLS.USER_ID, userId)
    .maybeSingle();

  if (data?.training_phase) return data.training_phase as string;
  if (data?.auto_detected_training_phase) return data.auto_detected_training_phase as string;
  return "base";
}

// ─── 4. getPhaseNarrativeContext ──────────────────────────────────────────────

/**
 * Returns a single-sentence AI prompt context string for the given phase.
 * Unknown phases fall back to the 'base' narrative.
 */
export function getPhaseNarrativeContext(phase: string, confidence: number): string {
  const pct = Math.round(confidence * 100);

  const narratives: Record<string, string> = {
    base:      `User is in base training phase (confidence: ${pct}%) — prioritize aerobic foundation supplements.`,
    build:     `User is in build phase (confidence: ${pct}%) — recovery and adaptation supplements prioritized.`,
    peak:      `User is in peak phase (confidence: ${pct}%) — performance optimization, minimize new supplements.`,
    taper:     `User is in taper phase (confidence: ${pct}%) — reduce stimulants, maintain key micronutrients.`,
    recovery:  `User is in recovery phase (confidence: ${pct}%) — anti-inflammatory and sleep supplements prioritized.`,
    offseason: `User is in offseason (confidence: ${pct}%) — baseline health optimization, full supplement review.`,
  };

  return narratives[phase] ?? narratives.base;
}
