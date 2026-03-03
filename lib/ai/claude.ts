/// lib/ai/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { ProtocolPayloadSchema, type ProtocolPayload } from "@/lib/db/payload";
import { captureException } from "@/lib/sentry";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

const SYSTEM_PROMPT = `You are a precision longevity protocol specialist. Your role is to generate evidence-informed, individualized protocols based on provided health data.

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON. No preamble, no markdown fences, no trailing text.
- The JSON must exactly match the schema provided.
- Never make medical diagnoses. Use cautious language: "may support", "commonly associated with", "discuss with your clinician".
- Always include whenToAvoid and generalContraindications for every recommendation.
- Always populate whatToTrack and the full timeline.
- For supplement stacks of 3+ items, include stackSafetyNotes covering interaction risks.
- Populate biologicalAgeNarrative only when biologicalAgeEstimate is non-null.
- Safety disclaimers must be present in every response.

REQUIRED JSON SCHEMA:
{
  "scores": { "biologicalAgeEstimate": number|null, "confidence": 0-1, "recovery": 0-100, "sleep": 0-100, "metabolic": 0-100, "readiness": 0-100 },
  "biologicalAgeNarrative": { "deltaFromChronological": number, "headline": string, "topDraggingUp": string[], "topPullingDown": string[], "sixMonthProjection": string } | null,
  "timeline": [{ "week": number, "focus": string, "expectedWins": string[] }],
  "recommendations": {
    "supplements": [RecItem], "nutrition": [RecItem], "home": [RecItem], "clinics": [ClinicItem]
  },
  "stackSafetyNotes": string[],
  "habits": { "dailyChecklist": [{ "id": string, "title": string, "frequency": "daily"|"weekly", "timeOfDay": "am"|"pm"|null }], "weeklyCheckInQuestions": string[] },
  "explainability": { "keyDrivers": [{ "title": string, "evidence": string[], "sourcedFrom": "wearable"|"labs"|"questionnaire"|"upload" }] },
  "safety": { "disclaimers": string[], "redFlags": string[], "generalContraindications": string[] }
}

RecItem: { "id": string, "category": "supplement"|"nutrition"|"home", "title": string, "rationaleBullets": string[2-3], "howToUse": string, "whatToTrack": string[], "whenToAvoid": string[], "tags": string[], "links": { "iherb": string|null, "amazon": string|null } }
ClinicItem: { "id": string, "name": string, "city": string, "specialty": string[], "whyRelevant": string[], "website": string|null, "bookingUrl": string|null, "placeId": string|null }`;

interface ProtocolContext {
  chronologicalAge: number;
  targetAge: number;
  goals: string[];
  budget: string;
  preferences: Record<string, unknown>;
  uploadSummary: string; // plain text summary of uploaded files
  uploadCount: number;
}

function buildUserMessage(ctx: ProtocolContext): string {
  return `Generate a personalized longevity protocol for this individual.

CHRONOLOGICAL AGE: ${ctx.chronologicalAge}
TARGET BIOLOGICAL AGE: ${ctx.targetAge}
GOALS: ${ctx.goals.join(", ")}
BUDGET TIER: ${ctx.budget}
PREFERENCES: ${JSON.stringify(ctx.preferences)}
UPLOADED DATA SOURCES: ${ctx.uploadCount} file(s)
DATA SUMMARY: ${ctx.uploadSummary || "No structured data extracted yet — use goals and preferences to infer."}

Generate 4–7 supplement recommendations, 2–3 nutrition recommendations, 2–3 home/lifestyle tool recommendations, and 3–4 clinic specialties. Include a 6-week timeline. Confidence score should reflect data richness (low if only questionnaire data).

Output ONLY the JSON. No other text.`;
}

const RETRY_SUFFIX = "\n\nYour previous response was not valid JSON or did not match the required schema. Output ONLY the corrected JSON now.";

async function callClaude(messages: Anthropic.MessageParam[]): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages,
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected non-text response from Claude");
  return block.text.trim();
}

export async function generatePersonalProtocol(ctx: ProtocolContext): Promise<ProtocolPayload> {
  const userMsg = buildUserMessage(ctx);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMsg }];

  // First attempt
  let raw: string;
  try {
    raw = await callClaude(messages);
  } catch (err) {
    captureException(err, { ctx: "claude:first_attempt" });
    throw err;
  }

  // Parse + validate
  let parsed: unknown;
  let validated = ProtocolPayloadSchema.safeParse(
    (() => { try { return JSON.parse(raw); } catch { return null; } })()
  );

  if (validated.success) return validated.data;

  // Retry once with corrective prompt
  const retryMessages: Anthropic.MessageParam[] = [
    { role: "user", content: userMsg },
    { role: "assistant", content: raw },
    { role: "user", content: RETRY_SUFFIX },
  ];

  try {
    raw = await callClaude(retryMessages);
    parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
    validated = ProtocolPayloadSchema.safeParse(parsed);
  } catch (err) {
    captureException(err, { ctx: "claude:retry_attempt" });
    throw new Error("Claude retry failed: " + (err instanceof Error ? err.message : String(err)));
  }

  if (!validated.success) {
    captureException(new Error("Claude validation failed after retry"), {
      issues: validated.error.issues.slice(0, 5),
    });
    throw new Error("Protocol generation failed — please try again");
  }

  return validated.data;
}
