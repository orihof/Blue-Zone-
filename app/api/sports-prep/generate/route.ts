/// app/api/sports-prep/generate/route.ts
// Awaits Claude generation synchronously (maxDuration = 120s).
// Returns sportsPrepId with status already "ready" or "failed".
// Client polls /api/sports-prep/status/[id] — first poll resolves immediately.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateSportsProtocol } from "@/lib/ai/generateSportsProtocol";
import { type SportsPrepFormData } from "@/lib/db/sports-payload";
import { isProtocolGated, getActiveCriticalEvents } from "@/lib/critical-values";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent } from "@/middleware/requireConsent";
import type { UserHealthContextRow } from "@/lib/types/health";
import {
  getPregnancyRulesForProduct,
  applyPregnancyGate,
  getPregnancyContextForNarrative,
  getMandatoryPregnancyDisclaimer,
} from "@/lib/pregnancy-safety";
import {
  getNutrientPairsForProtocol,
  applyCompetitionRules,
  generateTimingSchedule,
  getCompetitionNarrativeContext,
  type ProtocolProduct,
  type CompetitionResult,
  type TimingSlot,
} from "@/lib/nutrient-competition";
import {
  getEffectiveTrainingPhase,
  getPhaseNarrativeContext,
} from "@/lib/training-phase-detector";

