/// lib/ai/generateBiomarkerReport.ts
// Single Claude call → structured biomarker analysis report.
// Returns payload + token counts so the caller can log to api_usage.

import Anthropic from "@anthropic-ai/sdk";
import {
  BiomarkerReportPayloadSchema,
  type BiomarkerReportPayload,
} from "@/lib/db/analysis-payload";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ── Input / Output types ──────────────────────────────────────────────────────

export interface BiomarkerInput {
  name:          string;
  value:         number;
  unit:          string | null;
  status:        string;
  reference_min: number | null;
  reference_max: number | null;
}

export interface ProfileInput {
  age?:                  number | null;
  biological_sex?:       string | null;
  activity_level?:       string | null;
  athlete_archetype?:    string | null;
  health_goals?:         string[] | null;
  current_medications?:  string | null;
  current_supplements?:  string | null;
  conditions?:           string[] | null;
  biological_age?:       number | null;
}

export interface WearableInput {
  hrv?:             number | null;
  resting_hr?:      number | null;
  sleep_score?:     number | null;
  recovery_score?:  number | null;
  readiness_score?: number | null;
}

export interface BiomarkerReportInput {
  biomarkers: BiomarkerInput[];
  profile:    ProfileInput;
  wearable?:  WearableInput | null;
}

export interface BiomarkerReportResult {
  payload:      BiomarkerReportPayload;
  model:        string;
  inputTokens:  number;
  outputTokens: number;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a precision medicine specialist and longevity expert who interprets biomarker panels for health-optimization clients. Your role is to generate a comprehensive, actionable analysis report based on the provided lab results, wearable data, and health profile.

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON. No preamble, no markdown fences, no trailing text.
- The JSON must exactly match the schema provided.
- Never make diagnoses. Use language like "may suggest", "is associated with", "discuss with your clinician".
- All supplement recommendations must include specific doses and timing.
- Priority actions must be ranked 1 (highest) to 3 (lowest urgency).
- keyFindings must cover every biomarker that is not in the "normal" reference range, plus highlight top optimal ones.
- redFlags must flag any values that warrant urgent medical attention.
- Scores (0-100) reflect optimization level — 100 = fully optimized, not just "in range".

REQUIRED JSON SCHEMA:
{
  "summary": string,
  "scores": {
    "overall": number,
    "metabolic": number,
    "cardiovascular": number,
    "hormonal": number,
    "recovery": number
  },
  "keyFindings": [
    {
      "marker": string,
      "status": "optimal" | "suboptimal" | "concerning" | "critical",
      "value": string,
      "insight": string,
      "action": string
    }
  ],
  "priorityActions": [
    {
      "priority": 1 | 2 | 3,
      "action": string,
      "rationale": string,
      "timeframe": string
    }
  ],
  "supplementRecommendations": [
    {
      "name": string,
      "dose": string,
      "timing": string,
      "rationale": string,
      "targetMarker": string
    }
  ],
  "lifestyleInterventions": [
    {
      "intervention": string,
      "impact": string,
      "targetMarkers": string[]
    }
  ],
  "retestingSchedule": [
    {
      "marker": string,
      "frequency": string,
      "rationale": string
    }
  ],
  "redFlags": string[]
}`;

// ── User message builder ───────────────────────────────────────────────────────

function buildUserMessage(input: BiomarkerReportInput): string {
  const { biomarkers, profile, wearable } = input;

  const biomarkerLines = biomarkers.map((b) => {
    const ref = b.reference_min != null && b.reference_max != null
      ? ` (ref ${b.reference_min}–${b.reference_max} ${b.unit ?? ""})`
      : "";
    return `${b.name}: ${b.value} ${b.unit ?? ""}${ref} [${b.status}]`;
  }).join("\n");

  const profileLines = [
    profile.age             ? `Age: ${profile.age}`                                    : "",
    profile.biological_sex  ? `Biological sex: ${profile.biological_sex}`              : "",
    profile.biological_age  ? `Biological age estimate: ${profile.biological_age}`     : "",
    profile.activity_level  ? `Activity level: ${profile.activity_level}`              : "",
    profile.athlete_archetype ? `Athlete archetype: ${profile.athlete_archetype}`      : "",
    profile.health_goals?.length ? `Health goals: ${profile.health_goals.join(", ")}` : "",
    profile.conditions?.length   ? `Conditions: ${profile.conditions.join(", ")}`      : "Conditions: none",
    profile.current_medications?.trim() ? `Medications: ${profile.current_medications}` : "Medications: none",
    profile.current_supplements?.trim() ? `Current supplements: ${profile.current_supplements}` : "",
  ].filter(Boolean).join("\n");

  const wearableLines = wearable ? [
    wearable.hrv             != null ? `HRV: ${wearable.hrv} ms`               : "",
    wearable.resting_hr      != null ? `Resting HR: ${wearable.resting_hr} bpm` : "",
    wearable.sleep_score     != null ? `Sleep score: ${wearable.sleep_score}/100` : "",
    wearable.recovery_score  != null ? `Recovery score: ${wearable.recovery_score}/100` : "",
    wearable.readiness_score != null ? `Readiness score: ${wearable.readiness_score}/100` : "",
  ].filter(Boolean).join("\n") : "";

  return `Generate a comprehensive biomarker analysis report for this individual.

=== HEALTH PROFILE ===
${profileLines || "No profile data provided."}

=== BIOMARKER PANEL (${biomarkers.length} markers) ===
${biomarkerLines || "No biomarker data provided."}

=== WEARABLE METRICS ===
${wearableLines || "No wearable data available."}

=== INSTRUCTIONS ===
1. Analyse every out-of-range biomarker as a keyFinding; highlight top 2–3 optimal ones too.
2. Provide 3–5 priorityActions ranked by urgency.
3. Recommend supplements only where there is evidence linking them to the abnormal markers.
4. Reference the user's actual conditions and medications in all recommendations.
5. Flag any value requiring urgent medical review in redFlags.

Output ONLY the JSON. No other text.`;
}

// ── JSON extraction helper ────────────────────────────────────────────────────

function extractJSON(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) return JSON.parse(stripped.slice(start, end + 1));
  throw new Error("No JSON object found in Claude response");
}

// ── Main export ───���───────────────────────────────────────────────────────────

export async function generateBiomarkerReport(
  input: BiomarkerReportInput,
): Promise<BiomarkerReportResult> {
  const client      = getClient();
  const userMessage = buildUserMessage(input);

  let totalInput  = 0;
  let totalOutput = 0;

  // ── First attempt ──────────────────────────────────────────────────────────
  let response = await client.messages.create({
    model:      MODEL,
    max_tokens: 4000,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userMessage }],
  });

  totalInput  += response.usage.input_tokens;
  totalOutput += response.usage.output_tokens;

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") throw new Error("Unexpected non-text response from Claude");

  let raw    = firstBlock.text.trim();
  let parsed: unknown = null;
  try { parsed = extractJSON(raw); } catch { /* will retry */ }

  let validated = BiomarkerReportPayloadSchema.safeParse(parsed);
  if (validated.success) {
    return { payload: validated.data, model: MODEL, inputTokens: totalInput, outputTokens: totalOutput };
  }

  // ── Retry with corrective prompt ───────────────────────────────────────────
  const retryMsg = parsed === null
    ? "Your previous response could not be parsed as JSON. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text."
    : `Schema validation failed: ${validated.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Return ONLY the corrected JSON.`;

  response = await client.messages.create({
    model:      MODEL,
    max_tokens: 4000,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: "user",      content: userMessage },
      { role: "assistant", content: parsed === null ? "{" : raw },
      { role: "user",      content: retryMsg },
    ],
  });

  totalInput  += response.usage.input_tokens;
  totalOutput += response.usage.output_tokens;

  const retryBlock = response.content[0];
  if (retryBlock.type !== "text") throw new Error("Non-text response on retry");

  raw    = retryBlock.text.trim();
  parsed = null;
  try { parsed = extractJSON(raw); } catch { /* will throw below */ }

  validated = BiomarkerReportPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Biomarker report failed validation after retry: ${parsed === null ? "response was not valid JSON" : issues}`);
  }

  return { payload: validated.data, model: MODEL, inputTokens: totalInput, outputTokens: totalOutput };
}
