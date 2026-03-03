import OpenAI from "openai";
import type {
  Biomarker,
  AIAnalysisResult,
  ParsedHealthData,
} from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Strips any PII from the data before sending to OpenAI
function sanitizeForAI(data: ParsedHealthData): ParsedHealthData {
  // Return only numeric/medical data — no names, DOBs, or identifiers
  return {
    biomarkers: data.biomarkers?.map(({ name, value, unit, reference_min, reference_max }) => ({
      name,
      value,
      unit,
      reference_min,
      reference_max,
    })),
    apple_health: data.apple_health,
    whoop: data.whoop
      ? {
          recovery: data.whoop.recovery?.slice(-30).map((r) => ({
            created_at: r.created_at,
            score: r.score,
          })),
          sleep: data.whoop.sleep?.slice(-30).map((s) => ({
            start: s.start,
            end: s.end,
            score: s.score,
          })),
        }
      : undefined,
  };
}

const SYSTEM_PROMPT = `You are a health optimization assistant. You receive structured biomarker data
extracted from a user's blood test and fitness tracker data. Your job is to:

1. Identify biomarkers that are outside optimal ranges (not just reference ranges)
2. Provide a plain-English summary of what this means for the user's health and performance
3. Return a JSON array of supplement/product recommendations, each with:
   - "product_name": specific product name to search
   - "category": "supplement" | "device" | "food" | "service"
   - "reason": one sentence explaining why (tied to a specific biomarker)
   - "search_query_iherb": optimized search string for iHerb
   - "search_query_amazon": optimized search string for Amazon
4. Return a JSON array of clinic types the user should consider visiting, with:
   - "clinic_type": e.g. "sports medicine", "functional medicine", "IV therapy"
   - "reason": why, based on their data

RULES:
- Never diagnose. Frame everything as "may support", "associated with", "worth discussing with your doctor"
- Prioritize evidence-based recommendations
- Be specific (not "take magnesium" but "magnesium glycinate 200–400mg")
- Return your response as valid JSON matching this exact schema:
{
  "summary": "plain English paragraph",
  "product_recommendations": [...],
  "clinic_recommendations": [...]
}`;

export async function analyzeHealthData(
  data: ParsedHealthData
): Promise<AIAnalysisResult> {
  const sanitized = sanitizeForAI(data);

  const userContent = `USER DATA:
${JSON.stringify(sanitized, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content) as AIAnalysisResult;
}

// Classify biomarker status based on reference ranges
export function classifyBiomarkerStatus(
  value: number,
  refMin: number | null,
  refMax: number | null
): Biomarker["status"] {
  if (refMin === null || refMax === null) return "normal";
  const range = refMax - refMin;
  const criticalBuffer = range * 0.2;

  if (value < refMin - criticalBuffer || value > refMax + criticalBuffer) {
    return "critical";
  }
  if (value < refMin) return "low";
  if (value > refMax) return "high";
  return "normal";
}