export const runtime     = "nodejs";
export const maxDuration = 120; // allow up to 2 min for Claude generation

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body: SportsPrepFormData | null = await req.json().catch(() => null);

  if (
    !body ||
    !body.competitionType ||
    !body.eventDate ||
    !body.priorityOutcome ||
    !body.gender ||
    !body.experienceLevel ||
    !body.stimulantTolerance ||
    typeof body.age !== "number" || body.age < 10 || body.age > 100 ||
    typeof body.weeksToEvent !== "number" || body.weeksToEvent < 1 ||
    typeof body.budgetValue !== "number" || body.budgetValue < 1
  ) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // ── Protocol gate check ────────────────────────────────────────────────────
  const { data: userCtx } = await supabase
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("protocol_gated_reason, protocol_gated_at, protocol_gate_acknowledged, pregnancy_status")
    .eq(COLS.USER_ID, userId)
    .maybeSingle();

  if (userCtx && isProtocolGated(userCtx as UserHealthContextRow)) {
    return NextResponse.json({
      gated:             true,
      gate_reason:       userCtx.protocol_gated_reason,
      gate_activated_at: userCtx.protocol_gated_at,
      recommendations:   [],
      critical_events:   await getActiveCriticalEvents(userId),
    }, { status: 403 });
  }
  // ── End gate check ─────────────────────────────────────────────────────────

  // ── Pregnancy safety context ──────────────────────────────────────────────
  const pregnancyStatus     = (userCtx as { pregnancy_status?: string | null } | null)?.pregnancy_status ?? "not_pregnant";
  const pregnancyContext    = getPregnancyContextForNarrative(pregnancyStatus);
  const pregnancyDisclaimer = getMandatoryPregnancyDisclaimer(pregnancyStatus);
  // ── End pregnancy safety context ─────────────────────────────────────────

  // ── 1. Create pending record ──────────────────────────────────────────────────
  const { data: record, error: insertErr } = await supabase
    .from(TABLES.SPORTS_PROTOCOLS)
    .insert({
      [COLS.USER_ID]:             userId,
      [COLS.COMPETITION_TYPE]:    body.competitionType,
      [COLS.EVENT_DATE]:          body.eventDate,
      [COLS.WEEKS_TO_EVENT]:      body.weeksToEvent,
      [COLS.PRIORITY_OUTCOME]:    body.priorityOutcome,
      [COLS.AGE]:                 body.age,
      [COLS.GENDER]:              body.gender,
      [COLS.EXPERIENCE_LEVEL]:    body.experienceLevel,
      [COLS.CURRENT_INJURIES]:    body.currentInjuries ?? [],
      [COLS.KNOWN_CONDITIONS]:    body.knownConditions ?? [],
      [COLS.MEDICATIONS]:         body.medications ?? "",
      [COLS.STIMULANT_TOLERANCE]: body.stimulantTolerance,
      [COLS.BUDGET_VALUE]:        body.budgetValue,
      [COLS.BUDGET_TIER]:         body.budgetTier,
      [COLS.RACE_DISTANCE]:       body.competitionType === "running_race" ? (body.raceDistance ?? null) : null,
      [COLS.STATUS]:              "processing",
    })
    .select(COLS.ID)
    .maybeSingle();

  if (insertErr || !record) {
    console.error("[sports-prep/generate] DB insert error:", insertErr?.message);
    return NextResponse.json({ error: "Failed to create protocol record" }, { status: 500 });
  }

  const sportsPrepId = record.id as string;

  let competitionResults: CompetitionResult[] = [];
  let timingSchedule:     TimingSlot[]        = [];
  let criticalConflicts:  CompetitionResult[] = [];
  let effectivePhase  = "base";
  let phaseConfidence = 0.5;

  // ── 2. Fetch health data + call Claude (awaited — serverless can't run fire-and-forget) ──
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // Typed shape for wearable snapshot rows (legacy + Terra columns)
    type WearableRow = {
      source?: string | null; date?: string | null; recorded_at?: string | null;
      hrv?: number | null; resting_hr?: number | null; sleep_score?: number | null;
      recovery_score?: number | null; readiness_score?: number | null; strain_score?: number | null;
      heart_rate_resting?: number | null; heart_rate_avg?: number | null; heart_rate_max?: number | null;
      hrv_rmssd?: number | null; sleep_total_minutes?: number | null; sleep_rem_minutes?: number | null;
      sleep_deep_minutes?: number | null; sleep_light_minutes?: number | null;
      steps?: number | null; active_calories?: number | null;
      vo2_max?: number | null; stress_score?: number | null; spo2?: number | null;
    };

    const [biomarkersRes, wearableRes] = await Promise.all([
      supabase
        .from(TABLES.BIOMARKERS)
        .select("name, value, unit, status, reference_min, reference_max")
        .eq(COLS.USER_ID, userId)
        .order(COLS.CREATED_AT, { ascending: false })
        .limit(30),
      supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .select("*")
        .eq(COLS.USER_ID, userId)
        .gte(COLS.CREATED_AT, sevenDaysAgo)
        .order(COLS.CREATED_AT, { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    let bloodTestSummary: string | undefined;
    if (biomarkersRes.data?.length) {
      bloodTestSummary = biomarkersRes.data.map((b) => {
        const ref = b.reference_min != null && b.reference_max != null
          ? ` (ref ${b.reference_min}–${b.reference_max} ${b.unit ?? ""})`
          : "";
        return `${b.name}: ${b.value} ${b.unit ?? ""}${ref} [${b.status}]`;
      }).join("\n");
    }

    let wearableSummary: string | undefined;
    const ws = wearableRes.data as WearableRow | null;
    if (ws) {
      // Prefer Terra-specific columns, fall back to legacy column names.
      const restingHr  = ws.heart_rate_resting ?? ws.resting_hr;
      const hrvRmssd   = ws.hrv_rmssd          ?? ws.hrv;
      const sleepTotal = ws.sleep_total_minutes;
      const sleepRem   = ws.sleep_rem_minutes;
      const sleepDeep  = ws.sleep_deep_minutes;
      const syncDate   = ws.recorded_at         ?? ws.date;

      const sleepStr = sleepTotal != null
        ? `${Math.floor(sleepTotal / 60)}h ${sleepTotal % 60}m`
        : null;

      wearableSummary = [
        `WEARABLE DATA (${ws.source ?? "wearable"} — last synced ${syncDate}):`,
        restingHr          != null ? `- Resting HR: ${restingHr} bpm`                                              : "",
        ws.heart_rate_avg  != null ? `- Avg HR: ${ws.heart_rate_avg} bpm`                                         : "",
        ws.heart_rate_max  != null ? `- Max HR: ${ws.heart_rate_max} bpm`                                         : "",
        hrvRmssd           != null ? `- HRV (RMSSD): ${hrvRmssd} ms`                                              : "",
        sleepStr                   ? `- Sleep: ${sleepStr}${sleepRem != null ? ` (REM: ${sleepRem}min, Deep: ${sleepDeep ?? "N/A"}min)` : ""}` : "",
        ws.sleep_score     != null ? `- Sleep score: ${ws.sleep_score}/100`                                        : "",
        ws.steps           != null ? `- Daily steps: ${ws.steps.toLocaleString()}`                                 : "",
        ws.active_calories != null ? `- Active calories: ${ws.active_calories}`                                    : "",
        ws.vo2_max         != null ? `- VO2 max: ${ws.vo2_max} ml/kg/min`                                         : "",
        ws.stress_score    != null ? `- Stress score: ${ws.stress_score}/100`                                      : "",
        ws.spo2            != null ? `- SpO2: ${ws.spo2}%`                                                        : "",
        ws.recovery_score  != null ? `- Recovery: ${ws.recovery_score}/100`                                       : "",
        ws.readiness_score != null ? `- Readiness: ${ws.readiness_score}/100`                                      : "",
        "",
        "Use this wearable data to personalise recovery recommendations.",
        "Flag HRV (RMSSD) below 40 ms as a red flag requiring modified training load.",
        "Calibrate training intensity in the periodized timeline based on recovery and readiness scores.",
      ].filter(Boolean).join("\n");
    }

    const bloodTestFinal = [
      bloodTestSummary,
      pregnancyContext ? `PREGNANCY SAFETY CONTEXT: ${pregnancyContext}` : undefined,
    ].filter((x): x is string => !!x).join("\n\n") || undefined;

    const payload = await generateSportsProtocol({ ...body, bloodTestSummary: bloodTestFinal, wearableSummary });

    // ── Pregnancy supplement filter ───────────────────────────────────────────
    if (pregnancyStatus !== "not_pregnant") {
      const schedule = (payload as Record<string, unknown>).supplementSchedule;
      if (Array.isArray(schedule)) {
        const filtered = (await Promise.all(
          (schedule as Array<Record<string, unknown>>).map(async (item) => {
            const category = String(item.supplement ?? "");
            const doseMg   = typeof item.dose_mg === "number" ? item.dose_mg : 0;
            const rules    = await getPregnancyRulesForProduct(category, pregnancyStatus);
            const gate     = applyPregnancyGate(category, rules, doseMg);
            if (gate.blocked) return null;
            if (gate.action === "dose_limit" && gate.dose_limit !== undefined) {
              return { ...item, dose_mg: gate.dose_limit };
            }
            return item;
          }),
        )).filter((x): x is Record<string, unknown> => x !== null);
        (payload as Record<string, unknown>).supplementSchedule = filtered;
      }
      if (pregnancyDisclaimer) {
        (payload as Record<string, unknown>).pregnancy_disclaimer = pregnancyDisclaimer;
      }
    }
    // ── End pregnancy supplement filter ──────────────────────────────────────

    // ── Nutrient competition layer ─────────────────────────────────────────────
    const payloadObj  = payload as Record<string, unknown>;
    const scheduleArr = Array.isArray(payloadObj.supplementSchedule)
      ? (payloadObj.supplementSchedule as Array<Record<string, unknown>>)
      : [];
    const protocolProducts: ProtocolProduct[] = scheduleArr
      .map((item) => ({
        supplement: String(item.supplement ?? item.name ?? ""),
        dose_mg:    typeof item.dose_mg === "number" ? item.dose_mg : undefined,
      }))
      .filter((p) => !!p.supplement);
    const competitionRules = await getNutrientPairsForProtocol(
      protocolProducts.map((p) => p.supplement),
    );
    competitionResults = applyCompetitionRules(competitionRules, protocolProducts);
    timingSchedule     = generateTimingSchedule(competitionResults, protocolProducts);
    criticalConflicts  = competitionResults.filter((r) => r.clinical_significance === "critical");
    payloadObj.competition_narrative = getCompetitionNarrativeContext(competitionResults);
    payloadObj.competition_conflicts = competitionResults;
    payloadObj.timing_schedule       = timingSchedule;
    const synergyNotes = competitionResults
      .filter((r) => r.action === "suggest_addition")
      .map((r) => `Consider recommending ${r.nutrient_b} — user is taking ${r.nutrient_a} which creates a synergy dependency.`);
    if (synergyNotes.length > 0) {
      payloadObj.synergy_suggestions = synergyNotes;
    }
    // ── End nutrient competition layer ────────────────────────────────────────

    // ── Training phase context ─────────────────────────────────────────────────
    const [phase, phaseConfRes] = await Promise.all([
      getEffectiveTrainingPhase(userId),
      supabase
        .from(TABLES.USER_HEALTH_CONTEXT)
        .select("auto_phase_confidence")
        .eq(COLS.USER_ID, userId)
        .maybeSingle(),
    ]);
    effectivePhase  = phase;
    phaseConfidence = (phaseConfRes.data as { auto_phase_confidence: number | null } | null)
      ?.auto_phase_confidence ?? 0.5;
    const phaseNarrative = getPhaseNarrativeContext(effectivePhase, phaseConfidence);
    payloadObj.training_phase_context = phaseNarrative;
    if (effectivePhase === "peak") {
      payloadObj.peak_phase_note =
        "User is in peak phase — do not introduce new supplements. Optimize timing and dosing of existing protocol only.";
    }
    // ── End training phase context ─────────────────────────────────────────────

    await supabase
      .from(TABLES.SPORTS_PROTOCOLS)
      .update({
        [COLS.STATUS]:                "ready",
        [COLS.PAYLOAD]:               payload,
        [COLS.PROTOCOL_GENERATED_AT]: new Date().toISOString(),
      })
      .eq(COLS.ID, sportsPrepId);

    console.log("[analytics] sports_prep_saved", { userId, sportsPrepId, tier: body.budgetTier });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sports-prep/generate] generation error:", msg);
    await supabase
      .from(TABLES.SPORTS_PROTOCOLS)
      .update({ [COLS.STATUS]: "failed", [COLS.ERROR_MESSAGE]: msg })
      .eq(COLS.ID, sportsPrepId);
  }

  // ── 3. Return sportsPrepId — status is now "ready" or "failed" in DB ──────────
  return NextResponse.json({
    sportsPrepId,
    competition_conflicts: competitionResults,
    timing_schedule:       timingSchedule,
    critical_conflicts:    criticalConflicts,
    training_phase:        effectivePhase,
    phase_confidence:      phaseConfidence,
    ...(pregnancyDisclaimer ? { pregnancy_disclaimer: pregnancyDisclaimer } : {}),
  });
});
