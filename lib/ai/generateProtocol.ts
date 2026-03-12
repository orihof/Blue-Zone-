/// lib/ai/generateProtocol.ts
import Anthropic from "@anthropic-ai/sdk";
import { ProtocolOutputSchema, type ProtocolOutput } from "@/lib/types/health";
import type { NormalizedBiomarkers, NormalizedWearableData, UserProfile } from "@/lib/types/health";

// ============================================================
// CLIENT
// ============================================================

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `You are a precision longevity medicine specialist with expertise in biomarker interpretation, wearable health metrics, and evidence-based interventions. Your role is to generate highly personalized, data-driven protocols — not generic wellness advice.

CRITICAL RULES:
1. Base EVERY recommendation strictly on the provided biomarker and wearable data. Generic advice without data citation is forbidden.
2. Every recommendation must cite at least one specific biomarker or metric from the user's data in its explanation and biomarkerLinks fields. Format: "MetricName: value unit (status)".
3. Never make medical diagnoses. Use language like "may support", "associated with", "discuss with your clinician".
4. Include precise actionType classification: supplement|lifestyle|diagnostic|nutrition.
5. For supplements, populate productQuery with a specific search string (e.g. "magnesium glycinate 400mg capsules").
6. Set priorityScore 0–100 based on the severity and number of out-of-range markers.

OUTPUT FORMAT: Return ONLY valid JSON matching this exact schema — no preamble, no markdown, no trailing text:

{
  "summary": "string (2–3 sentences personalized to this user's specific data)",
  "priorityScore": number (0–100),
  "pillars": [
    {
      "name": "string (e.g. Sleep, Inflammation, Metabolic Health, Hormonal Balance)",
      "status": "critical|suboptimal|good|optimal",
      "insight": "string (cite specific metric: e.g. 'HRV of 38ms is below the optimal threshold of 60ms, indicating autonomic stress')",
      "recommendations": [
        {
          "title": "string",
          "explanation": "string (must reference the specific biomarker/metric that drives this recommendation)",
          "biomarkerLinks": ["string (format: 'MetricName: value unit (status)')"],
          "actionType": "supplement|lifestyle|diagnostic|nutrition",
          "priority": "high|medium|low",
          "productQuery": "string or omit (only for supplement actionType)"
        }
      ]
    }
  ]
}`;

// ============================================================
// USER MESSAGE BUILDER
// ============================================================

function formatBiomarkers(biomarkers: NormalizedBiomarkers[]): string {
  if (biomarkers.length === 0) return "No lab data available.";

  const sections: Record<string, NormalizedBiomarkers[]> = {};
  for (const b of biomarkers) {
    const group = b.status === "critical" || b.status === "low" || b.status === "high"
      ? "⚠ OUT OF RANGE"
      : "✓ IN RANGE";
    sections[group] = [...(sections[group] ?? []), b];
  }

  return Object.entries(sections)
    .map(([group, items]) => {
      const rows = items.map(
        (b) =>
          `  • ${b.name}: ${b.value} ${b.unit} [ref: ${b.referenceRange.low ?? "?"} – ${b.referenceRange.high ?? "?"}] STATUS: ${b.status.toUpperCase()}`
      );
      return `${group}:\n${rows.join("\n")}`;
    })
    .join("\n\n");
}

function formatWearable(w: NormalizedWearableData | undefined): string {
  if (!w) return "No wearable data available.";
  return `Source: ${w.source} | Date: ${w.date}
  HRV: ${w.hrv}ms | Resting HR: ${w.restingHR}bpm
  Sleep Score: ${w.sleepScore}/100 | Deep Sleep: ${w.deepSleepMinutes}min | REM: ${w.remSleepMinutes}min
  Recovery: ${w.recoveryScore}/100 | Readiness: ${w.readinessScore}/100
  Strain/Activity: ${w.strainScore}/100 | Steps: ${w.steps} | Active kcal: ${w.activeCalories}`;
}

