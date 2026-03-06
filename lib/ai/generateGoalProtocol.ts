/// lib/ai/generateGoalProtocol.ts
// Two parallel Claude calls (Part A + Part B) with category-specific system prompts.
// Mirrors generateSportsProtocol.ts — same callWithRetry + extractJSON helpers.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  GoalProtocolPayloadSchema,
  GoalPhaseSchema,
  GoalRedFlagsSchema,
  GoalTierPackSchema,
  GoalSupplementScheduleItemSchema,
  GoalTrackingMetricSchema,
  type GoalProtocolPayload,
  type GoalPrepFormData,
} from "@/lib/db/goal-payload";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey: key });
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const PartASchema = z.object({
  goalPhases: z.array(GoalPhaseSchema).min(1),
  redFlags:   GoalRedFlagsSchema,
});

const PartBSchema = z.object({
  tierPack:           GoalTierPackSchema,
  supplementSchedule: z.array(GoalSupplementScheduleItemSchema),
  trackingMetrics:    z.array(GoalTrackingMetricSchema).min(1).max(5),
});

// ── Shared intro ──────────────────────────────────────────────────────────────

const SHARED_INTRO = `You are a precision longevity and health optimization specialist. You work with adults who want to optimize a specific health domain through evidence-based supplementation, lifestyle protocols, and targeted testing. Your recommendations are direct, specific, and personalized — not generic wellness advice. Never give vague or hedged guidance.`;

// ── Part A system prompts (goalPhases + redFlags) ─────────────────────────────

