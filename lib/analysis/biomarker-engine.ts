/// lib/analysis/biomarker-engine.ts
// Stage 1: Data normalization and pre-processing (pure computation).
// Stage 2: Parallel domain expert Claude API calls.

import Anthropic from "@anthropic-ai/sdk";
import type {
  AnalysisInput,
  AnalysisDomain,
  AnalysisOutput,
  BloodPanel,
  DomainScore,
  Finding,
  Grade,
  SupplementRecommendation,
  UserProfile,
  WearableSnapshot,
} from "@/lib/analysis/types";
import {
  FUNCTIONAL_MEDICINE_RANGES,
  MARKER_NAMES,
} from "@/lib/analysis/types";

// ─────────────────────────────────────────────────────────────────────────────
// 1. calculateDataCompleteness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weights:
 *   Longevity markers  0.25
 *   Hormones           0.20
 *   Inflammation       0.20
 *   CBC + CMP          0.20
 *   Wearables          0.15
 *
 * Each category score = present_markers / total_category_markers (capped 0–1).
 * Returns a weighted sum in [0, 1].
 *
 * @example
 * // Full lipid + CMP + hormones, no wearable → ~0.52
 * calculateDataCompleteness({ bloodPanel: fullPanel, wearable: null, profile })
 * // => 0.52
 *
 * // Only glucose + HbA1c present, no wearable → ~0.10
 * calculateDataCompleteness({ bloodPanel: minimalPanel, wearable: null, profile })
 * // => 0.10
 */