function buildUserMessage(
  biomarkers: NormalizedBiomarkers[],
  wearable: NormalizedWearableData | undefined,
  profile: UserProfile
): string {
  const outOfRange = biomarkers.filter(
    (b) => b.status === "critical" || b.status === "low" || b.status === "high"
  );

  return `Generate a personalized longevity protocol for the following individual.

=== USER PROFILE ===
Age: ${profile.chronologicalAge} years
Target Biological Age: ${profile.targetAge} years
Goals: ${profile.goals.join(", ")}
Budget: ${profile.budget}
Preferences: ${JSON.stringify(profile.preferences)}
Plan: ${profile.plan}${
  Array.isArray(profile.preferences.healthConditions) && (profile.preferences.healthConditions as string[]).length > 0
    ? `\nKnown health conditions: ${(profile.preferences.healthConditions as string[]).join(", ")}`
    : ""
}${
  Array.isArray(profile.preferences.medications) && (profile.preferences.medications as string[]).length > 0
    ? `\nCurrent medications: ${(profile.preferences.medications as string[]).join(", ")} — account for interactions and contraindications`
    : ""
}

=== BIOMARKER RESULTS (${biomarkers.length} total, ${outOfRange.length} out of range) ===
${formatBiomarkers(biomarkers)}

=== WEARABLE METRICS ===
${formatWearable(wearable)}

=== INSTRUCTIONS ===
1. Identify 3–5 health pillars based on the data above.
2. For each pillar, write an insight that directly quotes a specific metric value.
3. For each recommendation, the explanation must reference the specific biomarker(s) or metric(s) that drive it.
4. biomarkerLinks must use format: "MetricName: value unit (status)".
5. Set pillar status based on the severity of the underlying data.
6. Set overall priorityScore based on count and severity of out-of-range markers.
7. For supplements, include a specific productQuery for purchasing.

Return ONLY the JSON. No other text.`;
}

// ============================================================
// PARSE RESPONSE
// ============================================================

function extractJSON(raw: string): unknown {
  // Strip markdown fences if model wraps in ```json
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(stripped);
}

// ============================================================
// MAIN EXPORT
// ============================================================

export interface GenerateProtocolInput {
  biomarkers: NormalizedBiomarkers[];
  wearable?: NormalizedWearableData;
  userProfile: UserProfile;
}

export async function generateProtocol(
  input: GenerateProtocolInput
): Promise<{ output: ProtocolOutput; rawResponse: string; inputTokens: number; outputTokens: number }> {
  const { biomarkers, wearable, userProfile } = input;
  const client = getClient();

  const userMessage = buildUserMessage(biomarkers, wearable, userProfile);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // First attempt
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages,
  });

  const inputTokens  = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const firstBlock   = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Unexpected non-text response from Claude");
  }

  let raw = firstBlock.text.trim();
  let validated = ProtocolOutputSchema.safeParse(
    (() => { try { return extractJSON(raw); } catch { return null; } })()
  );

  if (validated.success) {
    return {
      output:        validated.data,
      rawResponse:   raw,
      inputTokens,
      outputTokens,
    };
  }

  // Retry with corrective prompt
  const issues = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");

  const retryMessages: Anthropic.MessageParam[] = [
    { role: "user",      content: userMessage },
    { role: "assistant", content: raw },
    {
      role: "user",
      content: `Your response did not match the required schema. Issues: ${issues}. Return ONLY the corrected JSON — no explanation, no markdown fences.`,
    },
  ];

  response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: retryMessages,
  });

  const retryBlock = response.content[0];
  if (retryBlock.type !== "text") throw new Error("Unexpected non-text response on retry");

  raw    = retryBlock.text.trim();
  const parsed = (() => { try { return extractJSON(raw); } catch { return null; } })();
  validated = ProtocolOutputSchema.safeParse(parsed);

  if (!validated.success) {
    throw new Error(
      `Protocol generation failed validation after retry: ${validated.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }

  return {
    output:        validated.data,
    rawResponse:   raw,
    inputTokens:   inputTokens + response.usage.input_tokens,
    outputTokens:  outputTokens + response.usage.output_tokens,
  };
}
