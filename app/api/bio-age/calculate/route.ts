/// app/api/bio-age/calculate/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireConsent } from "@/lib/middleware/requireConsent";

export const runtime    = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a longevity medicine specialist and expert in biological age estimation.
You analyze biomarker panels and wearable data to estimate biological age relative to chronological age.
Your estimates are evidence-based, drawing on published longevity research (Levine, Horvath, CALERIE, etc.).

You will receive:
- Chronological age and gender
- Biomarker values with reference ranges and status
- Wearable metrics (HRV, sleep, recovery)

Return ONLY a JSON object with these exact fields:
{
  "biologicalAge": number (e.g. 38.5 — one decimal place),
  "delta": number (biologicalAge minus chronologicalAge — negative means younger),
  "percentile": number (1–100 — what % of the population ages faster than this person),
  "confidenceLevel": "low" | "medium" | "high",
  "confidenceReason": string (1 sentence explaining confidence level),
  "primaryDrivers": [
    {
      "factor": string (biomarker or metric name),
      "direction": "positive" | "negative" | "neutral",
      "magnitude": number (1–3: 1=minor, 2=moderate, 3=major),
      "detail": string (1 sentence explaining impact)
    }
  ]
}

RULES:
- primaryDrivers: 3–5 items, ordered by magnitude descending
- "positive" direction = factor is improving/lowering biological age
- "negative" direction = factor is worsening/raising biological age
- If minimal data available, set confidenceLevel to "low"
- Return ONLY valid JSON — no preamble, no markdown, no trailing text`;

interface BioAgeDriver {
  factor:     string;
  direction:  "positive" | "negative" | "neutral";
  magnitude:  number;
  detail:     string;
}

interface ClaudeResponse {
  biologicalAge:   number;
  delta:           number;
  percentile:      number;
  confidenceLevel: "low" | "medium" | "high";
  confidenceReason: string;
  primaryDrivers:  BioAgeDriver[];
}

export const POST = requireConsent(1)(async () => {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getAdminClient();
  const userId   = session.user.id;

  // Fetch chronological age + gender from most recent intake form
  const [sportsRes, goalRes] = await Promise.all([
    supabase.from(TABLES.SPORTS_PROTOCOLS)
      .select("age, gender").eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
      .order(COLS.CREATED_AT, { ascending: false }).limit(1),
    supabase.from(TABLES.GOAL_PROTOCOLS)
      .select("age, gender").eq(COLS.USER_ID, userId).eq(COLS.STATUS, "ready")
      .order(COLS.CREATED_AT, { ascending: false }).limit(1),
  ]);

  // Pick most recent of the two
  const chronoAge = (sportsRes.data?.[0]?.age ?? goalRes.data?.[0]?.age ?? null) as number | null;
  const gender    = (sportsRes.data?.[0]?.gender ?? goalRes.data?.[0]?.gender ?? "unspecified") as string;

  // Fetch all biomarkers for this user
  const { data: biomarkers } = await supabase
    .from(TABLES.BIOMARKERS)
    .select("name, value, unit, reference_min, reference_max, status")
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(40);

  // Fetch latest wearable snapshot
  const { data: wearSnaps } = await supabase
    .from(TABLES.WEARABLE_SNAPSHOTS)
    .select("hrv, resting_hr, sleep_score, deep_sleep_min, rem_sleep_min, recovery_score, readiness_score")
    .eq(COLS.USER_ID, userId)
    .order(COLS.CREATED_AT, { ascending: false })
    .limit(1);

  const wearable = wearSnaps?.[0] ?? null;

  // Build user message
  const lines: string[] = [];
  lines.push(`Chronological age: ${chronoAge ?? "unknown"}`);
  lines.push(`Gender: ${gender}`);
  lines.push("");

  if (biomarkers && biomarkers.length > 0) {
    lines.push("BIOMARKERS:");
    for (const b of biomarkers as Record<string, unknown>[]) {
      const refRange = b.reference_min != null && b.reference_max != null
        ? ` (ref: ${b.reference_min}–${b.reference_max} ${b.unit})`
        : "";
      lines.push(`  ${b.name}: ${b.value} ${b.unit}${refRange} [${b.status}]`);
    }
  } else {
    lines.push("BIOMARKERS: none available");
  }

  lines.push("");
  if (wearable) {
    lines.push("WEARABLE METRICS:");
    if (wearable.hrv           != null) lines.push(`  HRV: ${wearable.hrv} ms`);
    if (wearable.resting_hr    != null) lines.push(`  Resting HR: ${wearable.resting_hr} bpm`);
    if (wearable.sleep_score   != null) lines.push(`  Sleep score: ${wearable.sleep_score}/100`);
    if (wearable.deep_sleep_min!= null) lines.push(`  Deep sleep: ${wearable.deep_sleep_min} min`);
    if (wearable.rem_sleep_min != null) lines.push(`  REM sleep: ${wearable.rem_sleep_min} min`);
    if (wearable.recovery_score!= null) lines.push(`  Recovery score: ${wearable.recovery_score}/100`);
    if (wearable.readiness_score!= null)lines.push(`  Readiness score: ${wearable.readiness_score}/100`);
  } else {
    lines.push("WEARABLE METRICS: none available");
  }

  const userMessage = lines.join("\n");

  // Call Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 503 });

  const client = new Anthropic({ apiKey });

  let parsed: ClaudeResponse;
  try {
    const msg = await client.messages.create({
      model:      MODEL,
      max_tokens: 1000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userMessage }],
    });

    const text = msg.content.find(b => b.type === "text")?.text ?? "";
    parsed = JSON.parse(text) as ClaudeResponse;
  } catch (err) {
    console.error("bio-age Claude error:", err);
    return NextResponse.json({ error: "Failed to calculate biological age" }, { status: 500 });
  }

  // Validate essential fields
  if (typeof parsed.biologicalAge !== "number" || typeof parsed.delta !== "number") {
    return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
  }

  // Persist to profiles
  const { error: upsertError } = await supabase
    .from(TABLES.PROFILES)
    .upsert({
      id:                   userId,
      biological_age:       Math.round(parsed.biologicalAge * 10) / 10,
      biological_age_delta: Math.round(parsed.delta * 10) / 10,
      bio_age_percentile:   parsed.percentile ?? null,
      bio_age_confidence:   parsed.confidenceLevel ?? null,
      bio_age_drivers:      parsed.primaryDrivers ?? [],
      bio_age_calculated_at: new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    });

  if (upsertError) {
    console.error("bio-age upsert error:", upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    biologicalAge:   parsed.biologicalAge,
    delta:           parsed.delta,
    percentile:      parsed.percentile,
    confidenceLevel: parsed.confidenceLevel,
    confidenceReason: parsed.confidenceReason,
    primaryDrivers:  parsed.primaryDrivers,
    chronologicalAge: chronoAge,
  });
});