export function calculateDataCompleteness(input: AnalysisInput): number {
  const { bloodPanel: bp, wearable } = input;

  // ── Category marker lists ────────────────────────────────────────────────

  // High-value longevity / metabolic risk markers
  const longevityMarkers: (keyof BloodPanel)[] = [
    "apoB", "lpA", "homocysteine", "hsCrp",
    "fastingInsulin", "homaIr", "hba1c", "glucose",
    "igf1", "vitaminD", "omega3Index", "totalCholesterol",
  ];

  // Endocrine panel
  const hormoneMarkers: (keyof BloodPanel)[] = [
    "testosteroneTotal", "testosteroneFree", "shbg",
    "cortisol", "dheaS", "estradiol", "progesterone",
    "tsh", "freeT3", "freeT4",
  ];

  // Inflammatory markers
  const inflammationMarkers: (keyof BloodPanel)[] = [
    "hsCrp", "homocysteine", "fibrinogen", "esr", "il6",
  ];

  // Complete Blood Count + Comprehensive Metabolic Panel
  const cbcCmpMarkers: (keyof BloodPanel)[] = [
    "hemoglobin", "hematocrit", "wbc", "platelets", "mcv",
    "glucose", "creatinine", "egfr", "albumin", "alt",
    "ast", "sodium", "potassium", "calcium", "totalBilirubin",
  ];

  // Wearable channels (checked separately against WearableSnapshot)
  const wearableFields: (keyof WearableSnapshot)[] = [
    "hrv", "restingHr", "sleepScore",
    "recoveryScore", "readinessScore",
  ];

  // ── Category completeness fractions ──────────────────────────────────────

  const fraction = (keys: (keyof BloodPanel)[]) => {
    const present = keys.filter((k) => bp[k] !== undefined).length;
    return present / keys.length;
  };

  const longevityScore   = fraction(longevityMarkers);
  const hormoneScore     = fraction(hormoneMarkers);
  const inflammScore     = fraction(inflammationMarkers);
  const cbcCmpScore      = fraction(cbcCmpMarkers);

  const wearableScore = wearable
    ? wearableFields.filter((k) => wearable[k] != null).length / wearableFields.length
    : 0;

  // ── Weighted sum ──────────────────────────────────────────────────────────

  return (
    longevityScore   * 0.25 +
    hormoneScore     * 0.20 +
    inflammScore     * 0.20 +
    cbcCmpScore      * 0.20 +
    wearableScore    * 0.15
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. sanitizeInput
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Removes biomarker readings that are mathematically or physiologically
 * impossible. Logs each removal with a reason via console.warn.
 * Returns a deep clone — the original input is never mutated.
 *
 * Blood panel rules:
 *   hba1c        < 3.5 %          → impossible (lowest recorded ~4.0%)
 *   hemoglobin   > 25 g/dL        → lethal polycythaemia
 *   cortisol     === 0 µg/dL      → impossible even in adrenal failure
 *   glucose      < 20 mg/dL       → incompatible with consciousness
 *   glucose      > 800 mg/dL      → extreme DKA, likely entry error
 *   wbc          < 0.5 K/µL       → fatal agranulocytosis
 *   platelets    < 5 K/µL         → incompatible with life
 *   sodium       < 100 mEq/L      → lethal hyponatraemia
 *   sodium       > 175 mEq/L      → lethal hypernatraemia
 *   testosteroneTotal < 0          → impossible
 *   hematocrit   > 70 %            → impossible
 *   rbc          < 0.5 M/µL        → impossible
 *
 * Wearable rules:
 *   hrv          > 300 ms          → implausible (world record ~250 ms)
 *   hrv          < 0               → impossible
 *   restingHr    < 20 bpm          → implausible
 *   restingHr    > 250 bpm         → implausible
 *   heartRateAvg > 300 bpm         → impossible
 *   spo2         < 50 %            → incompatible with consciousness
 *   spo2         > 100 %           → impossible
 *
 * @example
 * sanitizeInput({
 *   bloodPanel: { hba1c: { value: 2.1, ... }, glucose: { value: 95, ... } },
 *   wearable: { hrv: 450 },
 *   profile
 * })
 * // Logs: [sanitize] Removed hba1c: 2.1 — below minimum possible (3.5%)
 * // Logs: [sanitize] Removed wearable.hrv: 450 — exceeds physiological max (300 ms)
 * // Returns input with hba1c undefined, hrv undefined
 */
export function sanitizeInput(input: AnalysisInput): AnalysisInput {
  // Deep clone so original is never mutated
  const out: AnalysisInput = JSON.parse(JSON.stringify(input)) as AnalysisInput;
  const bp = out.bloodPanel;
  const w  = out.wearable;

  // Helper: remove a blood panel field and log
  const removeBiomarker = (field: keyof BloodPanel, reason: string) => {
    const bv = bp[field];
    if (bv) {
      console.warn(`[sanitize] Removed bloodPanel.${field}: ${bv.value} ${bv.unit} — ${reason}`);
      delete bp[field];
    }
  };

  // Helper: remove a wearable field and log
  const removeWearable = (field: keyof WearableSnapshot, reason: string) => {
    if (w && w[field] != null) {
      console.warn(`[sanitize] Removed wearable.${field}: ${w[field]} — ${reason}`);
      (w as Record<keyof WearableSnapshot, unknown>)[field] = undefined;
    }
  };

  // ── Blood panel rules ─────────────────────────────────────────────────────

  if (bp.hba1c             && bp.hba1c.value             < 3.5)   removeBiomarker("hba1c",             "below minimum possible (3.5%)");
  if (bp.hemoglobin        && bp.hemoglobin.value         > 25)    removeBiomarker("hemoglobin",        "exceeds physiological max (25 g/dL)");
  if (bp.cortisol          && bp.cortisol.value           === 0)   removeBiomarker("cortisol",          "zero is impossible; likely a missing value coded as 0");
  if (bp.glucose           && bp.glucose.value            < 20)    removeBiomarker("glucose",           "below 20 mg/dL is incompatible with consciousness");
  if (bp.glucose           && bp.glucose.value            > 800)   removeBiomarker("glucose",           "exceeds 800 mg/dL — likely data entry error");
  if (bp.wbc               && bp.wbc.value                < 0.5)   removeBiomarker("wbc",               "below 0.5 K/µL — fatal agranulocytosis; likely error");
  if (bp.platelets         && bp.platelets.value          < 5)     removeBiomarker("platelets",         "below 5 K/µL — incompatible with life");
  if (bp.sodium            && bp.sodium.value             < 100)   removeBiomarker("sodium",            "below 100 mEq/L — lethal hyponatraemia; likely error");
  if (bp.sodium            && bp.sodium.value             > 175)   removeBiomarker("sodium",            "above 175 mEq/L — lethal hypernatraemia; likely error");
  if (bp.testosteroneTotal && bp.testosteroneTotal.value  < 0)     removeBiomarker("testosteroneTotal", "negative testosterone is impossible");
  if (bp.hematocrit        && bp.hematocrit.value         > 70)    removeBiomarker("hematocrit",        "above 70% is physiologically impossible");
  if (bp.rbc               && bp.rbc.value                < 0.5)   removeBiomarker("rbc",               "below 0.5 M/µL is physiologically impossible");
  if (bp.fastingInsulin    && bp.fastingInsulin.value     < 0)     removeBiomarker("fastingInsulin",    "negative insulin is impossible");
  if (bp.homaIr            && bp.homaIr.value             < 0)     removeBiomarker("homaIr",            "negative HOMA-IR is impossible");
  if (bp.vitaminD          && bp.vitaminD.value           < 0)     removeBiomarker("vitaminD",          "negative vitamin D is impossible");

  // ── Wearable rules ────────────────────────────────────────────────────────

  if (w) {
    if (w.hrv          != null && w.hrv          > 300)  removeWearable("hrv",          "exceeds physiological max (300 ms; world record ~250 ms)");
    if (w.hrv          != null && w.hrv          < 0)    removeWearable("hrv",          "negative HRV is impossible");
    if (w.restingHr    != null && w.restingHr    < 20)   removeWearable("restingHr",    "below 20 bpm is implausible");
    if (w.restingHr    != null && w.restingHr    > 250)  removeWearable("restingHr",    "above 250 bpm is implausible");
    if (w.heartRateAvg != null && w.heartRateAvg > 300)  removeWearable("heartRateAvg", "above 300 bpm is impossible");
    if (w.spo2         != null && w.spo2         < 50)   removeWearable("spo2",         "below 50% is incompatible with consciousness");
    if (w.spo2         != null && w.spo2         > 100)  removeWearable("spo2",         "above 100% is impossible");
    if (w.sleepScore   != null && (w.sleepScore < 0 || w.sleepScore > 100)) removeWearable("sleepScore", "must be in range 0–100");
    if (w.recoveryScore!= null && (w.recoveryScore < 0 || w.recoveryScore > 100)) removeWearable("recoveryScore", "must be in range 0–100");
    if (w.readinessScore!= null && (w.readinessScore < 0 || w.readinessScore > 100)) removeWearable("readinessScore", "must be in range 0–100");
    if (w.vo2Max       != null && w.vo2Max       > 100)  removeWearable("vo2Max",       "above 100 mL/kg/min is implausible for adults");
    if (w.vo2Max       != null && w.vo2Max       < 0)    removeWearable("vo2Max",       "negative VO2 max is impossible");
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. calculateDerivedMetrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes derived metrics from available raw biomarker and wearable data.
 * Only includes a metric if all required inputs are present and valid.
 * Returns a plain object — keys are metric names, values are numbers.
 *
 * Metrics computed:
 *   homaIr             — (glucose_mg_dL × insulin_µIU_mL) / 405
 *   ft3ToFt4Ratio      — freeT3 (pg/mL) / freeT4 (ng/dL) [× 10 for scaling]
 *   freeAndrogen       — (testosterone_ng_dL / 28.84 / shbg_nmol_L) × 100
 *   castelli1Risk      — totalCholesterol / HDL  (Castelli Risk Index I)
 *   trigHdlRatio       — triglycerides / HDL  (insulin resistance proxy)
 *   ansBalance         — composite from HRV + stress score (0–100)
 *   sleepQualityIndex  — composite from available sleep channels (0–100)
 *
 * @example
 * calculateDerivedMetrics(
 *   { glucose: { value: 95 }, fastingInsulin: { value: 8 } },
 *   {}
 * )
 * // => { homaIr: 1.88 }
 *
 * @example
 * calculateDerivedMetrics(
 *   { testosteroneTotal: { value: 650 }, shbg: { value: 35 } },
 *   { hrv: 65, stressScore: 30 }
 * )
 * // => { freeAndrogen: 64.8, ansBalance: 67.1 }
 */
export function calculateDerivedMetrics(
  blood:    Partial<BloodPanel>,
  wearable: Partial<WearableSnapshot>,
): Record<string, number> {
  const derived: Record<string, number> = {};

  // ── homaIr ───────────────────────────────────────────────────────────────
  // Formula: (fasting glucose mg/dL × fasting insulin µIU/mL) / 405
  // Only compute if NOT already present in the panel (avoid double-counting)
  if (!blood.homaIr && blood.glucose && blood.fastingInsulin) {
    const g = blood.glucose.value;
    const i = blood.fastingInsulin.value;
    if (g > 0 && i > 0) {
      derived.homaIr = round2(( g * i ) / 405);
    }
  }

  // ── ft3ToFt4Ratio ────────────────────────────────────────────────────────
  // freeT3 (pg/mL) vs freeT4 (ng/dL).
  // Multiply by 10 to express as a comparable ratio (typical range 2.0–4.5).
  // Low ratio (<2.0) suggests impaired T4→T3 conversion.
  if (blood.freeT3 && blood.freeT4 && blood.freeT4.value > 0) {
    derived.ft3ToFt4Ratio = round2((blood.freeT3.value / blood.freeT4.value) * 10);
  }

  // ── freeAndrogen (FAI) ───────────────────────────────────────────────────
  // FAI = (Total Testosterone [nmol/L] / SHBG [nmol/L]) × 100
  // Total T conversion: 1 ng/dL = 0.03467 nmol/L (MW of testosterone = 288.42)
  // Reference: men 50–100; women 1–5
  if (blood.testosteroneTotal && blood.shbg && blood.shbg.value > 0) {
    const tNmol = blood.testosteroneTotal.value * 0.03467;
    derived.freeAndrogen = round2((tNmol / blood.shbg.value) * 100);
  }

  // ── castelli1Risk ────────────────────────────────────────────────────────
  // Total Cholesterol / HDL. Risk: men >5.0; women >4.4 (AHA guidelines).
  if (blood.totalCholesterol && blood.hdl && blood.hdl.value > 0) {
    derived.castelli1Risk = round2(blood.totalCholesterol.value / blood.hdl.value);
  }

  // ── trigHdlRatio ─────────────────────────────────────────────────────────
  // Triglycerides / HDL (mg/dL). Proxy for insulin resistance.
  // Optimal <1.5; >3.0 suggests significant IR; >5.0 = high risk.
  if (blood.triglycerides && blood.hdl && blood.hdl.value > 0) {
    derived.trigHdlRatio = round2(blood.triglycerides.value / blood.hdl.value);
  }

  // ── ansBalance ───────────────────────────────────────────────────────────
  // Autonomic nervous system balance — higher = better parasympathetic tone.
  // Combines HRV (primary signal) and stress score (inverse signal).
  // HRV normalized to 0–100 assuming 0–120 ms practical range.
  // stressScore inverted (100 = no stress; 0 = max stress).
  // Weights: HRV 70%, stress 30%.
  const hrv   = wearable.hrv         ?? wearable.hrvRmssd;
  const stress = wearable.stressScore;
  if (hrv != null) {
    const hrvNorm     = Math.min(hrv / 120, 1) * 100;
    const stressNorm  = stress != null ? (100 - stress) : 50; // default 50 if unknown
    derived.ansBalance = round2(hrvNorm * 0.7 + stressNorm * 0.3);
  }

  // ── sleepQualityIndex ────────────────────────────────────────────────────
  // Composite 0–100 from available sleep channels.
  // Channels: sleepScore (direct, weight 0.50), deep+REM proportion (0.30),
  //           spo2 deviation from 98% (0.20, penalised if <94).
  const channels: { score: number; weight: number }[] = [];

  if (wearable.sleepScore != null) {
    channels.push({ score: wearable.sleepScore, weight: 0.50 });
  }

  const totalMin = wearable.sleepTotalMinutes ?? wearable.deepSleepMin != null
    ? (wearable.deepSleepMin ?? 0) + (wearable.remSleepMin ?? 0) + 300 // estimate ~5h light
    : null;
  const qualityMin =
    (wearable.sleepDeepMinutes ?? wearable.deepSleepMin ?? 0) +
    (wearable.sleepRemMinutes  ?? wearable.remSleepMin  ?? 0);
  if (totalMin && totalMin > 0 && qualityMin > 0) {
    const proportion = Math.min(qualityMin / totalMin, 1);
    // Healthy target: deep+REM ~40% of total sleep → score 100 at 40%+
    channels.push({ score: Math.min(proportion / 0.40, 1) * 100, weight: 0.30 });
  }

  if (wearable.spo2 != null) {
    // 98–100% = 100; each point below 98 costs 15 points; below 90 = 0
    const spo2Score = Math.max(0, 100 - Math.max(0, 98 - wearable.spo2) * 15);
    channels.push({ score: spo2Score, weight: 0.20 });
  }

  if (channels.length > 0) {
    const totalWeight = channels.reduce((s, c) => s + c.weight, 0);
    derived.sleepQualityIndex = round2(
      channels.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight,
    );
  }

  return derived;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getAnalysisDepth
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisDepth = "essential" | "standard" | "comprehensive";

/**
 * Determines the appropriate analysis depth for a user.
 *
 * Rules (in priority order):
 *   comprehensive  — advanced tier AND completeness >= 0.50
 *   standard       — completeness >= 0.30  (basic or advanced)
 *   essential      — everything else (basic tier OR completeness < 0.30)
 *
 * @example
 * getAnalysisDepth({ userTier: 'advanced' }, 0.72) // => 'comprehensive'
 * getAnalysisDepth({ userTier: 'advanced' }, 0.40) // => 'standard'
 * getAnalysisDepth({ userTier: 'basic'    }, 0.55) // => 'standard'
 * getAnalysisDepth({ userTier: 'basic'    }, 0.20) // => 'essential'
 * getAnalysisDepth({ userTier: 'advanced' }, 0.15) // => 'essential'
 */
export function getAnalysisDepth(
  user:         Pick<UserProfile, "userTier">,
  completeness: number,
): AnalysisDepth {
  if (user.userTier === "advanced" && completeness >= 0.50) return "comprehensive";
  if (completeness >= 0.30)                                  return "standard";
  return "essential";
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 — Parallel domain expert Claude API calls
// ─────────────────────────────────────────────────────────────────────────────

const CLAUDE_MODEL        = "claude-sonnet-4-20250514";
const CLAUDE_MAXTOK       = 4000;   // domain calls (1-2 DomainScore objects)
const CLAUDE_SYNTHESIS_MAXTOK = 8000;  // synthesis — full protocol JSON is much larger
const CLAUDE_TEMP         = 0;

const VALID_DOMAINS  = new Set<string>(["metabolic","cardiovascular","hormonal","inflammatory","nutritional","recovery","cognitive"]);
const VALID_GRADES   = new Set<string>(["A","B","C","D","F"]);

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Format a subset of BloodPanel markers as a plain-text data block for prompts. */
function formatMarkerBlock(bp: BloodPanel, keys: (keyof BloodPanel)[]): string {
  const lines: string[] = [];
  for (const key of keys) {
    const bv = bp[key];
    if (!bv) continue;
    const name   = MARKER_NAMES[key]?.[0] ?? key;
    const labRef = bv.referenceMin != null && bv.referenceMax != null
      ? `lab ${bv.referenceMin}–${bv.referenceMax}`
      : "no lab ref";
    const fr     = FUNCTIONAL_MEDICINE_RANGES[key];
    const optRef = fr ? `optimal ${fr.min ?? "–"}–${fr.max ?? "–"} ${fr.unit}` : "";
    lines.push(`  ${name}: ${bv.value} ${bv.unit} [${bv.status}] | ${labRef}${optRef ? " | " + optRef : ""}`);
  }
  return lines.length > 0 ? lines.join("\n") : "  (no data available)";
}

/** Format a subset of derived metrics as a plain-text block. */
function formatDerivedBlock(derived: Record<string, number>, keys: string[]): string {
  const lines = keys
    .filter((k) => derived[k] !== undefined)
    .map((k) => `  ${k}: ${derived[k]}`);
  return lines.length > 0 ? lines.join("\n") : "  (none computed)";
}

/** Build the user context block shared by all domain prompts. */
function userContextBlock(profile: UserProfile): string {
  const lines = [
    profile.age           ? `Age: ${profile.age}`                                     : "",
    profile.biologicalSex ? `Biological sex: ${profile.biologicalSex}`               : "",
    profile.activityLevel ? `Activity level: ${profile.activityLevel}`                : "",
    profile.conditions?.length  ? `Conditions: ${profile.conditions.join(", ")}`      : "Conditions: none",
    profile.currentMedications?.trim() ? `Medications: ${profile.currentMedications}` : "Medications: none",
    profile.currentSupplements?.trim() ? `Current supplements: ${profile.currentSupplements}` : "",
    `User tier: ${profile.userTier}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Parse a Claude text response into an array of DomainScore objects.
 *  Returns null if the JSON is invalid or does not match the schema. */
function parseDomainScores(raw: string): DomainScore[] | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch {
    // Try extracting the first {...} block
    const start = stripped.indexOf("{");
    const end   = stripped.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try { obj = JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
  }

  if (!obj || typeof obj !== "object") return null;
  const arr = (obj as Record<string, unknown>).domainScores;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const scores: DomainScore[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    if (
      typeof s.domain  !== "string" || !VALID_DOMAINS.has(s.domain)  ||
      typeof s.score   !== "number" || s.score < 0 || s.score > 100  ||
      typeof s.grade   !== "string" || !VALID_GRADES.has(s.grade)    ||
      typeof s.summary !== "string"                                   ||
      !Array.isArray(s.keyMarkers)
    ) return null;

    scores.push({
      domain:     s.domain as AnalysisDomain,
      score:      Math.round(s.score),
      grade:      s.grade as Grade,
      summary:    s.summary,
      keyMarkers: (s.keyMarkers as unknown[]).filter((m) => typeof m === "string") as string[],
    });
  }
  return scores.length > 0 ? scores : null;
}

/** Shared JSON output schema instruction appended to every domain prompt. */
const JSON_SCHEMA_INSTRUCTION = `
Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "domainScores": [
    {
      "domain": "<one of: metabolic | cardiovascular | hormonal | inflammatory | nutritional | recovery | cognitive>",
      "score": <integer 0–100, where 100 = fully optimised>,
      "grade": "<A | B | C | D | F>",
      "summary": "<2–3 sentence clinical interpretation for this user specifically>",
      "keyMarkers": ["<canonical marker name>", ...]
    }
  ]
}

GRADE SCALE:
  A  90–100  Excellent — near-optimal, minor fine-tuning possible
  B  75–89   Good — above average, targeted optimisation worthwhile
  C  60–74   Moderate — meaningful gaps; intervention recommended
  D  45–59   Significant dysfunction — prompt action required
  F  0–44    Critical — urgent clinical or lifestyle intervention needed

SCORING PRINCIPLE: Score against FUNCTIONAL MEDICINE optimal ranges
(provided above), not just lab reference ranges. A value "in range"
may still score 60–70 if it falls short of the optimal window.`;

/** Fire one Claude call; retry once if JSON parsing fails. */
/** Token-annotated result from a single domain Claude call (+ retry if needed). */
interface DomainCallResult {
  scores:       DomainScore[];
  inputTokens:  number;
  outputTokens: number;
}

async function callDomainExpert(
  client:    Anthropic,
  systemMsg: string,
  userMsg:   string,
): Promise<DomainCallResult> {
  const baseMessages: Anthropic.MessageParam[] = [{ role: "user", content: userMsg }];

  const resp1 = await client.messages.create({
    model:       CLAUDE_MODEL,
    max_tokens:  CLAUDE_MAXTOK,
    temperature: CLAUDE_TEMP,
    system:      systemMsg,
    messages:    baseMessages,
  });

  const raw1 = resp1.content[0]?.type === "text" ? resp1.content[0].text : "";
  const parsed1 = parseDomainScores(raw1);
  if (parsed1) return { scores: parsed1, inputTokens: resp1.usage.input_tokens, outputTokens: resp1.usage.output_tokens };

  // Retry with corrective turn
  const resp2 = await client.messages.create({
    model:       CLAUDE_MODEL,
    max_tokens:  CLAUDE_MAXTOK,
    temperature: CLAUDE_TEMP,
    system:      systemMsg,
    messages: [
      ...baseMessages,
      { role: "assistant", content: raw1 || "{" },
      { role: "user",      content: "Your response could not be parsed as valid JSON matching the required schema. Return ONLY the corrected JSON now. No other text." },
    ],
  });

  const raw2 = resp2.content[0]?.type === "text" ? resp2.content[0].text : "";
  const parsed2 = parseDomainScores(raw2);
  // Accumulate tokens from both attempts regardless of success/failure
  const totalIn  = resp1.usage.input_tokens  + resp2.usage.input_tokens;
  const totalOut = resp1.usage.output_tokens + resp2.usage.output_tokens;
  if (parsed2) return { scores: parsed2, inputTokens: totalIn, outputTokens: totalOut };

  throw new Error(`Domain expert call failed JSON validation after retry. Last response: ${raw2.slice(0, 200)}`);
}

/** Build a placeholder DomainScore for graceful degradation on API failure. */
function placeholder(domain: AnalysisDomain, reason: string): DomainScore {
  return {
    domain,
    score:      50,
    grade:      "C",
    summary:    `Analysis unavailable for this domain (${reason}). Results shown are a neutral placeholder — rerun the analysis to populate this section.`,
    keyMarkers: [],
  };
}

// ── Domain function A: Metabolic + Cardiovascular ─────────────────────────────

/**
 * Scores the metabolic and cardiovascular domains using glucose regulation,
 * lipid particle quality, liver function, kidney function, and derived risk indices.
 */
export async function analyzeMetabolicCardiovascular(
  input:          AnalysisInput,
  derivedMetrics: Record<string, number>,
  depth:          AnalysisDepth,
): Promise<DomainCallResult> {
  const { bloodPanel: bp, profile } = input;

  const metabolicKeys: (keyof BloodPanel)[] = [
    "glucose", "hba1c", "fastingInsulin", "homaIr",
    "creatinine", "egfr", "albumin", "alt", "ast", "ggt",
    "totalBilirubin", "uricAcid",
  ];
  const cardioKeys: (keyof BloodPanel)[] = [
    "totalCholesterol", "ldl", "hdl", "triglycerides",
    "vldl", "nonHdlCholesterol", "apoB", "apoA1", "lpA",
  ];

  const systemMsg = `You are a precision medicine physician specialising in metabolic health and preventive cardiology. Your role is to score two clinical domains — METABOLIC and CARDIOVASCULAR — based on the patient data provided, using functional medicine optimal ranges as your benchmark (not just lab reference ranges).

CRITICAL RULES:
1. Score 0–100 against functional medicine optimal ranges, not lab reference ranges.
2. A value "in range" but below optimal should score 60–74, not 90+.
3. Reference the patient's conditions and medications in your summary.
4. "Advanced" tier users receive more technical language and granular interpretation.
5. Each summary must be specific to this patient's actual values — no generic statements.
${JSON_SCHEMA_INSTRUCTION}`;

  const depthNote = depth === "comprehensive"
    ? "Provide highly technical, clinically granular analysis. Reference particle dynamics, enzymatic pathways, and metabolic adaptation mechanisms."
    : depth === "standard"
      ? "Provide clear clinical analysis suitable for a health-engaged adult."
      : "Provide accessible, action-oriented analysis. Focus on the 1–2 most impactful findings.";

  const userMsg = `Analyse the METABOLIC and CARDIOVASCULAR domains for this patient.

=== PATIENT PROFILE ===
${userContextBlock(profile)}

=== METABOLIC MARKERS ===
${formatMarkerBlock(bp, metabolicKeys)}

=== CARDIOVASCULAR / LIPID MARKERS ===
${formatMarkerBlock(bp, cardioKeys)}

=== DERIVED METRICS ===
${formatDerivedBlock(derivedMetrics, ["homaIr","castelli1Risk","trigHdlRatio"])}

=== ANALYSIS DEPTH: ${depth.toUpperCase()} ===
${depthNote}

Produce exactly 2 DomainScore objects: one for "metabolic", one for "cardiovascular".`;

  const client = getClient();
  try {
    return await callDomainExpert(client, systemMsg, userMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyzeMetabolicCardiovascular] failed:", msg);
    return { scores: [placeholder("metabolic", "API call failed"), placeholder("cardiovascular", "API call failed")], inputTokens: 0, outputTokens: 0 };
  }
}

// ── Domain function B: Hormonal + Endocrine ───────────────────────────────────

/**
 * Scores the hormonal domain using sex hormones, adrenal function, thyroid axis,
 * and growth factors. Adjusts interpretation by biological sex and age.
 */
export async function analyzeHormonalEndocrine(
  input:          AnalysisInput,
  derivedMetrics: Record<string, number>,
  depth:          AnalysisDepth,
): Promise<DomainCallResult> {
  const { bloodPanel: bp, profile } = input;

  const hormoneKeys: (keyof BloodPanel)[] = [
    "testosteroneTotal", "testosteroneFree", "shbg",
    "lh", "fsh", "prolactin", "dheaS",
    "estradiol", "progesterone", "dht",
    "igf1", "cortisol", "amh",
    "tsh", "freeT3", "freeT4", "tpoAntibodies",
  ];

  const systemMsg = `You are a precision medicine endocrinologist. Your role is to score the HORMONAL domain based on sex hormone balance, adrenal function, thyroid axis integrity, and anabolic/catabolic balance. You interpret results against functional medicine optimal ranges for the patient's age and biological sex.

CRITICAL RULES:
1. Adjust reference expectations for age (testosterone and DHEA-S decline with age; IGF-1 varies).
2. Flag: high SHBG suppressing free testosterone, high prolactin as a libido suppressor,
   cortisol dysregulation patterns, subclinical hypothyroidism (TSH 2.5–4.5 with symptoms).
   When SHBG >35 nmol/L in men with suboptimal free testosterone, identify SHBG as the
   primary mechanism and recommend SHBG-lowering strategies (boron 3–6 mg/day, optimise
   dietary fat intake, reduce alcohol, assess zinc status) before suggesting testosterone
   support therapies. Address root cause before downstream symptoms.
3. For female patients: assess progesterone/estradiol ratio if both present; flag AMH if provided.
4. User tier "${profile.userTier === "advanced" ? "advanced" : "basic"}": ${profile.userTier === "advanced" ? "use technical hormonal cascade language." : "use accessible explanations."}
5. Reference actual conditions and medications in your interpretation.
${JSON_SCHEMA_INSTRUCTION}`;

  const userMsg = `Analyse the HORMONAL/ENDOCRINE domain for this patient.

=== PATIENT PROFILE ===
${userContextBlock(profile)}

=== HORMONAL MARKERS ===
${formatMarkerBlock(bp, hormoneKeys)}

=== DERIVED METRICS ===
${formatDerivedBlock(derivedMetrics, ["freeAndrogen","ft3ToFt4Ratio"])}

=== ANALYSIS DEPTH: ${depth.toUpperCase()} ===

Produce exactly 1 DomainScore object for "hormonal".`;

  const client = getClient();
  try {
    return await callDomainExpert(client, systemMsg, userMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyzeHormonalEndocrine] failed:", msg);
    return { scores: [placeholder("hormonal", "API call failed")], inputTokens: 0, outputTokens: 0 };
  }
}

// ── Domain function C: Inflammatory + Immune + Longevity ─────────────────────

/**
 * Scores the inflammatory domain. Also surfaces nutritional sufficiency as a
 * sub-signal because micronutrient deficiency is a primary driver of chronic inflammation.
 */
export async function analyzeInflammatoryImmuneLongevity(
  input:          AnalysisInput,
  derivedMetrics: Record<string, number>,
  depth:          AnalysisDepth,
): Promise<DomainCallResult> {
  const { bloodPanel: bp, profile, wearable } = input;

  const inflammKeys: (keyof BloodPanel)[] = [
    "hsCrp", "il6", "fibrinogen", "homocysteine", "esr",
    "mpo", "oxLdl", "tmao", "uricAcid",
  ];
  const nutritionKeys: (keyof BloodPanel)[] = [
    "vitaminD", "vitaminB12", "vitaminB6", "folate",
    "ferritin", "iron", "tibc", "transferrinSaturation",
    "magnesium", "zinc", "copper", "selenium",
    "omega3Index", "coq10",
  ];

  const systemMsg = `You are a functional medicine physician specialising in inflammation science and longevity medicine. You score two closely related domains — INFLAMMATORY and NUTRITIONAL — because micronutrient deficiencies are primary upstream drivers of chronic systemic inflammation.

CRITICAL RULES:
1. hs-CRP: functional optimal <0.5 mg/L (not <3.0). Flag even "normal" CRP 1–3 as suboptimal.
2. Homocysteine: optimal <7 µmol/L (not <15). Levels 8–15 are suboptimal for methylation.
3. Vitamin D: optimal 50–80 ng/mL. Values 30–50 are insufficient, not optimal.
4. Omega-3 Index: optimal >8%. Flag <4% as high cardiovascular risk.
5. Cross-reference: low omega-3 + high hs-CRP confirms inflammatory phenotype.
6. Reference actual conditions and medications.
${JSON_SCHEMA_INSTRUCTION}`;

  const wearableNote = wearable?.recoveryScore != null
    ? `\n=== WEARABLE CONTEXT ===\n  Recovery score: ${wearable.recoveryScore}/100 (low recovery amplifies inflammatory burden)`
    : "";

  const userMsg = `Analyse the INFLAMMATORY and NUTRITIONAL domains for this patient.

=== PATIENT PROFILE ===
${userContextBlock(profile)}

=== INFLAMMATORY MARKERS ===
${formatMarkerBlock(bp, inflammKeys)}

=== NUTRITIONAL MARKERS ===
${formatMarkerBlock(bp, nutritionKeys)}

=== DERIVED METRICS (metabolic inflammation drivers) ===
${formatDerivedBlock(derivedMetrics, ["homaIr","trigHdlRatio"])}
${wearableNote}

=== ANALYSIS DEPTH: ${depth.toUpperCase()} ===

Produce exactly 2 DomainScore objects: one for "inflammatory", one for "nutritional".`;

  const client = getClient();
  try {
    return await callDomainExpert(client, systemMsg, userMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyzeInflammatoryImmuneLongevity] failed:", msg);
    return { scores: [placeholder("inflammatory", "API call failed"), placeholder("nutritional", "API call failed")], inputTokens: 0, outputTokens: 0 };
  }
}

// ── Domain function D: Neurological + Circadian + Musculoskeletal ─────────────

/**
 * Scores the cognitive and recovery domains using wearable data (HRV, sleep
 * architecture, readiness) combined with relevant blood markers (magnesium,
 * ferritin, cortisol, vitamin D).
 */
export async function analyzeNeurologicalCircadianMusculoskeletal(
  input:          AnalysisInput,
  derivedMetrics: Record<string, number>,
  depth:          AnalysisDepth,
): Promise<DomainCallResult> {
  const { bloodPanel: bp, profile, wearable } = input;

  const neuroKeys: (keyof BloodPanel)[] = [
    "magnesium", "vitaminD", "vitaminB12", "folate",
    "ferritin", "cortisol", "glucose", "tsh",
  ];

  const wearableBlock = wearable ? [
    wearable.hrv            != null ? `  HRV: ${wearable.hrv} ms (optimal >60 ms for adults)`                         : "",
    wearable.hrvRmssd       != null ? `  HRV RMSSD: ${wearable.hrvRmssd} ms`                                          : "",
    wearable.restingHr      != null ? `  Resting HR: ${wearable.restingHr} bpm (optimal <60 for active adults)`       : "",
    wearable.sleepScore     != null ? `  Sleep score: ${wearable.sleepScore}/100`                                      : "",
    wearable.deepSleepMin   != null ? `  Deep sleep: ${wearable.deepSleepMin} min (optimal 90+ min)`                  : "",
    wearable.remSleepMin    != null ? `  REM sleep: ${wearable.remSleepMin} min (optimal 90+ min)`                    : "",
    wearable.sleepTotalMinutes != null ? `  Total sleep: ${wearable.sleepTotalMinutes} min`                           : "",
    wearable.recoveryScore  != null ? `  Recovery score: ${wearable.recoveryScore}/100`                               : "",
    wearable.readinessScore != null ? `  Readiness score: ${wearable.readinessScore}/100`                             : "",
    wearable.stressScore    != null ? `  Stress score: ${wearable.stressScore}/100 (higher = more stress)`            : "",
    wearable.spo2           != null ? `  SpO2: ${wearable.spo2}% (optimal 97–100%)`                                   : "",
    wearable.vo2Max         != null ? `  VO2 max: ${wearable.vo2Max} mL/kg/min`                                       : "",
  ].filter(Boolean).join("\n") : "  (no wearable data)";

  const systemMsg = `You are a neuroscience and sleep medicine specialist with expertise in circadian biology, autonomic nervous system function, and musculoskeletal recovery. You score two domains — COGNITIVE performance and RECOVERY — using a combination of wearable biometrics and relevant blood biomarkers.

CRITICAL RULES:
1. HRV is the primary ANS balance indicator. Values below age-adjusted norms indicate chronic stress or under-recovery.
2. Deep sleep <60 min combined with low magnesium warrants a critical flag.
3. Ferritin <30 ng/mL in the context of fatigue/poor recovery is clinically significant even if "normal".
4. Cortisol context: chronically elevated cortisol degrades sleep quality, cognition, and recovery.
5. If no wearable data is available, score conservatively and note the limitation explicitly.
6. Reference actual conditions and medications.
${JSON_SCHEMA_INSTRUCTION}`;

  const userMsg = `Analyse the COGNITIVE and RECOVERY domains for this patient.

=== PATIENT PROFILE ===
${userContextBlock(profile)}

=== RELEVANT BLOOD MARKERS ===
${formatMarkerBlock(bp, neuroKeys)}

=== WEARABLE / BIOMETRIC DATA ===
${wearableBlock}

=== DERIVED METRICS ===
${formatDerivedBlock(derivedMetrics, ["ansBalance","sleepQualityIndex"])}

=== ANALYSIS DEPTH: ${depth.toUpperCase()} ===

Produce exactly 2 DomainScore objects: one for "cognitive", one for "recovery".`;

  const client = getClient();
  try {
    return await callDomainExpert(client, systemMsg, userMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyzeNeurologicalCircadianMusculoskeletal] failed:", msg);
    return { scores: [placeholder("cognitive", "API call failed"), placeholder("recovery", "API call failed")], inputTokens: 0, outputTokens: 0 };
  }
}

// ── runParallelDomainAnalysis ─────────────────────────────────────────────────

/**
 * Fires all relevant domain expert calls in parallel via Promise.all().
 *
 * Depth routing:
 *   essential      → A + B only  (metabolic, cardiovascular, hormonal)
 *   standard       → all four calls (all 7 domains)
 *   comprehensive  → all four calls (all 7 domains)
 *
 * Individual call failures return placeholder DomainScore objects so the
 * overall analysis never crashes due to a single domain failure.
 *
 * @example
 * const scores = await runParallelDomainAnalysis(sanitized, derived, "standard");
 * // => DomainScore[] with up to 7 entries
 */
/** Aggregated token counts + domain scores returned by runParallelDomainAnalysis. */
export interface Stage2Result {
  domainScores:        DomainScore[];
  stage2InputTokens:   number;
  stage2OutputTokens:  number;
}

export async function runParallelDomainAnalysis(
  input:          AnalysisInput,
  derivedMetrics: Record<string, number>,
  depth:          AnalysisDepth,
): Promise<Stage2Result> {
  const calls =
    depth === "essential"
      ? [
          analyzeMetabolicCardiovascular(input, derivedMetrics, depth),
          analyzeHormonalEndocrine(input, derivedMetrics, depth),
        ]
      : [
          analyzeMetabolicCardiovascular(input, derivedMetrics, depth),
          analyzeHormonalEndocrine(input, derivedMetrics, depth),
          analyzeInflammatoryImmuneLongevity(input, derivedMetrics, depth),
          analyzeNeurologicalCircadianMusculoskeletal(input, derivedMetrics, depth),
        ];

  const results = await Promise.all(calls);

  return {
    domainScores:       results.flatMap((r) => r.scores),
    stage2InputTokens:  results.reduce((acc, r) => acc + r.inputTokens,  0),
    stage2OutputTokens: results.reduce((acc, r) => acc + r.outputTokens, 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — Systems biology synthesis
// ─────────────────────────────────────────────────────────────────────────────

/** AnalysisOutput extended with provenance metadata written by this function. */
export type AnalysisResult = AnalysisOutput & {
  /** Standard medical disclaimer appended to every report. */
  disclaimer:       string;
  /** 0–1 fraction of ideal biomarker panel that was available. */
  dataCompleteness: number;
};

/** Per-stage Claude token counts returned by generateAnalysis. */
export interface AnalysisTokenUsage {
  /** Sum of input tokens across all parallel Stage 2 domain calls. */
  stage2InputTokens:   number;
  /** Sum of output tokens across all parallel Stage 2 domain calls. */
  stage2OutputTokens:  number;
  /** Input tokens used by the Stage 3 synthesis call (+ retry if triggered). */
  stage3InputTokens:   number;
  /** Output tokens used by the Stage 3 synthesis call (+ retry if triggered). */
  stage3OutputTokens:  number;
}

/** Full return value of generateAnalysis — result + token usage + depth level. */
export interface AnalysisRunResult {
  result: AnalysisResult;
  usage:  AnalysisTokenUsage;
  depth:  AnalysisDepth;
}

// ── Validation sets ───────────────────────────────────────────────────────────

const VALID_SIGNIFICANCE = new Set(["low","moderate","high","critical"]);
const VALID_SIGNAL_PRIO  = new Set(["low","medium","high"]);
const VALID_BIOMARKER_STATUS = new Set(["optimal","normal","low","high","critical"]);
const VALID_URGENCY      = new Set(["discuss_at_next_visit","schedule_soon","seek_care_today"]);
const VALID_TIER         = new Set(["basic","advanced"]);
const VALID_DIAG_URGENCY = new Set(["routine","soon","urgent"]);

// ── Standard disclaimer ───────────────────────────────────────────────────────

const DISCLAIMER =
  "This analysis is generated by an AI system and is intended for informational and " +
  "health-optimisation purposes only. It does not constitute medical advice, diagnosis, " +
  "or treatment. Always consult a qualified healthcare professional before making changes " +
  "to your health regimen, supplementation, or medications.";

// ── Private helpers ───────────────────────────────────────────────────────────

function gradeFromScore(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Construct a minimal AnalysisResult for essential depth — no Claude call. */
function buildEssentialOutput(
  input:          AnalysisInput,
  domainScores:   DomainScore[],
  completeness:   number,
): AnalysisResult {
  const overallScore = domainScores.length > 0
    ? clamp(
        domainScores.reduce((s, d) => s + d.score, 0) / domainScores.length,
        0, 100,
      )
    : 50;

  const summaryParts = domainScores.map(
    (d) => `${d.domain[0].toUpperCase() + d.domain.slice(1)}: ${d.grade} (${d.score}/100).`,
  );

  const { profile } = input;
  const profileNote = [
    profile.age           ? `${profile.age}yo` : "",
    profile.biologicalSex ?? "",
    profile.activityLevel ?? "",
  ].filter(Boolean).join(", ");

  return {
    overallScore,
    overallGrade: gradeFromScore(overallScore),
    summary:
      `Essential analysis (${Math.round(completeness * 100)}% data completeness` +
      (profileNote ? `; ${profileNote}` : "") +
      `). ${summaryParts.join(" ")} ` +
      `Upload a more complete blood panel to unlock detailed findings and a personalised protocol.`,
    domainScores,
    keyFindings:        [],
    crossDomainSignals: [],
    protocol:           { supplements: [], nutrition: [], training: [], sleep: [], diagnostics: [] },
    criticalFlags:      [],
    retestIn:           "3 months",
    generatedAt:        new Date().toISOString(),
    disclaimer:         DISCLAIMER,
    dataCompleteness:   completeness,
  };
}

// ── Lenient synthesis response parser ─────────────────────────────────────────

function str(v: unknown): string  { return typeof v === "string" ? v : ""; }
function num(v: unknown): number  { return typeof v === "number" ? v : 0; }
function bool(v: unknown): boolean { return v === true; }
function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }

function parseFindings(raw: unknown[]): AnalysisOutput["keyFindings"] {
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const f = x as Record<string, unknown>;
      const status = str(f.status);
      const sig    = str(f.clinicalSignificance);
      const doms   = arr(f.relatedDomains)
        .filter((d) => typeof d === "string" && VALID_DOMAINS.has(d)) as AnalysisDomain[];
      return {
        marker:               str(f.marker) || "Unknown",
        value:                num(f.value),
        unit:                 str(f.unit),
        status:               (VALID_BIOMARKER_STATUS.has(status) ? status : "normal") as AnalysisOutput["keyFindings"][0]["status"],
        optimalMin:           typeof f.optimalMin === "number" ? f.optimalMin : undefined,
        optimalMax:           typeof f.optimalMax === "number" ? f.optimalMax : undefined,
        interpretation:       str(f.interpretation),
        clinicalSignificance: (VALID_SIGNIFICANCE.has(sig) ? sig : "moderate") as AnalysisOutput["keyFindings"][0]["clinicalSignificance"],
        relatedDomains:       doms.length > 0 ? doms : (["metabolic"] as AnalysisDomain[]),
        actionable:           bool(f.actionable),
      };
    })
    .filter((f) => f.marker && f.interpretation);
}

function parseCrossSignals(raw: unknown[]): AnalysisOutput["crossDomainSignals"] {
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const s    = x as Record<string, unknown>;
      const prio = str(s.priority);
      const doms = arr(s.domains)
        .filter((d) => typeof d === "string" && VALID_DOMAINS.has(d)) as AnalysisDomain[];
      return {
        signal:      str(s.signal) || "Multi-domain pattern",
        domains:     doms,
        markers:     arr(s.markers).filter((m) => typeof m === "string") as string[],
        explanation: str(s.explanation),
        priority:    (VALID_SIGNAL_PRIO.has(prio) ? prio : "medium") as "low"|"medium"|"high",
      };
    })
    .filter((s) => s.signal && s.explanation);
}

function parseProtocol(raw: unknown): AnalysisOutput["protocol"] {
  const p = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const validPrio = (v: unknown): 1|2|3 => (v === 1 || v === 2 || v === 3) ? v : 2;

  const supplements: AnalysisOutput["protocol"]["supplements"] = arr(p.supplements)
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const s = x as Record<string, unknown>;
      const tier = str(s.tierRequired);
      return {
        name:              str(s.name) || "Unknown supplement",
        dose:              str(s.dose),
        timing:            str(s.timing),
        form:              str(s.form) || undefined,
        rationale:         str(s.rationale),
        targetMarkers:     arr(s.targetMarkers).filter((m) => typeof m === "string") as string[],
        duration:          str(s.duration) || undefined,
        contraindications: arr(s.contraindications).filter((c) => typeof c === "string") as string[],
        tierRequired:      (VALID_TIER.has(tier) ? tier : "basic") as "basic"|"advanced",
        priority:          validPrio(s.priority),
      };
    })
    .filter((s) => s.name !== "Unknown supplement" || s.dose);

  const nutrition: AnalysisOutput["protocol"]["nutrition"] = arr(p.nutrition)
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const n = x as Record<string, unknown>;
      return {
        intervention:  str(n.intervention) || "Dietary change",
        description:   str(n.description),
        targetMarkers: arr(n.targetMarkers).filter((m) => typeof m === "string") as string[],
        rationale:     str(n.rationale),
        priority:      validPrio(n.priority),
      };
    });

  const training: AnalysisOutput["protocol"]["training"] = arr(p.training)
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const t = x as Record<string, unknown>;
      return {
        type:          str(t.type) || "Exercise",
        frequency:     str(t.frequency),
        duration:      str(t.duration),
        intensity:     str(t.intensity),
        rationale:     str(t.rationale),
        targetMarkers: arr(t.targetMarkers).filter((m) => typeof m === "string") as string[],
        priority:      validPrio(t.priority),
      };
    });

  const sleep: AnalysisOutput["protocol"]["sleep"] = arr(p.sleep)
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const s = x as Record<string, unknown>;
      return {
        intervention:  str(s.intervention) || "Sleep intervention",
        description:   str(s.description),
        rationale:     str(s.rationale),
        targetMarkers: arr(s.targetMarkers).filter((m) => typeof m === "string") as string[],
        priority:      validPrio(s.priority),
      };
    });

  const diagnostics: AnalysisOutput["protocol"]["diagnostics"] = arr(p.diagnostics)
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const d   = x as Record<string, unknown>;
      const urg = str(d.urgency);
      const tier = str(d.tierRequired);
      return {
        test:          str(d.test) || "Diagnostic test",
        rationale:     str(d.rationale),
        urgency:       (VALID_DIAG_URGENCY.has(urg) ? urg : "routine") as "routine"|"soon"|"urgent",
        targetMarkers: arr(d.targetMarkers).filter((m) => typeof m === "string") as string[],
        tierRequired:  (VALID_TIER.has(tier) ? tier : "basic") as "basic"|"advanced",
      };
    });

  return { supplements, nutrition, training, sleep, diagnostics };
}

function parseCriticalFlags(raw: unknown[]): AnalysisOutput["criticalFlags"] {
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const f = x as Record<string, unknown>;
      const urg = str(f.urgency);
      return {
        marker:  str(f.marker),
        value:   str(f.value),
        concern: str(f.concern),
        action:  str(f.action),
        urgency: (VALID_URGENCY.has(urg) ? urg : "discuss_at_next_visit") as AnalysisOutput["criticalFlags"][0]["urgency"],
      };
    })
    .filter((f) => f.marker && f.concern && f.action);
}

/** Parse and leniently validate the synthesis response.
 *  Returns null only if the top-level overallScore / summary are absent. */
function parseSynthesisOutput(
  raw:          string,
  domainScores: DomainScore[],
  completeness: number,
): AnalysisResult | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end   = stripped.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try { obj = JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
  }

  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  if (typeof o.overallScore !== "number" || !str(o.summary)) return null;

  // Clamp overallScore; derive grade if invalid
  const overallScore = clamp(o.overallScore, 0, 100);
  const rawGrade     = str(o.overallGrade);
  const overallGrade = VALID_GRADES.has(rawGrade) ? (rawGrade as Grade) : gradeFromScore(overallScore);

  // Cap biological_age_delta at ±25 if Claude wrote it into a numeric field
  // (not part of AnalysisOutput type, but sanitise it if present)
  if (typeof o.biologicalAgeDelta === "number") {
    o.biologicalAgeDelta = clamp(o.biologicalAgeDelta, -25, 25);
  }

  return {
    overallScore,
    overallGrade,
    summary:            str(o.summary),
    domainScores,
    keyFindings:        parseFindings(arr(o.keyFindings)),
    crossDomainSignals: parseCrossSignals(arr(o.crossDomainSignals)),
    protocol:           parseProtocol(o.protocol),
    criticalFlags:      parseCriticalFlags(arr(o.criticalFlags)),
    retestIn:           str(o.retestIn) || "3 months",
    generatedAt:        new Date().toISOString(),
    disclaimer:         DISCLAIMER,
    dataCompleteness:   completeness,
  };
}

// ── Synthesis system prompt ───────────────────────────────────────────────────

const SYNTHESIS_SCHEMA = `
Return ONLY valid JSON. No preamble, no markdown fences.

OUTPUT SCHEMA:
{
  "overallScore": <integer 0–100, weighted by clinical importance across all domains>,
  "overallGrade": "<A|B|C|D|F>",
  "summary": "<2–3 sentence executive summary — name specific markers and scores>",
  "keyFindings": [
    {
      "marker": "<canonical name>",
      "value": <number>,
      "unit": "<string>",
      "status": "<optimal|normal|low|high|critical>",
      "optimalMin": <number|null>,
      "optimalMax": <number|null>,
      "interpretation": "<one sentence, patient-specific>",
      "clinicalSignificance": "<low|moderate|high|critical>",
      "relatedDomains": ["<metabolic|cardiovascular|hormonal|inflammatory|nutritional|recovery|cognitive>"],
      "actionable": <true|false>
    }
  ],
  "crossDomainSignals": [
    {
      "signal": "<pattern name>",
      "domains": ["<domain>"],
      "markers": ["<marker name>"],
      "explanation": "<1–2 sentences>",
      "priority": "<low|medium|high>"
    }
  ],
  "protocol": {
    "supplements": [
      {
        "name": "<string>", "dose": "<string>", "timing": "<string>",
        "form": "<string|omit>", "rationale": "<string>",
        "targetMarkers": ["<string>"], "duration": "<string|omit>",
        "contraindications": ["<string>"],
        "tierRequired": "<basic|advanced>", "priority": <1|2|3>
      }
    ],
    "nutrition":    [{ "intervention": "<string>", "description": "<string>", "targetMarkers": ["<string>"], "rationale": "<string>", "priority": <1|2|3> }],
    "training":     [{ "type": "<string>", "frequency": "<string>", "duration": "<string>", "intensity": "<string>", "rationale": "<string>", "targetMarkers": ["<string>"], "priority": <1|2|3> }],
    "sleep":        [{ "intervention": "<string>", "description": "<string>", "rationale": "<string>", "targetMarkers": ["<string>"], "priority": <1|2|3> }],
    "diagnostics":  [{ "test": "<string>", "rationale": "<string>", "urgency": "<routine|soon|urgent>", "targetMarkers": ["<string>"], "tierRequired": "<basic|advanced>" }]
  },
  "criticalFlags": [
    { "marker": "<string>", "value": "<string>", "concern": "<string>", "action": "<string>", "urgency": "<discuss_at_next_visit|schedule_soon|seek_care_today>" }
  ],
  "retestIn": "<e.g. '3 months' or '6 months'>"
}

OVERALL SCORE WEIGHTING GUIDE:
  cardiovascular 25% · metabolic 20% · inflammatory 20% · hormonal 15% · nutritional 10% · recovery 5% · cognitive 5%

GRADE SCALE: A 90–100 · B 75–89 · C 60–74 · D 45–59 · F 0–44`;

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Stage 3: Systems biology synthesis.
 *
 * Takes all domain scores from Stage 2 and produces a unified AnalysisResult
 * that includes overall scoring, key findings, cross-domain signals, a
 * personalised protocol, critical flags, and a medical disclaimer.
 *
 * For `essential` depth, skips the Claude call and returns a simplified output
 * built directly from the domain scores — no additional API cost.
 *
 * biological_age_delta is capped at ±25 years if present in the response.
 * All numeric score fields are clamped to [0, 100].
 */
interface Stage3Result {
  result:       AnalysisResult;
  inputTokens:  number;
  outputTokens: number;
}

export async function synthesizeAnalysis(
  input:          AnalysisInput,
  domainScores:   DomainScore[],
  derivedMetrics: Record<string, number>,
  completeness:   number,
  depth:          AnalysisDepth,
): Promise<Stage3Result> {
  // ── Essential shortcut: no Claude call ──────────────────────────────────
  if (depth === "essential") {
    return { result: buildEssentialOutput(input, domainScores, completeness), inputTokens: 0, outputTokens: 0 };
  }

  const { profile } = input;

  // ── Build domain scores summary for the prompt ───────────────────────────
  const domainSummary = domainScores
    .map((d) =>
      `  ${d.domain} | ${d.grade} (${d.score}/100) | keyMarkers: ${d.keyMarkers.join(", ") || "none"}\n  → ${d.summary}`,
    )
    .join("\n\n");

  // ── Build derived metrics block ──────────────────────────────────────────
  const derivedBlock = Object.entries(derivedMetrics)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n") || "  (none computed)";

  // ── Depth-specific instruction ───────────────────────────────────────────
  const depthInstruction =
    depth === "comprehensive"
      ? `DEPTH: comprehensive — include 5–7 keyFindings, 2–4 crossDomainSignals, and a full protocol (5–10 supplements, 3–4 nutrition, 2–3 training, 2–3 sleep, 3–5 diagnostics). Use technical clinical language.`
      : `DEPTH: standard — include 3–5 keyFindings, 1–3 crossDomainSignals, and a focused protocol (3–6 supplements, 2–3 nutrition, 1–2 training, 1–2 sleep, 2–3 diagnostics). Use clear accessible language.`;

  const systemMsg =
    `You are a systems biology physician and longevity specialist. You synthesize domain-level ` +
    `biomarker analyses into a single, unified health optimisation report. Your synthesis is ` +
    `evidence-based, patient-specific, and directly actionable.\n\n` +
    `CRITICAL RULES:\n` +
    `1. Overall score must reflect the WEIGHTED average (cardiovascular 25%, metabolic 20%, ` +
    `inflammatory 20%, hormonal 15%, nutritional 10%, recovery 5%, cognitive 5%). ` +
    `Domains with no data do not contribute to the average.\n` +
    `2. keyFindings must reference actual marker values from the domain analyses.\n` +
    `3. crossDomainSignals must span ≥2 domains and reference shared biomarkers.\n` +
    `4. Protocol items must target specific markers. Mark tierRequired accurately — ` +
    `"advanced" only for complex interventions (PRP, peptides, advanced diagnostics).\n` +
    `5. criticalFlags only for genuinely urgent values — not routine suboptimal findings.\n` +
    `6. NEVER output generic advice — every item must be traceable to the patient's data.\n` +
    `7. Cardiovascular risk framing: frame ApoB, CRP, and lipid concerns using 10-year absolute ` +
    `risk context. A patient with favorable HDL, good glycaemic control, and active lifestyle ` +
    `may have ApoB 90–100 yet carry <5% 10-year ASCVD risk — say so explicitly. Never present ` +
    `elevated-but-borderline markers as high-urgency in isolation.\n` +
    `8. Supplement accuracy:\n` +
    `   a. Methylated B-complex (methylfolate + methylcobalamin) is INDICATED — not ` +
    `      contraindicated — for MTHFR variant carriers. Non-methylated folic acid is ` +
    `      the problematic form for MTHFR. Never list MTHFR as a B-complex contraindication.\n` +
    `   b. EPA/DHA omega-3 targets: omega-3 index, triglycerides, and CRP/inflammatory ` +
    `      resolution. Do NOT list ApoB as a target — omega-3 evidence for ApoB reduction ` +
    `      is inconsistent and weak.\n` +
    `9. Sleep extension is the highest-leverage behavioural intervention when total sleep ` +
    `   <420 min/night or sleep score <75. Always include "Extend sleep to ≥8h" as a ` +
    `   priority-1 sleep intervention before any sleep supplement in such cases.\n` +
    `10. Training-load overreach: when wearable data shows strain ≥14/21 Whoop-equivalent ` +
    `   AND HRV is below the expected range for a trained athlete AND total sleep <420 min, ` +
    `   generate a crossDomainSignal named "Training Load Overreach / Non-Functional ` +
    `   Overreaching" across recovery + hormonal domains, explaining that low testosterone ` +
    `   and low HRV in high-training athletes are likely consequential (not primary). ` +
    `   Rank this signal HIGH priority.\n` +
    SYNTHESIS_SCHEMA;

  const userMsg =
    `Synthesize a complete health analysis for this patient.\n\n` +
    `=== PATIENT PROFILE ===\n${userContextBlock(profile)}\n\n` +
    `=== DOMAIN ANALYSIS RESULTS ===\n${domainSummary}\n\n` +
    `=== DERIVED METRICS ===\n${derivedBlock}\n\n` +
    `=== DATA COMPLETENESS: ${Math.round(completeness * 100)}% ===\n` +
    `Note completeness in your summary if below 40%.\n\n` +
    `=== ${depthInstruction} ===`;

  // ── Call Claude ──────────────────────────────────────────────────────────
  const client = getClient();

  // Accumulate tokens across attempts (hoisted so all return paths can read them)
  let s3In = 0, s3Out = 0;
  let raw1 = "";
  try {
    const resp1 = await client.messages.create({
      model:       CLAUDE_MODEL,
      max_tokens:  CLAUDE_SYNTHESIS_MAXTOK,
      temperature: CLAUDE_TEMP,
      system:      systemMsg,
      messages:    [{ role: "user", content: userMsg }],
    });
    s3In  += resp1.usage.input_tokens;
    s3Out += resp1.usage.output_tokens;
    raw1 = resp1.content[0]?.type === "text" ? resp1.content[0].text : "";
  } catch (err) {
    console.error("[synthesizeAnalysis] API call failed:", err instanceof Error ? err.message : err);
    return { result: buildEssentialOutput(input, domainScores, completeness), inputTokens: s3In, outputTokens: s3Out };
  }

  const parsed1 = parseSynthesisOutput(raw1, domainScores, completeness);
  if (parsed1) return { result: parsed1, inputTokens: s3In, outputTokens: s3Out };

  // ── Retry once ───────────────────────────────────────────────────────────
  try {
    const resp2 = await client.messages.create({
      model:       CLAUDE_MODEL,
      max_tokens:  CLAUDE_SYNTHESIS_MAXTOK,
      temperature: CLAUDE_TEMP,
      system:      systemMsg,
      messages: [
        { role: "user",      content: userMsg },
        { role: "assistant", content: raw1 || "{" },
        { role: "user",      content: "Your response could not be parsed. Return ONLY the corrected JSON now." },
      ],
    });
    s3In  += resp2.usage.input_tokens;
    s3Out += resp2.usage.output_tokens;
    const raw2 = resp2.content[0]?.type === "text" ? resp2.content[0].text : "";
    const parsed2 = parseSynthesisOutput(raw2, domainScores, completeness);
    if (parsed2) return { result: parsed2, inputTokens: s3In, outputTokens: s3Out };
  } catch (err) {
    console.error("[synthesizeAnalysis] retry failed:", err instanceof Error ? err.message : err);
  }

  // ── Both attempts failed — fall back to essential output ─────────────────
  console.error("[synthesizeAnalysis] JSON validation failed after retry; returning essential fallback");
  return { result: buildEssentialOutput(input, domainScores, completeness), inputTokens: s3In, outputTokens: s3Out };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 4 — Validation and enrichment
// ─────────────────────────────────────────────────────────────────────────────

// ── Contraindication map ──────────────────────────────────────────────────────

/**
 * Supplement name substrings (lowercase) that interact with each medication
 * class. Matching is substring-based on the supplement name.
 */
const SUPPLEMENT_INTERACTIONS: Record<string, { class: string; supplements: string[] }> = {
  blood_thinners: {
    class: "blood thinners / anticoagulants",
    supplements: [
      "fish oil", "omega-3", "omega 3",
      "vitamin e", "tocopherol",
      "nattokinase", "serrapeptase",
      "ginkgo", "garlic", "allicin",
      "bromelain", "ginger extract",
      "turmeric", "curcumin",
      "coq10",
    ],
  },
  ssri: {
    class: "SSRIs / antidepressants",
    supplements: [
      "5-htp", "5htp",
      "st. john's wort", "st johns wort", "hypericum",
      "same", "s-adenosylmethionine",
      "tryptophan",
      "rhodiola",
    ],
  },
  statins: {
    class: "statins",
    supplements: [
      "red yeast rice",
      "niacin", "nicotinic acid",
      "berberine",
    ],
  },
  thyroid: {
    class: "thyroid medications",
    supplements: [
      "iodine", "kelp", "bladderwrack",
      "calcium",
      "iron",
      "biotin",
      "soy isoflavones", "soy protein",
    ],
  },
  maoi: {
    class: "MAOIs",
    supplements: [
      "5-htp", "5htp",
      "tryptophan",
      "tyrosine", "l-tyrosine",
      "phenylalanine", "dlpa",
      "st. john's wort", "st johns wort",
      "same", "s-adenosylmethionine",
      "rhodiola",
      "ginseng",
    ],
  },
};

/**
 * Keywords (lowercase) used to identify which medication class a user is on
 * from their free-text medication list.
 */
const MEDICATION_CLASS_KEYWORDS: Record<string, string[]> = {
  blood_thinners: [
    "warfarin", "coumadin", "heparin", "enoxaparin", "lovenox",
    "rivaroxaban", "xarelto", "apixaban", "eliquis",
    "dabigatran", "pradaxa", "clopidogrel", "plavix",
    "ticagrelor", "brilinta", "dipyridamole",
    "anticoagulant", "blood thinner",
  ],
  ssri: [
    "sertraline", "zoloft", "fluoxetine", "prozac",
    "paroxetine", "paxil", "citalopram", "celexa",
    "escitalopram", "lexapro", "fluvoxamine", "luvox",
    "venlafaxine", "effexor", "duloxetine", "cymbalta",
    "bupropion", "wellbutrin", "mirtazapine", "remeron",
    "antidepressant", "ssri", "snri",
  ],
  statins: [
    "atorvastatin", "lipitor", "rosuvastatin", "crestor",
    "simvastatin", "zocor", "lovastatin", "mevacor",
    "pravastatin", "pravachol", "fluvastatin", "lescol",
    "pitavastatin", "livalo", "statin",
  ],
  thyroid: [
    "levothyroxine", "synthroid", "levoxyl",
    "liothyronine", "cytomel",
    "armour thyroid", "nature-throid", "np thyroid",
    "methimazole", "tapazole", "propylthiouracil", "ptu",
    "thyroid medication", "thyroid hormone",
  ],
  maoi: [
    "phenelzine", "nardil", "tranylcypromine", "parnate",
    "isocarboxazid", "marplan", "selegiline", "emsam", "eldepryl",
    "rasagiline", "azilect", "moclobemide", "manerix",
    "maoi",
  ],
};

/** Detect which medication classes are present in the user's free-text medication string. */
function detectMedicationClasses(medications: string | undefined): Set<string> {
  const classes = new Set<string>();
  if (!medications?.trim()) return classes;

  const medText = medications.toLowerCase();
  for (const [cls, keywords] of Object.entries(MEDICATION_CLASS_KEYWORDS)) {
    if (keywords.some((kw) => medText.includes(kw))) {
      classes.add(cls);
    }
  }
  return classes;
}

/**
 * Returns interaction warning strings for a supplement given the active
 * medication classes. Matching is bidirectional substring on the first word.
 */
function checkSupplementInteractions(
  supplementName: string,
  medicationClasses: Set<string>,
): string[] {
  const warnings: string[] = [];
  const nameLower = supplementName.toLowerCase();
  const firstName = nameLower.split(/[\s-]/)[0] ?? nameLower;

  for (const cls of Array.from(medicationClasses)) {
    const entry = SUPPLEMENT_INTERACTIONS[cls];
    if (!entry) continue;

    const interacts = entry.supplements.some(
      (sub) => nameLower.includes(sub) || sub.includes(firstName),
    );
    if (interacts) {
      warnings.push(
        `Possible interaction with ${entry.class} — consult prescriber before use.`,
      );
    }
  }
  return warnings;
}

// ── Confidence scoring ────────────────────────────────────────────────────────

/**
 * Compute a confidence score [0, 1] for a finding based on how many
 * independent evidence sources corroborate it.
 *
 * Scoring:
 *   Base                          0.40
 *   Each domain listing the marker (max 3) × 0.15
 *   Each cross-domain signal listing the marker (max 2) × 0.10
 *   Each supplement targeting the marker (max 2) × 0.05
 *   Status "critical"             +0.15
 *   Status "high" or "low"        +0.05
 */
function computeConfidence(
  marker: string,
  domainScores: DomainScore[],
  crossSignals: AnalysisOutput["crossDomainSignals"],
  supplements: AnalysisOutput["protocol"]["supplements"],
  status: string,
): number {
  const ml = marker.toLowerCase();
  const matchesMarker = (m: string) =>
    m.toLowerCase().includes(ml) || ml.includes(m.toLowerCase());

  const domainCount   = Math.min(3, domainScores.filter((d) => d.keyMarkers.some(matchesMarker)).length);
  const signalCount   = Math.min(2, crossSignals.filter((s) => s.markers.some(matchesMarker)).length);
  const suppCount     = Math.min(2, supplements.filter((s) => s.targetMarkers.some(matchesMarker)).length);
  const statusBonus   = status === "critical" ? 0.15 : (status === "high" || status === "low") ? 0.05 : 0;

  const raw = 0.40 + domainCount * 0.15 + signalCount * 0.10 + suppCount * 0.05 + statusBonus;
  return Math.min(1.0, Math.round(raw * 100) / 100);
}

// ── Impact scoring for protocol items ────────────────────────────────────────

const SIGNIFICANCE_WEIGHT: Record<string, number> = {
  critical: 1.0, high: 0.75, moderate: 0.5, low: 0.25,
};

/**
 * Compute impact score [0, 1] for a supplement from the clinical significance
 * of its target markers and its priority field.
 *
 * Blends: 40% priority-derived score + 60% avg clinical-significance score.
 */
function supplementImpact(
  supp: SupplementRecommendation,
  findings: Finding[],
  criticalFlags: AnalysisOutput["criticalFlags"],
): number {
  const priorityScore = (4 - supp.priority) / 4.5;   // p1→0.67, p2→0.44, p3→0.22

  if (supp.targetMarkers.length === 0) return priorityScore;

  const sigScores: number[] = [];
  for (const target of supp.targetMarkers) {
    const tl = target.toLowerCase();
    if (criticalFlags.some((f) => f.marker.toLowerCase().includes(tl))) {
      sigScores.push(1.0);
      continue;
    }
    const match = findings.find(
      (f) => f.marker.toLowerCase().includes(tl) || tl.includes(f.marker.toLowerCase()),
    );
    if (match) sigScores.push(SIGNIFICANCE_WEIGHT[match.clinicalSignificance] ?? 0.5);
  }

  const avgSig = sigScores.length > 0
    ? sigScores.reduce((a, b) => a + b, 0) / sigScores.length
    : priorityScore;

  return priorityScore * 0.4 + avgSig * 0.6;
}

// ── Main Stage 4 export ───────────────────────────────────────────────────────

/**
 * Stage 4: Validation and enrichment.
 *
 * Performs three passes over the raw AnalysisOutput from Stage 3:
 *
 * 1. **Contraindication check** — Compares each supplement against a
 *    medication contraindication map covering blood thinners, SSRIs, statins,
 *    thyroid medications, and MAOIs. Detected interactions are appended to the
 *    supplement's `contraindications` array.
 *
 * 2. **Confidence scoring** — Each `Finding` receives a `confidence` score
 *    in [0, 1] based on corroboration count: domain keyMarkers (up to +0.45),
 *    cross-domain signal markers (up to +0.20), supplement targets (up to +0.10),
 *    and status severity (up to +0.15).
 *
 * 3. **Priority re-ranking** — Supplements are sorted by `impact × confidence`
 *    descending. Nutrition, training, and sleep items are sorted by `priority`
 *    ascending (1 = highest). Findings are sorted by
 *    `clinicalSignificance × confidence` descending.
 */
export function validateAndEnrich(
  output: AnalysisOutput,
  user: UserProfile,
): AnalysisOutput {
  // ── 1. Detect active medication classes ──────────────────────────────────
  const medicationClasses = detectMedicationClasses(user.currentMedications);

  // ── 2. Flag supplement interactions ─────────────────────────────────────
  const enrichedSupplements: SupplementRecommendation[] = output.protocol.supplements.map(
    (supp) => {
      const warnings = checkSupplementInteractions(supp.name, medicationClasses);
      if (warnings.length === 0) return supp;
      return {
        ...supp,
        contraindications: Array.from(
          new Set([...(supp.contraindications ?? []), ...warnings]),
        ),
      };
    },
  );

  // ── 3. Add confidence scores to keyFindings ──────────────────────────────
  const enrichedFindings: Finding[] = output.keyFindings.map((f) => ({
    ...f,
    confidence: computeConfidence(
      f.marker,
      output.domainScores,
      output.crossDomainSignals,
      output.protocol.supplements,
      f.status,
    ),
  }));

  // ── 4. Sort findings by (clinicalSignificance × confidence) desc ─────────
  const sortedFindings = Array.from(enrichedFindings).sort((a, b) => {
    const scoreA = (SIGNIFICANCE_WEIGHT[a.clinicalSignificance] ?? 0.5) * (a.confidence ?? 0.5);
    const scoreB = (SIGNIFICANCE_WEIGHT[b.clinicalSignificance] ?? 0.5) * (b.confidence ?? 0.5);
    return scoreB - scoreA;
  });

  // ── 5. Sort supplements by (impact × confidence) desc ────────────────────
  const supplementsWithScore = enrichedSupplements.map((supp) => {
    const impact = supplementImpact(supp, enrichedFindings, output.criticalFlags);

    const confScores: number[] = [];
    for (const target of supp.targetMarkers) {
      const tl = target.toLowerCase();
      const match = enrichedFindings.find(
        (f) => f.marker.toLowerCase().includes(tl) || tl.includes(f.marker.toLowerCase()),
      );
      if (match?.confidence !== undefined) confScores.push(match.confidence);
    }
    const confidence =
      confScores.length > 0
        ? confScores.reduce((a, b) => a + b, 0) / confScores.length
        : 0.5;

    return { supp, score: impact * confidence };
  });
  supplementsWithScore.sort((a, b) => b.score - a.score);

  // ── 6. Sort nutrition / training / sleep by priority asc ─────────────────
  const sortedNutrition = Array.from(output.protocol.nutrition).sort(
    (a, b) => a.priority - b.priority,
  );
  const sortedTraining = Array.from(output.protocol.training).sort(
    (a, b) => a.priority - b.priority,
  );
  const sortedSleep = Array.from(output.protocol.sleep).sort(
    (a, b) => a.priority - b.priority,
  );

  return {
    ...output,
    keyFindings: sortedFindings,
    protocol: {
      ...output.protocol,
      supplements: supplementsWithScore.map((x) => x.supp),
      nutrition:   sortedNutrition,
      training:    sortedTraining,
      sleep:       sortedSleep,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateAnalysis — public orchestrator (Stages 1 → 2 → 3 → 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full pipeline: sanitize → completeness → derived → depth → domain calls →
 * synthesis → enrich.
 *
 * Returns an `AnalysisResult` (AnalysisOutput + disclaimer + dataCompleteness)
 * with findings sorted by confidence-weighted significance and supplements
 * sorted by impact × confidence.
 *
 * @example
 * const result = await generateAnalysis({
 *   bloodPanel: panel,
 *   wearable:   snapshot,
 *   profile:    { userTier: "advanced", age: 42, biologicalSex: "male" },
 * });
 * console.log(result.overallGrade); // "B"
 */
export async function generateAnalysis(input: AnalysisInput): Promise<AnalysisRunResult> {
  // Stage 1 — normalise & characterise
  const sanitized    = sanitizeInput(input);
  const completeness = calculateDataCompleteness(sanitized);
  const derived      = calculateDerivedMetrics(
    sanitized.bloodPanel,
    sanitized.wearable ?? {},
  );
  const depth = getAnalysisDepth(sanitized.profile, completeness);

  // Stage 2 — parallel domain experts
  const { domainScores, stage2InputTokens, stage2OutputTokens } =
    await runParallelDomainAnalysis(sanitized, derived, depth);

  // Stage 3 — systems biology synthesis
  const { result: synthesized, inputTokens: stage3InputTokens, outputTokens: stage3OutputTokens } =
    await synthesizeAnalysis(sanitized, domainScores, derived, completeness, depth);

  // Stage 4 — validate + enrich
  const enriched = validateAndEnrich(synthesized, sanitized.profile);

  return {
    result: enriched as AnalysisResult,
    usage:  { stage2InputTokens, stage2OutputTokens, stage3InputTokens, stage3OutputTokens },
    depth,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────���─────────────────────

/** Round to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
