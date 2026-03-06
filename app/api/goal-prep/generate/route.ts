/// app/api/goal-prep/generate/route.ts
// Synchronous generation (maxDuration = 120s).
// Returns goalPrepId with status already "ready" or "failed" in DB.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateGoalProtocol } from "@/lib/ai/generateGoalProtocol";
import { GOAL_CATEGORIES, type GoalPrepFormData } from "@/lib/db/goal-payload";
import { NextResponse } from "next/server";

export const runtime     = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
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

  const supabase = getAdminClient();

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

    const payload = await generateGoalProtocol({ ...body, bloodTestSummary, wearableSummary });

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
  return NextResponse.json({ goalPrepId });
}
