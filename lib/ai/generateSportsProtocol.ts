/// lib/ai/generateSportsProtocol.ts
// Two parallel Claude calls: A = timeline+redFlags, B = tierPack+schedule+wearables.
// Total time = max(A, B) instead of A+B — ~30–40% faster than a single call.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  SportsProtocolPayloadSchema,
  SportsTimelinePhaseSchema,
  SportsRedFlagsSchema,
  SportsTierPackSchema,
  SportsSupplementScheduleItemSchema,
  SportsWearableMetricSchema,
  type SportsProtocolPayload,
  type SportsPrepFormData,
} from "@/lib/db/sports-payload";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const PartASchema = z.object({
  periodizedTimeline: z.array(SportsTimelinePhaseSchema).min(1),
  redFlags:           SportsRedFlagsSchema,
});

const PartBSchema = z.object({
  tierPack:           SportsTierPackSchema,
  supplementSchedule: z.array(SportsSupplementScheduleItemSchema),
  wearableMetrics:    z.array(SportsWearableMetricSchema).min(1).max(5),
});

// ── System prompts ────────────────────────────────────────────────────────────

const SHARED_INTRO = `You are a precision sports medicine and performance optimization specialist. You work with serious amateur and competitive athletes aged 35–55 who train 4–6x/week and track data via wearables. Your protocols are direct, evidence-based, and performance-oriented — not generic wellness advice.`;

const SYSTEM_PROMPT_A = `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON:
1. periodizedTimeline — phase-appropriate to the weeks-to-event
2. redFlags — specific to this user's injuries, conditions, and medications

CRITICAL RULES:
1. Be specific and actionable. No filler or generic disclaimers.
2. Red flags must reference the user's actual data — not generic warnings.
3. If < 4 weeks to event, skip Base/Build phases.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "periodizedTimeline": [
    {
      "phase": "Base|Build|Peak|Taper|Race Week|Post-Event Recovery",
      "durationWeeks": number,
      "trainingFocus": "string describing the primary training emphasis",
      "keyActions": ["action 1", "action 2", "action 3"]
    }
  ],
  "redFlags": {
    "contraindications": ["specific thing to avoid given this user's conditions"],
    "doctorDiscussion": ["specific question to ask doctor given their meds/conditions"],
    "weeklyMonitoring": ["specific metric to track, e.g. resting HR trend, HRV baseline"]
  }
}`;

const SYSTEM_PROMPT_B = `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON:
1. tierPack — match the exact budget tier, don't over-deliver or under-deliver
2. supplementSchedule — every supplement from the tier pack with full dosing schedule
3. wearableMetrics — exactly 3 metrics most critical for the competition type

CRITICAL RULES:
1. Be specific and actionable. No filler or generic disclaimers.
2. Every supplement must have a specific dose, timing, and brand-agnostic product name.
3. Tier pack must match the exact budget tier.
4. The wearable metrics section must match the device source provided.
5. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": {
    "tier": number (1|2|3|4),
    "supplements": [
      { "name": "string", "dose": "string", "timing": "string", "notes": "string" }
    ],
    "testing": ["string (lab tests — empty array for tier 1)"],
    "gear": ["string (sport-specific gear — empty array for tiers 1-2)"],
    "services": ["string (coaching/PT/massage — empty array for tiers 1-2)"],
    "biggestROI": ["ranked 1st", "ranked 2nd", "ranked 3rd", "ranked 4th", "ranked 5th"],
    "whatYouAreMissing": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "supplementSchedule": [
    {
      "name": "string",
      "dose": "string",
      "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals",
      "withFood": boolean,
      "notes": "string"
    }
  ],
  "wearableMetrics": [
    {
      "metric": "string (e.g. HRV, Resting HR, Sleep Score)",
      "goodTrend": "string (what a positive trajectory looks like)",
      "concerningTrend": "string (what should trigger training reduction)",
      "trainingGuidance": "string (when to back off or push)"
    }
  ]
}`;

// ── User message builder ──────────────────────────────────────────────────────

const RACE_DISTANCE_LABELS: Record<string, string> = {
  "5k":            "5K",
  "10k":           "10K",
  "half_marathon": "Half Marathon",
  "marathon":      "Marathon",
  "ultra_marathon":"Ultra Marathon",
};

interface GenerateSportsInput extends SportsPrepFormData {
  bloodTestSummary?: string;
  wearableSummary?:  string;
}