const SYSTEM_PROMPTS_A: Record<string, string> = {

  weight_loss: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a WEIGHT LOSS & BODY COMPOSITION protocol:
1. goalPhases — 4 phases: Foundation (1-2 weeks), Active Loss (4-8 weeks), Plateau Management (2-4 weeks), Maintenance Integration
2. redFlags — specific to this user's conditions, medications, and approach history

CRITICAL RULES:
1. Each phase must have concrete, actionable keyActions specific to fat loss (deficit sizing, meal timing, training split, supplement timing).
2. Plateau Management must include metabolic adaptation strategies (refeed days, diet break, NEAT increase).
3. Red flags must reference actual user data — not generic disclaimers.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  anti_aging: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for an ANTI-AGING & LONGEVITY protocol:
1. goalPhases — 4 phases: Cellular Priming (2 weeks), Active Intervention (6-8 weeks), Biomarker Optimization (4 weeks), Longevity Maintenance
2. redFlags — specific to this user's conditions and medications

CRITICAL RULES:
1. Phase actions must be specific to biological aging mechanisms (senolysis, NAD+ restoration, mTOR regulation, telomere protection).
2. Red flags must reference the user's actual medications and conditions — especially statin interactions with CoQ10, diabetes and metformin + B12.
3. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  performance: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a PHYSICAL PERFORMANCE protocol:
1. goalPhases — 4 phases matching the activity and goal: Conditioning Base, Capacity Build, Peak Performance, Recovery/Adaptation
2. redFlags — specific to this user's injuries, conditions, and training level

CRITICAL RULES:
1. Phase actions must be specific to the user's primary activity and performance goal (strength vs endurance vs power vs body recomposition).
2. Training phases must align with progressive overload principles and recovery demands.
3. Red flags must reference actual injuries and conditions — e.g. knee injury + jump training, hypertension + max effort lifts.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  cognition: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a COGNITIVE PERFORMANCE & BRAIN OPTIMIZATION protocol:
1. goalPhases — 4 phases: Neuro Foundation (1-2 weeks), Stack Building (2-3 weeks), Peak Performance (4-6 weeks), Maintenance
2. redFlags — specific to this user's conditions, medications, caffeine intake, and stress level

CRITICAL RULES:
1. Phase actions must address the user's specific cognitive issues (focus vs memory vs brain fog vs fatigue).
2. Stack building must sequence supplements safely (start with adaptogens before racetams, assess tolerance).
3. Red flags must flag specific drug interactions — e.g. SSRIs + 5-HTP, blood thinners + fish oil at high dose.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  sleep: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a SLEEP OPTIMIZATION protocol:
1. goalPhases — 4 phases: Sleep Hygiene Reset (1-2 weeks), Circadian Anchoring (2-3 weeks), Deep Sleep Optimization (3-4 weeks), Maintenance
2. redFlags — specific to this user's conditions, medications, sleep problem type, and environment issues

CRITICAL RULES:
1. Phase actions must target the user's specific sleep issue (onset vs maintenance vs circadian misalignment vs quality).
2. Supplement introduction must be gradual — don't start melatonin + magnesium + L-theanine simultaneously.
3. Red flags must flag: sedative medications + sleep supplements (additive sedation), sleep apnea requiring CPAP priority over supplements, shift work scheduling.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  hair: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a HAIR LOSS & FOLLICLE HEALTH protocol:
1. goalPhases — 4 phases: Scalp & Follicle Prep (2-4 weeks), Active Treatment (8-12 weeks), Growth Acceleration (8-12 weeks), Maintenance
2. redFlags — specific to this user's hair loss pattern, duration, medications, and conditions

CRITICAL RULES:
1. Phase actions must be specific to the hair loss type (androgenetic vs stress-related vs nutritional deficiency vs postpartum).
2. DHT-blocking supplements must be flagged for males with sexual health implications.
3. Red flags must reference: blood thinners + high-dose vitamin E, finasteride interactions, thyroid conditions affecting hair (if applicable from conditions).
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  mood: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a MOOD OPTIMIZATION & EMOTIONAL WELLBEING protocol:
1. goalPhases — 4 phases: Neuro-Nutritional Foundation (1-2 weeks), Mood Stack Build (2-3 weeks), Optimization (4-6 weeks), Resilience Maintenance
2. redFlags — specific to this user's mood pattern, severity, medications, and stress sources

CRITICAL RULES:
1. Phase actions must address the specific mood pattern (low energy vs anxiety vs irritability vs seasonal).
2. Supplement introduction must be conservative — especially for users on psychiatric medications.
3. Red flags MUST flag: SSRIs/SNRIs + St John's Wort (serotonin syndrome), MAOIs + tyramine-containing supplements, severity score ≥ 8 (clinical assessment recommended).
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,

  sexual_health: `${SHARED_INTRO}

Generate ONLY the following 2 sections as JSON for a SEXUAL HEALTH & HORMONAL VITALITY protocol:
1. goalPhases — 4 phases: Hormonal Foundation (2-3 weeks), Active Optimization (4-6 weeks), Performance Peak (4-6 weeks), Sustainable Vitality
2. redFlags — specific to this user's primary concern, biological sex, conditions, and medications

CRITICAL RULES:
1. Phase actions must be specific to sex and concern (male libido vs female cycle health vs menopause vs performance).
2. Hormone-modulating supplements require careful sequencing — don't stack multiple androgens/estrogen modulators simultaneously.
3. Red flags MUST flag: cardiac medications + ED supplements (PDE5 interaction), hormone-sensitive conditions + phytoestrogens, hypertension + high-dose niacin.
4. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "goalPhases": [{ "phase": string, "durationWeeks": number, "phaseFocus": string, "keyActions": string[] }],
  "redFlags": { "contraindications": string[], "doctorDiscussion": string[], "weeklyMonitoring": string[] }
}`,
};

// ── Part B system prompts (tierPack + supplementSchedule + trackingMetrics) ────

