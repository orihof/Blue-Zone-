/// app/api/protocol/generate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateProtocol } from "@/lib/ai/generateProtocol";
import { checkRateLimit } from "@/lib/rate-limit";
import type { NormalizedBiomarkers, NormalizedWearableData, UserProfile, UserHealthContextRow } from "@/lib/types/health";
import { isProtocolGated, getActiveCriticalEvents } from "@/lib/critical-values";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent } from "@/middleware/requireConsent";
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
import { getSuppressedProductIds } from "@/lib/adverse-events";
import {
  getBaselineContext,
  getBaselineNarrativeContext,
  type BaselineContext,
} from "@/lib/personal-baselines";
import {
  getEffectiveTrainingPhase,
  getPhaseNarrativeContext,
} from "@/lib/training-phase-detector";
import {
  generateOutcomeSummary,
  getOutcomeNarrativeContext,
  type OutcomeSummary,
} from "@/lib/outcome-tracker";

export const runtime = "nodejs";
export const maxDuration = 120;

// ----------------------------------------------------------------
// POST /api/protocol/generate
// Body: {
//   uploadId?: string          — from /api/ingest
//   age: number                — chronological age
//   targetAge: number          — goal biological age
//   goals: string[]
//   budget: "low"|"medium"|"high"
//   preferences?: Record<string,unknown>
// }
// ----------------------------------------------------------------

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate-limit: free tier → 3 AI generations per month
  const plan = session.user.plan ?? "free";
  if (plan === "free") {
    const rl = checkRateLimit(`protocol-gen:${session.user.id}`, 3, 30 * 24 * 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached. Upgrade to Pro for unlimited protocol generation." },
        { status: 429 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const { uploadId, age, targetAge, goals, budget, preferences } = body ?? {};

  if (
    typeof age !== "number" || age < 18 ||
    typeof targetAge !== "number" || targetAge < 18 ||
    !Array.isArray(goals) || goals.length === 0 ||
    !["low", "medium", "high"].includes(budget)
  ) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // ── Protocol gate check ────────────────────────────────────────────────────
  const { data: userCtx } = await supabase
    .from(TABLES.USER_HEALTH_CONTEXT)
    .select("protocol_gated_reason, protocol_gated_at, protocol_gate_acknowledged, pregnancy_status")
    .eq(COLS.USER_ID, session.user.id)
    .maybeSingle();

  if (userCtx && isProtocolGated(userCtx as UserHealthContextRow)) {
    return NextResponse.json({
      gated:             true,
      gate_reason:       userCtx.protocol_gated_reason,
      gate_activated_at: userCtx.protocol_gated_at,
      recommendations:   [],
      critical_events:   await getActiveCriticalEvents(session.user.id),
    }, { status: 403 });
  }
  // ── End gate check ─────────────────────────────────────────────────────────

  // ── Pregnancy safety context ──────────────────────────────────────────────
  const pregnancyStatus     = (userCtx as { pregnancy_status?: string | null } | null)?.pregnancy_status ?? "not_pregnant";
  const pregnancyContext    = getPregnancyContextForNarrative(pregnancyStatus);
  const pregnancyDisclaimer = getMandatoryPregnancyDisclaimer(pregnancyStatus);
  // ── End pregnancy safety context ─────────────────────────────────────────

  // ── Fetch user health profile (medications + conditions) ──────────────────
  const { data: profileRow } = await supabase
    .from(TABLES.PROFILES)
    .select(`${COLS.MEDICATIONS}, ${COLS.CONDITIONS}`)
    .eq(COLS.ID, session.user.id)
    .maybeSingle();
  const profileMedications  = (profileRow?.medications  as string[] | null) ?? [];
  const profileConditions   = (profileRow?.conditions   as string[] | null) ?? [];
  // ── End health profile ───────────────────────────────────────────────────

  // ----------------------------------------------------------------
  // Fetch biomarkers + wearable data linked to the uploadId (if any)
  // ----------------------------------------------------------------

  let biomarkers: NormalizedBiomarkers[] = [];
  let wearable: NormalizedWearableData | undefined;

  if (uploadId) {
    // Verify upload belongs to this user
    const { data: upload } = await supabase
      .from(TABLES.HEALTH_UPLOADS)
      .select(COLS.ID)
      .eq(COLS.ID, uploadId)
      .eq(COLS.USER_ID, session.user.id)
      .maybeSingle();

    if (upload) {
      // Biomarkers
      const { data: bms } = await supabase
        .from(TABLES.BIOMARKERS)
        .select("id, name, value, unit, reference_min, reference_max, status, source, date")
        .eq("upload_id", uploadId);

      if (bms?.length) {
        biomarkers = bms.map((b) => ({
          biomarkerId: b.id as string,
          name:        b.name as string,
          value:       Number(b.value),
          unit:        b.unit as string,
          referenceRange: {
            low:  b.reference_min != null ? Number(b.reference_min) : null,
            high: b.reference_max != null ? Number(b.reference_max) : null,
          },
          status: b.status as NormalizedBiomarkers["status"],
          source: (b.source as string) ?? "lab",
          date:   (b.date as string) ?? new Date().toISOString().slice(0, 10),
        }));
      }

      // Most recent wearable snapshot for this upload
      const { data: ws } = await supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .select("*")
        .eq("upload_id", uploadId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ws) {
        wearable = {
          hrv:              Number(ws.hrv   ?? 0),
          restingHR:        Number(ws.resting_hr   ?? 0),
          sleepScore:       Number(ws.sleep_score   ?? 0),
          deepSleepMinutes: Number(ws.deep_sleep_min ?? 0),
          remSleepMinutes:  Number(ws.rem_sleep_min  ?? 0),
          recoveryScore:    Number(ws.recovery_score  ?? 0),
          strainScore:      Number(ws.strain_score    ?? 0),
          readinessScore:   Number(ws.readiness_score ?? 0),
          steps:            Number(ws.steps           ?? 0),
          activeCalories:   Number(ws.active_calories ?? 0),
          date:             String(ws.date),
          source:           String(ws.source),
        };
      }
    }
  }

  // ----------------------------------------------------------------
  // Build UserProfile
  // ----------------------------------------------------------------

  const userProfile: UserProfile = {
    id:                session.user.id,
    email:             session.user.email ?? "",
    chronologicalAge:  Number(age),
    targetAge:         Number(targetAge),
    goals:             goals as string[],
    budget:            budget as "low" | "medium" | "high",
    preferences:       {
      ...(preferences ?? {}),
      ...(pregnancyContext ? { pregnancyContext } : {}),
      ...(profileMedications.length  > 0 ? { medications:       profileMedications  } : {}),
      ...(profileConditions.length   > 0 ? { healthConditions:  profileConditions   } : {}),
    },
    plan:              (plan as "free" | "pro" | "clinic"),
  };

  // ----------------------------------------------------------------
  // Generate protocol via Claude
  // ----------------------------------------------------------------

  let result: Awaited<ReturnType<typeof generateProtocol>>;
  try {
    result = await generateProtocol({ biomarkers, wearable, userProfile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[protocol/generate]", msg);
    return NextResponse.json({ error: "Protocol generation failed. Please try again." }, { status: 500 });
  }

  // ── Pregnancy supplement filter ───────────────────────────────────────────
  if (pregnancyStatus !== "not_pregnant") {
    const output = result.output as unknown as Record<string, unknown>;
    const schedule = output.supplementSchedule;
    if (Array.isArray(schedule)) {
      const filtered = (await Promise.all(
        (schedule as Array<Record<string, unknown>>).map(async (item) => {
          const category = String(item.supplement ?? item.name ?? "");
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
      output.supplementSchedule = filtered;
    }
    if (pregnancyDisclaimer) {
      output.pregnancy_disclaimer = pregnancyDisclaimer;
    }
  }
  // ── End pregnancy supplement filter ──────────────────────────────────────

  // ── Nutrient competition layer ─────────────────────────────────────────────
  const compPayload  = result.output as unknown as Record<string, unknown>;
  const compSchedule = Array.isArray(compPayload.supplementSchedule)
    ? (compPayload.supplementSchedule as Array<Record<string, unknown>>)
    : [];
  const protocolProducts: ProtocolProduct[] = compSchedule
    .map((item) => ({
      supplement: String(item.supplement ?? item.name ?? ""),
      dose_mg:    typeof item.dose_mg === "number" ? item.dose_mg : undefined,
    }))
    .filter((p) => !!p.supplement);
  const competitionRules   = await getNutrientPairsForProtocol(
    protocolProducts.map((p) => p.supplement),
  );
  const competitionResults = applyCompetitionRules(competitionRules, protocolProducts);
  const timingSchedule     = generateTimingSchedule(competitionResults, protocolProducts);
  const criticalConflicts  = competitionResults.filter((r) => r.clinical_significance === "critical");
  compPayload.competition_narrative = getCompetitionNarrativeContext(competitionResults);
  compPayload.competition_conflicts = competitionResults;
  compPayload.timing_schedule       = timingSchedule;
  const synergyNotes = competitionResults
    .filter((r) => r.action === "suggest_addition")
    .map((r) => `Consider recommending ${r.nutrient_b} — user is taking ${r.nutrient_a} which creates a synergy dependency.`);
  if (synergyNotes.length > 0) {
    compPayload.synergy_suggestions = synergyNotes;
  }
  // ── End nutrient competition layer ────────────────────────────────────────

  // ── Adverse event suppression ──────────────────────────────────────────────
  const suppressedProducts: string[] = [];
  const aeSchedule = Array.isArray(compPayload.supplementSchedule)
    ? (compPayload.supplementSchedule as Array<Record<string, unknown>>)
    : [];
  if (aeSchedule.length > 0) {
    // Collect all product IDs, fetch suppression status in one query
    const allProductIds = aeSchedule
      .map((item) => (typeof item.product_id === "string" ? item.product_id : null))
      .filter((id): id is string => id !== null);
    const suppressedIds = await getSuppressedProductIds(session.user.id, allProductIds);

    const aeFiltered = aeSchedule.filter((item) => {
      const productId = typeof item.product_id === "string" ? item.product_id : null;
      if (productId && suppressedIds.has(productId)) {
        suppressedProducts.push(String(item.supplement ?? item.name ?? productId));
        return false;
      }
      return true;
    });
    compPayload.supplementSchedule = aeFiltered;
  }
  if (suppressedProducts.length > 0) {
    compPayload.adverse_event_note =
      `The following products have been removed due to reported adverse events: ${suppressedProducts.join(", ")}`;
  }
  // ── End adverse event suppression ────────────────────────────────────────

  // ── Personal baseline context ──────────────────────────────────────────────
  const markerNames = biomarkers.map((b) => b.name);
  let baselineContexts: BaselineContext[] = [];
  if (markerNames.length > 0) {
    try {
      baselineContexts = await getBaselineContext(session.user.id, markerNames);
      const baselineNarrative = getBaselineNarrativeContext(baselineContexts);
      if (baselineNarrative) {
        compPayload.baseline_narrative = baselineNarrative;
      }
    } catch (err) {
      console.error("[protocol/generate] baseline context error:", err instanceof Error ? err.message : err);
    }
  }
  // ── End personal baseline context ─────────────────────────────────────────

  // ── Training phase context ─────────────────────────────────────────────────
  let effectivePhase  = "base";
  let phaseConfidence = 0.5;
  try {
    const [phase, phaseConfRes] = await Promise.all([
      getEffectiveTrainingPhase(session.user.id),
      supabase
        .from(TABLES.USER_HEALTH_CONTEXT)
        .select("auto_phase_confidence")
        .eq(COLS.USER_ID, session.user.id)
        .maybeSingle(),
    ]);
    effectivePhase  = phase;
    phaseConfidence = (phaseConfRes.data as { auto_phase_confidence: number | null } | null)
      ?.auto_phase_confidence ?? 0.5;
    const phaseNarrative = getPhaseNarrativeContext(effectivePhase, phaseConfidence);
    compPayload.training_phase_context = phaseNarrative;
  } catch (err) {
    console.error("[protocol/generate] training phase context error:", err instanceof Error ? err.message : err);
  }
  // ── End training phase context ─────────────────────────────────────────────

  // ── Outcome context ────────────────────────────────────────────────────────
  let outcomeSummary: OutcomeSummary | null = null;
  try {
    // Fetch the most recent previous snapshot (before this generation)
    const { data: prevSnapshot } = await supabase
      .from(TABLES.PROTOCOL_OUTPUTS)
      .select(COLS.ID)
      .eq(COLS.USER_ID, session.user.id)
      .order(COLS.CREATED_AT, { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevSnapshot?.id) {
      outcomeSummary = await generateOutcomeSummary(session.user.id, prevSnapshot.id as string);
      const outcomeNarrative = getOutcomeNarrativeContext(outcomeSummary);
      if (outcomeNarrative) {
        compPayload.outcome_context = outcomeNarrative;
      }
    }
  } catch (err) {
    console.error("[protocol/generate] outcome context error:", err instanceof Error ? err.message : err);
  }
  // ── End outcome context ────────────────────────────────────────────────────

  // ----------------------------------------------------------------
  // Persist to protocol_outputs
  // ----------------------------------------------------------------

  const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  const { data, error: dbErr } = await supabase
    .from(TABLES.PROTOCOL_OUTPUTS)
    .insert({
      [COLS.USER_ID]:       session.user.id,
      [COLS.UPLOAD_ID]:     uploadId ?? null,
      [COLS.MODEL]:         MODEL,
      [COLS.RAW_RESPONSE]:  result.rawResponse,
      [COLS.PARSED_OUTPUT]: result.output,
      [COLS.PRIORITY_SCORE]: result.output.priorityScore,
      [COLS.INPUT_TOKENS]:  result.inputTokens,
      [COLS.OUTPUT_TOKENS]: result.outputTokens,
    })
    .select(COLS.ID)
    .maybeSingle();

  if (dbErr || !data) {
    console.error("[protocol/generate] DB error:", dbErr?.message);
    return NextResponse.json({ error: "Failed to save protocol" }, { status: 500 });
  }

  return NextResponse.json({
    outputId:              data.id,
    output:                result.output,
    competition_conflicts: competitionResults,
    timing_schedule:       timingSchedule,
    critical_conflicts:    criticalConflicts,
    suppressed_products:   suppressedProducts,
    baseline_context:      baselineContexts,
    training_phase:        effectivePhase,
    phase_confidence:      phaseConfidence,
    outcome_summary:       outcomeSummary,
    ...(pregnancyDisclaimer ? { pregnancy_disclaimer: pregnancyDisclaimer } : {}),
  });
});