function buildUserMessage(input: GenerateSportsInput, part: "A" | "B"): string {
  const {
    competitionType, eventDate, weeksToEvent, priorityOutcome,
    age, gender, experienceLevel,
    currentInjuries, knownConditions, medications, stimulantTolerance,
    budgetValue, budgetTier, raceDistance,
    bloodTestSummary, wearableSummary,
  } = input;

  const injuriesStr   = currentInjuries.length > 0 ? currentInjuries.join(", ") : "none";
  const conditionsStr = knownConditions.length > 0 ? knownConditions.join(", ") : "none";
  const medsStr       = medications.trim() || "none";

  const distanceLine = competitionType === "running_race" && raceDistance
    ? `Race Distance: ${RACE_DISTANCE_LABELS[raceDistance] ?? raceDistance}\n`
    : "";

  const distanceGuidance = competitionType === "running_race" && raceDistance
    ? `\nDistance-specific focus for ${RACE_DISTANCE_LABELS[raceDistance] ?? raceDistance}:\n` +
      `- 5K / 10K: emphasize speed, VO2 max, and neuromuscular protocols\n` +
      `- Half Marathon / Marathon: emphasize aerobic base, glycogen strategy, and long run recovery\n` +
      `- Ultra Marathon: emphasize gut training, electrolyte management, mental endurance, and fat adaptation`
    : "";

  const instructionsA =
    `=== INSTRUCTIONS ===\n` +
    `1. Build the periodized timeline for exactly ${weeksToEvent} weeks. Use all 6 phases if time allows; compress if < 8 weeks.\n` +
    `2. Red flags must be specific to THIS user's injuries (${injuriesStr}), conditions (${conditionsStr}), and medications (${medsStr}).\n\n` +
    `Return ONLY the JSON with "periodizedTimeline" and "redFlags". No other text.`;

  const instructionsB =
    `=== INSTRUCTIONS ===\n` +
    `1. Tier ${budgetTier} pack: include ALL supplements, testing, gear, services appropriate for this tier.\n` +
    `2. Supplement schedule: include every supplement from the tier pack.\n` +
    `3. Wearable metrics: provide exactly 3 metrics most critical for ${competitionType} prep.\n` +
    `4. The "whatYouAreMissing" field in tierPack should be empty array [] if tier is 4.${distanceGuidance}\n\n` +
    `Return ONLY the JSON with "tierPack", "supplementSchedule", and "wearableMetrics". No other text.`;

  return `Generate a Competition Prep Protocol for this athlete.

=== EVENT PROFILE ===
Competition: ${competitionType}
${distanceLine}Event Date: ${eventDate}
Weeks to Event: ${weeksToEvent}
Priority Outcome: ${priorityOutcome}

=== ATHLETE PROFILE ===
Age: ${age} | Gender: ${gender} | Experience: ${experienceLevel}
Current Injuries: ${injuriesStr}
Known Conditions: ${conditionsStr}
Medications: ${medsStr}
Stimulant Tolerance: ${stimulantTolerance}
Budget: $${budgetValue.toLocaleString()} (Tier ${budgetTier})

=== BLOOD TEST DATA ===
${bloodTestSummary ?? "No blood test data available — build protocol based on sport-specific defaults for this athlete profile."}

=== WEARABLE METRICS ===
${wearableSummary ?? "No wearable data available — use standard recovery benchmarks for the sport."}

${part === "A" ? instructionsA : instructionsB}`;
}

// ── JSON extraction helper ────────────────────────────────────────────────────

function extractJSON(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }

  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(stripped.slice(start, end + 1));
  }

  throw new Error("No JSON object found in Claude response");
}

// ── Single-part caller with retry ─────────────────────────────────────────────

async function callWithRetry<T>(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodType<T>,
  maxTokens: number,
  label: string,
): Promise<T> {
  let response = await client.messages.create({
    model:      MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn(`[generateSportsProtocol] ${label} hit max_tokens — response may be truncated`);
  }

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") throw new Error(`[${label}] Unexpected non-text response`);

  let raw = firstBlock.text.trim();

  let parsed: unknown = null;
  try { parsed = extractJSON(raw); } catch { /* will retry */ }
  let validated = schema.safeParse(parsed);
  if (validated.success) return validated.data;

  // Retry with context-aware prompt
  const parseFailure      = parsed === null;
  const retryUserContent  = parseFailure
    ? "Your previous response could not be parsed as JSON. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text."
    : `Schema validation failed: ${validated.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Return ONLY the corrected JSON.`;

  response = await client.messages.create({
    model:      MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages: [
      { role: "user",      content: userMessage },
      { role: "assistant", content: parseFailure ? "{" : raw },
      { role: "user",      content: retryUserContent },
    ],
  });

  const retryBlock = response.content[0];
  if (retryBlock.type !== "text") throw new Error(`[${label}] Non-text response on retry`);

  raw    = retryBlock.text.trim();
  parsed = null;
  try { parsed = extractJSON(raw); } catch { /* will throw below */ }
  validated = schema.safeParse(parsed);

  if (!validated.success) {
    const issues = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`[${label}] failed: ${parsed === null ? "response was not valid JSON" : issues}`);
  }

  return validated.data;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateSportsProtocol(
  input: GenerateSportsInput
): Promise<SportsProtocolPayload> {
  const client = getClient();

  // Fire both calls in parallel — total time = max(A, B) instead of A+B
  const [partA, partB] = await Promise.all([
    callWithRetry(client, SYSTEM_PROMPT_A, buildUserMessage(input, "A"), PartASchema, 2000, "part-A"),
    callWithRetry(client, SYSTEM_PROMPT_B, buildUserMessage(input, "B"), PartBSchema, 5000, "part-B"),
  ]);

  const merged    = { ...partA, ...partB };
  const validated = SportsProtocolPayloadSchema.safeParse(merged);

  if (!validated.success) {
    const issues = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Merged protocol failed validation: ${issues}`);
  }

  return validated.data;
}