const SYSTEM_PROMPTS_B: Record<string, string> = {

  weight_loss: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a WEIGHT LOSS & BODY COMPOSITION protocol:
1. tierPack — match the exact budget tier; supplements target fat metabolism, appetite regulation, insulin sensitivity, and muscle preservation
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key metrics for body composition progress

CRITICAL RULES:
1. Tier 1: core essentials only (protein, creatine, fiber, caffeine if tolerated).
2. Tier 2+: add GLP-1 support compounds, berberine, carnitine, CLA where evidence-supported.
3. Lifestyle interventions must include specific dietary approach, meal timing, exercise type.
4. The "whatYouAreMissing" field must be empty array [] if tier is 4.
5. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  anti_aging: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for an ANTI-AGING & LONGEVITY protocol:
1. tierPack — match the exact budget tier; supplements target cellular senescence, NAD+ restoration, mitochondrial function, collagen synthesis, antioxidant defense
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key biological aging markers to monitor

CRITICAL RULES:
1. Tier 1: essentials (NMN/NR or precursors, resveratrol, vitamin D3+K2, omega-3, CoQ10).
2. Tier 2+: add senolytics (fisetin, quercetin), collagen peptides, spermidine, astaxanthin.
3. Tier 3+: add testing — GlycanAge, TruAge, comprehensive bloodwork panels.
4. Lifestyle must include specific dietary patterns (caloric restriction timing, fasting protocols), sleep optimization, exercise modes.
5. The "whatYouAreMissing" field must be empty array [] if tier is 4.
6. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  performance: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a PHYSICAL PERFORMANCE protocol:
1. tierPack — match the exact budget tier; supplements target the user's activity type and performance goal (strength/endurance/power/body recomposition)
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key performance metrics for this activity type

CRITICAL RULES:
1. Tier 1: evidence-grade essentials only (creatine monohydrate, protein, caffeine, beta-alanine or citrulline based on goal).
2. Tier 2+: add HMB, ashwagandha, electrolytes, targeted amino acids.
3. Tier 3+: add testing — VO2max assessment, DEXA scan, hormone panel.
4. Lifestyle must include specific training periodization, recovery protocols (sleep, contrast therapy), nutrition timing.
5. The "whatYouAreMissing" field must be empty array [] if tier is 4.
6. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  cognition: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a COGNITIVE PERFORMANCE protocol:
1. tierPack — match the exact budget tier; supplements target the user's specific cognitive concerns and work type
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key cognitive metrics to track

CRITICAL RULES:
1. Tier 1: essentials (omega-3 DHA, lion's mane, bacopa monnieri, magnesium L-threonate or glycinate).
2. Tier 2+: add citicoline/alpha-GPC, rhodiola, phosphatidylserine, acetyl-L-carnitine.
3. Tier 3+: add testing — cognitive assessment (Cambridge Brain Sciences), homocysteine, B12/folate panel, APOE genotyping.
4. Lifestyle must include specific cognitive protocols (spaced repetition, sleep optimization for memory consolidation, focused work blocks).
5. Match stimulant-containing supplements to user's stated tolerance (low/moderate/high).
6. The "whatYouAreMissing" field must be empty array [] if tier is 4.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  sleep: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a SLEEP OPTIMIZATION protocol:
1. tierPack — match the exact budget tier; supplements and lifestyle interventions target the user's specific sleep issue
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key sleep metrics to monitor

CRITICAL RULES:
1. Tier 1: essentials (magnesium glycinate, L-theanine, low-dose melatonin 0.5-1mg only if circadian issue).
2. Tier 2+: add glycine, apigenin, ashwagandha, phosphatidylserine for evening cortisol.
3. Tier 3+: add testing — polysomnography referral if sleep apnea suspected, cortisol awakening response, comprehensive thyroid.
4. Lifestyle must include sleep hygiene specifics (temperature, light protocol, consistent wake time), not generic "avoid screens."
5. Match interventions to the user's specific problem: onset disorders need different protocols than maintenance disorders.
6. The "whatYouAreMissing" field must be empty array [] if tier is 4.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  hair: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a HAIR LOSS & FOLLICLE HEALTH protocol:
1. tierPack — match the exact budget tier; supplements and lifestyle target the user's hair loss pattern and root cause
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key metrics to monitor hair loss progress

CRITICAL RULES:
1. Tier 1: essentials (biotin 5mg, zinc 25mg, iron assessment first, vitamin D if deficient, collagen peptides).
2. Tier 2+: add saw palmetto (androgenetic pattern), pumpkin seed oil, marine collagen, silica.
3. Tier 3+: add testing — full iron panel (ferritin target 70+ ng/mL), DHT serum, thyroid full panel, trichoscopy referral.
4. Lifestyle must include scalp care protocol (massage, topical support), dietary protein targets, stress management for telogen effluvium.
5. Note if user has previously tried treatments and adjust recommendation to avoid redundancy or build on existing.
6. The "whatYouAreMissing" field must be empty array [] if tier is 4.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  mood: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a MOOD OPTIMIZATION & EMOTIONAL WELLBEING protocol:
1. tierPack — match the exact budget tier; supplements target the user's specific mood pattern and neurochemical needs
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key mood/wellbeing metrics to track

CRITICAL RULES:
1. Tier 1: essentials (omega-3 EPA-dominant, vitamin D3, magnesium glycinate, B-complex).
2. Tier 2+: add ashwagandha KSM-66, rhodiola rosea (not for anxiety patterns), saffron extract, L-theanine.
3. Tier 3+: add testing — full thyroid panel, vitamin D, comprehensive metabolic, cortisol awakening response, organic acids.
4. NEVER recommend St John's Wort without first listing SSRI/SNRI contraindication in red flags.
5. Lifestyle must include specific behavioral interventions (exercise type/frequency, light exposure protocol, social connection scheduling).
6. The "whatYouAreMissing" field must be empty array [] if tier is 4.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,

  sexual_health: `${SHARED_INTRO}

Generate ONLY the following 3 sections as JSON for a SEXUAL HEALTH & HORMONAL VITALITY protocol:
1. tierPack — match the exact budget tier; tailor supplements to the user's biological sex and primary concern
2. supplementSchedule — every supplement with full dosing and timing
3. trackingMetrics — exactly 3 key hormonal/vitality metrics to track

CRITICAL RULES:
1. Tier 1 (male): essentials — zinc, vitamin D, ashwagandha, tongkat ali; Tier 1 (female): essentials — magnesium, B6, iron, vitex if cycle-related.
2. Tier 2+: add maca root, shilajit (male), or evening primrose/shatavari (female); add comprehensive testing.
3. Tier 3+: add comprehensive hormone panels (total T, free T, SHBG, estradiol, LH, FSH, prolactin, DHEA-S, thyroid).
4. Lifestyle must include sleep optimization (testosterone is synthesized during sleep), exercise specifics (resistance training for T), and stress management.
5. Do NOT recommend testosterone boosters for users on existing hormone therapy without flagging physician consultation.
6. The "whatYouAreMissing" field must be empty array [] if tier is 4.
7. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text.

OUTPUT SCHEMA:
{
  "tierPack": { "tier": number, "supplements": [{"name": string, "dose": string, "timing": string, "notes": string}], "testing": string[], "lifestyle": string[], "services": string[], "biggestROI": string[], "whatYouAreMissing": string[] },
  "supplementSchedule": [{"name": string, "dose": string, "timing": "Morning|Pre-workout|During|Post-workout|Evening|With meals", "withFood": boolean, "notes": string}],
  "trackingMetrics": [{"metric": string, "goodTrend": string, "concerningTrend": string, "intervention": string}]
}`,
};

// ── User message builder ──────────────────────────────────────────────────────

interface GenerateGoalInput extends GoalPrepFormData {
  bloodTestSummary?: string;
  wearableSummary?:  string;
}

function formatCategoryData(category: string, data: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) return "No category-specific data provided.";

  const lines: string[] = [];

  switch (category) {
    case "weight_loss":
      if (data.currentWeightLbs) lines.push(`Current weight: ${data.currentWeightLbs} lbs`);
      if (data.targetWeightLbs)  lines.push(`Target weight: ${data.targetWeightLbs} lbs`);
      if (data.heightFt)         lines.push(`Height: ${data.heightFt}'${data.heightIn ?? 0}"`);
      if (data.timeframeDays)    lines.push(`Target timeframe: ${data.timeframeDays} days`);
      if (data.previousApproaches && Array.isArray(data.previousApproaches) && data.previousApproaches.length) {
        lines.push(`Previous approaches tried: ${(data.previousApproaches as string[]).join(", ")}`);
      }
      if (data.mainObstacle)  lines.push(`Main obstacle: ${data.mainObstacle}`);
      if (data.exerciseLevel) lines.push(`Exercise level: ${data.exerciseLevel}`);
      break;

    case "anti_aging":
      if (data.focusAreas && Array.isArray(data.focusAreas) && data.focusAreas.length) {
        lines.push(`Focus areas: ${(data.focusAreas as string[]).join(", ")}`);
      }
      if (data.desiredYoungerBy)   lines.push(`Goal: look ${data.desiredYoungerBy} years younger`);
      if (data.hasSkincarRoutine != null) lines.push(`Has skincare routine: ${data.hasSkincarRoutine ? "yes" : "no"}`);
      if (data.hasSunProtection != null)  lines.push(`Daily sun protection: ${data.hasSunProtection ? "yes" : "no"}`);
      if (data.sleepQuality) lines.push(`Sleep quality: ${data.sleepQuality}`);
      if (data.stressLevel)  lines.push(`Stress level: ${data.stressLevel}`);
      break;

    case "performance":
      if (data.primaryActivity)    lines.push(`Primary activity: ${data.primaryActivity}`);
      if (data.performanceGoal)    lines.push(`Performance goal: ${data.performanceGoal}`);
      if (data.weeklyTrainingHours)lines.push(`Weekly training: ${data.weeklyTrainingHours} hours`);
      if (data.experienceLevel)    lines.push(`Experience level: ${data.experienceLevel}`);
      if (data.timeframeDays)      lines.push(`Target timeframe: ${data.timeframeDays} days`);
      break;

    case "cognition":
      if (data.primaryIssues && Array.isArray(data.primaryIssues) && data.primaryIssues.length) {
        lines.push(`Primary concerns: ${(data.primaryIssues as string[]).join(", ")}`);
      }
      if (data.workType)         lines.push(`Work type: ${data.workType}`);
      if (data.dailyCaffeine)    lines.push(`Daily caffeine: ${data.dailyCaffeine}`);
      if (data.avgSleepHours)    lines.push(`Avg sleep: ${data.avgSleepHours} hours`);
      if (data.highStressPeriod != null) lines.push(`Currently in high-stress period: ${data.highStressPeriod ? "yes" : "no"}`);
      break;

    case "sleep":
      if (data.primaryIssue)        lines.push(`Primary sleep issue: ${data.primaryIssue}`);
      if (data.avgCurrentSleepHours) lines.push(`Current avg sleep: ${data.avgCurrentSleepHours} hours`);
      if (data.typicalBedtime)       lines.push(`Typical bedtime: ${data.typicalBedtime}`);
      if (data.screenTimeAtBed)      lines.push(`Screen time at bed: ${data.screenTimeAtBed}`);
      if (data.environmentIssues && Array.isArray(data.environmentIssues) && data.environmentIssues.length) {
        lines.push(`Environment issues: ${(data.environmentIssues as string[]).join(", ")}`);
      }
      break;

    case "hair":
      if (data.hairLossPattern) lines.push(`Hair loss pattern: ${data.hairLossPattern}`);
      if (data.duration)        lines.push(`Duration: ${data.duration}`);
      if (data.familyHistory != null) lines.push(`Family history: ${data.familyHistory}`);
      if (data.previousTreatments && Array.isArray(data.previousTreatments) && data.previousTreatments.length) {
        lines.push(`Previous treatments: ${(data.previousTreatments as string[]).join(", ")}`);
      }
      if (data.stressLevel) lines.push(`Stress level: ${data.stressLevel}`);
      break;

    case "mood":
      if (data.primaryPattern) lines.push(`Primary mood pattern: ${data.primaryPattern}`);
      if (data.severity)        lines.push(`Severity: ${data.severity}/10`);
      if (data.stressSource)    lines.push(`Main stress source: ${data.stressSource}`);
      if (data.exerciseLevel)   lines.push(`Exercise level: ${data.exerciseLevel}`);
      if (data.sleepQuality)    lines.push(`Sleep quality: ${data.sleepQuality}`);
      break;

    case "sexual_health":
      if (data.biologicalSex)   lines.push(`Biological sex: ${data.biologicalSex}`);
      if (data.primaryConcern)  lines.push(`Primary concern: ${data.primaryConcern}`);
      if (data.stressLevel)     lines.push(`Stress level: ${data.stressLevel}`);
      if (data.exerciseLevel)   lines.push(`Exercise level: ${data.exerciseLevel}`);
      if (data.hasSleepIssues != null) lines.push(`Has sleep issues: ${data.hasSleepIssues ? "yes" : "no"}`);
      break;
  }

  return lines.join("\n") || "No category-specific data provided.";
}

