/// app/api/insight/route.ts
import { NextResponse } from "next/server";

/* ── Rate limiting ── */

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

/* ── Validation ── */

const HRV_TRENDS = ["declining", "stable", "improving"] as const;
const TRAINING_PHASES = ["base", "build", "peak", "recovery"] as const;

interface InsightRequest {
  ferritin: number | null;
  hrvTrend: (typeof HRV_TRENDS)[number];
  trainingPhase: (typeof TRAINING_PHASES)[number];
  sleepQuality: number;
  athleteType: string;
  primarySymptom: string | null;
}

function validate(body: Partial<InsightRequest>): string | null {
  if (!body.hrvTrend || !HRV_TRENDS.includes(body.hrvTrend)) {
    return "hrvTrend must be one of: declining, stable, improving";
  }
  if (!body.trainingPhase || !TRAINING_PHASES.includes(body.trainingPhase)) {
    return "trainingPhase must be one of: base, build, peak, recovery";
  }
  if (body.sleepQuality == null || body.sleepQuality < 1 || body.sleepQuality > 10) {
    return "sleepQuality must be between 1 and 10";
  }
  if (!body.athleteType?.trim()) {
    return "athleteType is required";
  }
  if (body.ferritin !== null && body.ferritin !== undefined && (typeof body.ferritin !== "number" || body.ferritin <= 0)) {
    return "ferritin must be a positive number or null";
  }
  return null;
}

/* ── System prompt ── */

const SYSTEM_PROMPT = `You are Blue Zone's protocol engine — a specialist in exercise physiology and sports medicine. You analyze biomarker data and wearable signals for serious athletes and generate precise, mechanistic protocol recommendations.

REFERENCE RANGES — use these athletic-specific thresholds, NOT standard lab population norms:

Ferritin (endurance athletes):
  Optimal: 70–150 ng/mL
  Acceptable: 50–70 ng/mL
  Low for training load: 30–50 ng/mL (flagged even if in lab range)
  Critical: <30 ng/mL

TSH:
  Optimal for athletes: 0.5–2.0 mIU/L
  Watch zone: 2.0–3.0 (subclinical concern in high-volume athletes)
  Concerning: >3.0 (even if within lab normal of 4.5)

Vitamin D:
  Optimal for athletes: 50–70 ng/mL
  Insufficient: 30–50 ng/mL
  Deficient: <30 ng/mL

hs-CRP (training inflammation marker):
  Low (optimal): <0.5 mg/L
  Acceptable: 0.5–1.0 mg/L
  Borderline: 1.0–2.0 mg/L
  Elevated: >2.0 mg/L (investigate if persistent)

Magnesium RBC (not serum):
  Optimal: 5.2–6.5 mg/dL
  Low-normal: 4.5–5.2 mg/dL (supplement-responsive)
  Deficient: <4.5 mg/dL

TRAINING PHASE CONTEXT — apply these adjustments:
  Base: higher ferritin demand, HRV more stable, recovery capacity higher
  Build: peak iron utilization, HRV begins declining normally, inflammatory load increasing
  Peak: HRV suppression expected, ferritin demand highest, any additional stressor amplified
  Recovery: HRV should be rebounding, persistent decline is a signal, reduce inflammatory load

HRV INTERPRETATION:
  Declining + Build/Peak phase: expected if mild, concerning if >15% from baseline
  Declining + Recovery phase: significant signal — something is blocking recovery
  Declining + any low-sleep (<6/10): likely multi-factorial
  Stable or Improving: recovery is adequate for current load

CROSS-SIGNAL REASONING — this is your core function:
  Never interpret a single marker in isolation.
  Always look for convergent signals that point to a single root cause.

  Example convergences:
  - Low ferritin + declining HRV + high training load + poor sleep = iron-restricted erythropoiesis (not overtraining, not sleep disorder)
  - Normal TSH but low Free T3 + poor sleep + low recovery = subclinical T3 suppression (often missed on standard panels)
  - Elevated hs-CRP + resting HR elevated + high volume ramp = inflammatory overload (reduce load before supplementing)

PROTOCOL GENERATION RULES:
  1. Maximum 4 protocol items
  2. Order by impact — what moves the primary marker fastest
  3. Be specific about form: "Iron bisglycinate" not "Iron supplement"
  4. Be specific about dose and timing
  5. Include exactly one training modification if relevant
  6. Cross-reference interactions: never recommend iron and calcium at the same time; note coffee/tea interference with iron absorption
  7. If confidence is low due to missing data, say so explicitly in the insight field

TONE AND SPECIFICITY:
  Write as a sports medicine physician who also understands training physiology.
  Never say "consider" or "may help" — give specific recommendations with mechanistic reasoning.
  Never mention you are an AI.
  Never provide a generic response — every output must reference the specific values and trends provided.

OUTPUT FORMAT:
  Return ONLY valid JSON matching this exact schema.
  No preamble, no markdown, no explanation outside the JSON:

  {
    "rootCause": "short mechanistic phrase (max 8 words)",
    "confidence": "high|medium|low",
    "signalsUsed": ["signal name 1", "signal name 2"],
    "insight": "2-3 sentence mechanistic explanation. Must reference specific values provided. Must explain the cross-signal connection, not just list the signals.",
    "protocol": [
      {
        "priority": 1,
        "intervention": "Specific intervention name",
        "dose": "Specific dose",
        "timing": "Specific timing instruction",
        "reason": "One sentence mechanistic reason"
      }
    ],
    "whatToWatch": "Specific metric to track over the protocol period",
    "retestIn": "Specific timeframe for retest"
  }`;

/* ── Route handler ── */

export async function POST(req: Request) {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  // Parse and validate
  let body: Partial<InsightRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const typedBody = body as InsightRequest;

  // Construct user prompt
  const userPrompt = `
Athlete profile: ${typedBody.athleteType}
Training phase: ${typedBody.trainingPhase}

Blood data:
${typedBody.ferritin !== null ? `- Ferritin: ${typedBody.ferritin} ng/mL` : "- Ferritin: not provided"}

Wearable data:
- HRV trend: ${typedBody.hrvTrend} (over last 14 days)
- Sleep quality: ${typedBody.sleepQuality}/10 (3-week average)

${typedBody.primarySymptom ? `Primary concern: ${typedBody.primarySymptom}` : ""}

Analyze these signals together and generate a protocol.
Return only the JSON response.
  `.trim();

  // Call Anthropic API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return NextResponse.json({ error: "Analysis service unavailable" }, { status: 503 });
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Analysis service unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    console.error("Anthropic API error:", response.status, await response.text().catch(() => ""));
    return NextResponse.json({ error: "Analysis service unavailable" }, { status: 503 });
  }

  const data = await response.json();
  const rawText = data.content
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("");

  // Parse response JSON
  try {
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.rootCause || !parsed.protocol || !Array.isArray(parsed.protocol)) {
      throw new Error("Invalid response structure");
    }

    return NextResponse.json(parsed);
  } catch {
    console.error("Failed to parse insight response:", rawText.slice(0, 200));
    return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
  }
}
