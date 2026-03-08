/// app/api/protocol/generate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateProtocol } from "@/lib/ai/generateProtocol";
import { checkRateLimit } from "@/lib/rate-limit";
import type { NormalizedBiomarkers, NormalizedWearableData, UserProfile } from "@/lib/types/health";
import { NextRequest, NextResponse } from "next/server";
import { requireConsent } from "@/middleware/requireConsent";

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
    preferences:       preferences ?? {},
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

  return NextResponse.json({ outputId: data.id, output: result.output });
});
