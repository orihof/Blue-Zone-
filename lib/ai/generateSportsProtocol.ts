/// lib/ai/generateSportsProtocol.ts
// Calls Claude to generate a 5-section competition prep protocol.

import Anthropic from "@anthropic-ai/sdk";
import { SportsProtocolPayloadSchema, type SportsProtocolPayload, type SportsPrepFormData } from "@/lib/db/sports-payload";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precision sports medicine and performance optimization specialist. You work with serious amateur and competitive athletes aged 35–55 who train 4–6x/week and track data via wearables. Your protocols are direct, evidence-based, and performance-oriented — not generic wellness advice.

You will receive blood test data, wearable metrics, and event-specific preparation inputs. Generate a competition prep protocol with exactly 5 sections as JSON.

CRITICAL RULES:
1. Be specific and actionable. No filler or generic disclaimers.
2. Every supplement must have a specific dose, timing, and brand-agnostic product name.
3. Red flags must reference the user's actual injuries, conditions, and medications — not generic warnings.
4. The periodized timeline must be phase-appropriate to the weeks-to-event. If < 4 weeks, skip Base/Build.
5. Tier pack must match the exact budget tier — don't over-deliver or under-deliver.
6. The wearable metrics section must match the device source provided.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA (return exactly this structure):
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
  },
  "tierPack": {
    "tier": number (1|2|3|4),
    "supplements": [
      { "name": "string", "dose": "string", "timing": "string", "notes": "string" }
    ],
    "testing": ["string (lab tests or diagnostics — empty array for tier 1)"],
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

// ── User message builder ─────────────────────────────────────────────────────

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

function buildUserMessage(input: GenerateSportsInput): string {
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

  const distanceGuidance = competitionType === "running_race" && raceDistance ? `
7. Distance-specific focus for ${RACE_DISTANCE_LABELS[raceDistance] ?? raceDistance}:
   - 5K / 10K: emphasize speed, VO2 max, and neuromuscular protocols
   - Half Marathon / Marathon: emphasize aerobic base, glycogen strategy, and long run recovery
   - Ultra Marathon: emphasize gut training, electrolyte management, mental endurance, and fat adaptation` : "";

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

=== INSTRUCTIONS ===
1. Build the periodized timeline for exactly ${weeksToEvent} weeks. Use all 6 phases if time allows; compress if < 8 weeks.
2. Red flags must be specific to THIS user's injuries (${injuriesStr}), conditions (${conditionsStr}), and medications (${medsStr}).
3. Tier ${budgetTier} pack: include ALL supplements, testing, gear, services appropriate for this tier.
4. Supplement schedule: include every supplement from the tier pack.
5. Wearable metrics: provide exactly 3 metrics most critical for ${competitionType} prep.
6. The "whatYouAreMissing" field in tierPack should be empty array [] if tier is 4.${distanceGuidance}

Return ONLY the JSON. No other text.`;
}

// ── JSON extraction helper ───────────────────────────────────────────────────
// Handles: plain JSON, ```json ... ``` fences, preamble text before the object.

function extractJSON(raw: string): unknown {
  // 1. Strip markdown code fences
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }

  // 2. Find the outermost { … } in case Claude added preamble/postamble text
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(stripped.slice(start, end + 1));
  }

  throw new Error("No JSON object found in Claude response");
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function generateSportsProtocol(
  input: GenerateSportsInput
): Promise<SportsProtocolPayload> {
  const client = getClient();
  const userMessage = buildUserMessage(input);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let response = await client.messages.create({
    model:      MODEL,
    max_tokens: 6000,   // 4000 was too low — a full 6-phase tier-4 protocol can exceed it
    system:     SYSTEM_PROMPT,
    messages,
  });

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") throw new Error("Unexpected non-text response from Claude");

  let raw = firstBlock.text.trim();

  // Log stop_reason so truncation is visible in server logs
  if (response.stop_reason === "max_tokens") {
    console.warn("[generateSportsProtocol] Hit max_tokens on first attempt — response truncated");
  }

  let parsed: unknown = null;
  try { parsed = extractJSON(raw); } catch { /* will retry */ }
  let validated = SportsProtocolPayloadSchema.safeParse(parsed);

  if (validated.success) return validated.data;

  // Retry — use different prompt depending on whether it was a parse failure or schema failure
  const parseFailure = parsed === null;
  const retryUserContent = parseFailure
    ? "Your previous response could not be parsed as JSON. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text."
    : `Schema validation failed: ${validated.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Return ONLY the corrected JSON.`;

  response = await client.messages.create({
    model:      MODEL,
    max_tokens: 6000,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: "user",      content: userMessage },
      { role: "assistant", content: parseFailure ? "{" : raw },   // seed JSON start on parse failure
      { role: "user",      content: retryUserContent },
    ],
  });

  const retryBlock = response.content[0];
  if (retryBlock.type !== "text") throw new Error("Non-text response on retry");

  raw = retryBlock.text.trim();
  parsed = null;
  try { parsed = extractJSON(raw); } catch { /* will throw below */ }
  validated = SportsProtocolPayloadSchema.safeParse(parsed);

  if (!validated.success) {
    const issues = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Sports protocol generation failed: ${parsed === null ? "response was not valid JSON" : issues}`);
  }

  return validated.data;
}