function buildGoalUserMessage(input: GenerateGoalInput, part: "A" | "B"): string {
  const {
    category,
    age, gender,
    knownConditions, medications, stimulantTolerance,
    budgetValue, budgetTier,
    categoryData,
    bloodTestSummary, wearableSummary,
  } = input;

  const conditionsStr = knownConditions.length > 0 ? knownConditions.join(", ") : "none";
  const medsStr       = medications.trim() || "none";

  const categoryLabel = {
    weight_loss: "Weight Loss & Body Composition",
    anti_aging:  "Anti-Aging & Longevity",
    performance: "Physical Performance",
    cognition:   "Cognitive Performance",
    sleep:       "Sleep Optimization",
    hair:        "Hair Loss & Follicle Health",
    mood:        "Mood & Emotional Wellbeing",
    sexual_health: "Sexual Health & Hormonal Vitality",
  }[category] ?? category;

  const instructionsA =
    `=== INSTRUCTIONS ===\n` +
    `1. Build goal phases appropriate for this category and this specific user profile.\n` +
    `2. Red flags must reference THIS user's conditions (${conditionsStr}) and medications (${medsStr}) — not generic warnings.\n\n` +
    `Return ONLY the JSON with "goalPhases" and "redFlags". No other text.`;

  const instructionsB =
    `=== INSTRUCTIONS ===\n` +
    `1. Tier ${budgetTier} pack: include ALL supplements, testing, lifestyle, services appropriate for this tier and category.\n` +
    `2. Supplement schedule: include every supplement from the tier pack.\n` +
    `3. Tracking metrics: provide exactly 3 metrics most critical for ${categoryLabel} progress.\n` +
    `4. Stimulant tolerance is ${stimulantTolerance} — adjust any stimulant-containing supplements accordingly.\n` +
    `5. The "whatYouAreMissing" field must be empty array [] if tier is 4.\n\n` +
    `Return ONLY the JSON with "tierPack", "supplementSchedule", and "trackingMetrics". No other text.`;

  return `Generate a Health Optimization Protocol for this person.

=== GOAL PROFILE ===
Category: ${categoryLabel}

=== PERSON PROFILE ===
Age: ${age} | Gender: ${gender}
Known Conditions: ${conditionsStr}
Medications: ${medsStr}
Stimulant Tolerance: ${stimulantTolerance}
Budget: $${budgetValue.toLocaleString()} (Tier ${budgetTier})

=== GOAL-SPECIFIC DATA ===
${formatCategoryData(category, categoryData)}

=== BLOOD TEST DATA ===
${bloodTestSummary ?? "No blood test data available — build protocol based on category-specific defaults for this person profile."}

=== WEARABLE METRICS ===
${wearableSummary ?? "No wearable data available — use standard benchmarks for this health goal."}

${part === "A" ? instructionsA : instructionsB}`;
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
    model: MODEL, max_tokens: maxTokens, system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  if (response.stop_reason === "max_tokens") {
    console.warn(`[generateGoalProtocol] ${label} hit max_tokens — response may be truncated`);
  }

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") throw new Error(`[${label}] Unexpected non-text response`);

  let raw = firstBlock.text.trim();
  let parsed: unknown = null;
  try { parsed = extractJSON(raw); } catch { /* will retry */ }
  let validated = schema.safeParse(parsed);
  if (validated.success) return validated.data;

  const parseFailure     = parsed === null;
  const retryUserContent = parseFailure
    ? "Your previous response could not be parsed as JSON. Return ONLY valid JSON — no preamble, no markdown fences, no trailing text."
    : `Schema validation failed: ${validated.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Return ONLY the corrected JSON.`;

  response = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, system: systemPrompt,
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

export async function generateGoalProtocol(
  input: GenerateGoalInput
): Promise<GoalProtocolPayload> {
  const { category } = input;

  const sysA = SYSTEM_PROMPTS_A[category];
  const sysB = SYSTEM_PROMPTS_B[category];
  if (!sysA || !sysB) throw new Error(`Unknown goal category: ${category}`);

  const client = getClient();

  const [partA, partB] = await Promise.all([
    callWithRetry(client, sysA, buildGoalUserMessage(input, "A"), PartASchema, 2000, `${category}-part-A`),
    callWithRetry(client, sysB, buildGoalUserMessage(input, "B"), PartBSchema, 5000, `${category}-part-B`),
  ]);

  const merged    = { ...partA, ...partB };
  const validated = GoalProtocolPayloadSchema.safeParse(merged);

  if (!validated.success) {
    const issues = validated.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Merged goal protocol failed validation: ${issues}`);
  }

  return validated.data;
}
