/// app/api/goal-prep/generate/route.ts
// Synchronous generation (maxDuration = 120s).
// Returns goalPrepId with status already "ready" or "failed" in DB.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateGoalProtocol } from "@/lib/ai/generateGoalProtocol";
import { GOAL_CATEGORIES, type GoalPrepFormData } from "@/lib/db/goal-payload";
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

export const runtime     = "nodejs";
export const maxDuration = 120;

export const POST = requireConsent(1)(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
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

  const body: GoalPrepFormData | null = await req.json().catch(() => null);

  if (
    !body ||
    !body.category ||
    !(body.category in GOAL_CATEGORIES) ||
    !body.gender ||
    !body.stimulantTolerance ||
    typeof body.age !== "number" || body.age < 10 || body.age > 100 ||
    typeof body.budgetValue !== "number" || body.budgetValue < 1 ||
    ![1, 2, 3, 4].includes(body.budgetTier)
  ) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // ── 1. Create pending record ───────────────────────────────────────────────
  const { data: record, error: insertErr } = await supabase
    .from(TABLES.GOAL_PROTOCOLS)
    .insert({
      [COLS.USER_ID]:           userId,
      [COLS.CATEGORY]:          body.category,
      [COLS.AGE]:               body.age,
      [COLS.GENDER]:            body.gender,
      [COLS.KNOWN_CONDITIONS]:  body.knownConditions ?? [],
      [COLS.MEDICATIONS]:       body.medications ?? "",
      [COLS.STIMULANT_TOLERANCE]: body.stimulantTolerance,
      [COLS.BUDGET_VALUE]:      body.budgetValue,
      [COLS.BUDGET_TIER]:       body.budgetTier,
      [COLS.CATEGORY_DATA]:     body.categoryData ?? {},
      [COLS.STATUS]:            "processing",
    })
    .select(COLS.ID)
    .maybeSingle();

  if (insertErr || !record) {
    console.error("[goal-prep/generate] DB insert error:", insertErr?.message);
    return NextResponse.json({ error: "Failed to create protocol record" }, { status: 500 });
  }

  const goalPrepId = record.id as string;

  // ── 2. Fetch health data + call Claude (awaited — serverless can't fire-and-forget) ──
  try {
    const [biomarkersRes, wearableRes] = await Promise.all([
      supabase
        .from(TABLES.BIOMARKERS)
        .select("name, value, unit, status, reference_min, reference_max")
        .eq(COLS.USER_ID, userId)
        .order(COLS.CREATED_AT, { ascending: false })
        .limit(30),
      supabase
        .from(TABLES.WEARABLE_SNAPSHOTS)
        .select("hrv, resting_hr, sleep_score, recovery_score, readiness_score, strain_score, steps, source, date")
        .eq(COLS.USER_ID, userId)
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
    const ws = wearableRes.data;
    if (ws) {
      wearableSummary = [
        ws.source ? `Source: ${ws.source}` : "",
        ws.date   ? `Date: ${ws.date}`     : "",
        ws.hrv            != null ? `HRV: ${ws.hrv} ms`               : "",
        ws.resting_hr     != null ? `Resting HR: ${ws.resting_hr} bpm` : "",
        ws.sleep_score    != null ? `Sleep Score: ${ws.sleep_score}/100` : "",
        ws.recovery_score != null ? `Recovery: ${ws.recovery_score}/100` : "",
        ws.readiness_score!= null ? `Readiness: ${ws.readiness_score}/100` : "",
        ws.strain_score   != null ? `Strain: ${ws.strain_score}`      : "",
        ws.steps          != null ? `Steps: ${ws.steps}`              : "",
      ].filter(Boolean).join("\n");
    }

    const bloodTestFinal = [
      bloodTestSummary,
      pregnancyContext ? `PREGNANCY SAFETY CONTEXT: ${pregnancyContext}` : undefined,
    ].filter((x): x is string => !!x).join("\n\n") || undefined;

    const payload = await generateGoalProtocol({ ...body, bloodTestSummary: bloodTestFinal, wearableSummary });

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

    await supabase
      .from(TABLES.GOAL_PROTOCOLS)
      .update({
        [COLS.STATUS]:                "ready",
        [COLS.PAYLOAD]:               payload,
        [COLS.PROTOCOL_GENERATED_AT]: new Date().toISOString(),
      })
      .eq(COLS.ID, goalPrepId);

    console.log("[analytics] goal_prep_saved", { userId, goalPrepId, category: body.category, tier: body.budgetTier });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[goal-prep/generate] generation error:", msg);
    await supabase
      .from(TABLES.GOAL_PROTOCOLS)
      .update({ [COLS.STATUS]: "failed", [COLS.ERROR_MESSAGE]: msg })
      .eq(COLS.ID, goalPrepId);
  }

  // ── 3. Return goalPrepId — status is "ready" or "failed" in DB ────────────
  return NextResponse.json({ goalPrepId, ...(pregnancyDisclaimer ? { pregnancy_disclaimer: pregnancyDisclaimer } : {}) });
});
