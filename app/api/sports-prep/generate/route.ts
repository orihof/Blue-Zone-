/// app/api/sports-prep/generate/route.ts
// Returns sportsPrepId immediately; Claude runs in the background.
// Client polls /api/sports-prep/status/[id] until status === "ready".

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { generateSportsProtocol } from "@/lib/ai/generateSportsProtocol";
import { type SportsPrepFormData } from "@/lib/db/sports-payload";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  // ── 2. Fire-and-forget: fetch health data + call Claude ───────────────────────
  void (async () => {
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
          ws.hrv            != null ? `HRV: ${ws.hrv} ms`              : "",
          ws.resting_hr     != null ? `Resting HR: ${ws.resting_hr} bpm` : "",
          ws.sleep_score    != null ? `Sleep Score: ${ws.sleep_score}/100` : "",
          ws.recovery_score != null ? `Recovery: ${ws.recovery_score}/100` : "",
          ws.readiness_score!= null ? `Readiness: ${ws.readiness_score}/100` : "",
          ws.strain_score   != null ? `Strain: ${ws.strain_score}`     : "",
          ws.steps          != null ? `Steps: ${ws.steps}`             : "",
        ].filter(Boolean).join("\n");
      }

      const payload = await generateSportsProtocol({ ...body, bloodTestSummary, wearableSummary });

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
      console.error("[sports-prep/generate] background error:", msg);
      await supabase
        .from(TABLES.SPORTS_PROTOCOLS)
        .update({ [COLS.STATUS]: "failed", [COLS.ERROR_MESSAGE]: msg })
        .eq(COLS.ID, sportsPrepId);
    }
  })();

  // ── 3. Return immediately ─────────────────────────────────────────────────────
  return NextResponse.json({ sportsPrepId });
}
