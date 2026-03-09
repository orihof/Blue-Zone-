/// lib/nutrient-competition.ts
// Server-only — import only from API routes or server components.

import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES }         from "@/lib/db/schema";
import type { NutrientCompetitionRule } from "@/lib/types/health";

// ─── Public types ──────────────────────────────────────────────────────────────

/** A supplement item in the user's active protocol. */
export type ProtocolProduct = {
  supplement: string;  // matches nutrient_a / nutrient_b in the rules table
  dose_mg?:   number;
  [key: string]: unknown;
};

export type CompetitionResult = {
  nutrient_a:              string;
  nutrient_b:              string;
  competition_type:        string;
  clinical_significance:   "low" | "moderate" | "high" | "critical";
  action:                  "schedule_apart" | "suggest_addition" | "flag_lab" | "suggest_pairing" | "log_silent";
  timing_separation_hours?: number;
  user_message:            string;
  mitigation_strategy:     string;
};

export type TimingSlot = {
  time:     string;
  products: string[];
  notes:    string[];
};

// Re-export for convenience
export type { NutrientCompetitionRule };

// ─── 1. getNutrientPairsForProtocol ───────────────────────────────────────────

/**
 * Returns nutrient competition rules where BOTH nutrient_a AND nutrient_b are
 * present in the protocol's product category list. Bidirectional pairs
 * (e.g. Iron→Zinc and Zinc→Iron) are deduplicated — only one rule per pair.
 */
export async function getNutrientPairsForProtocol(
  productCategories: string[],
): Promise<NutrientCompetitionRule[]> {
  if (productCategories.length < 2) return [];

  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.NUTRIENT_COMPETITION_RULES)
    .select("*")
    // nutrient_a = ANY(productCategories) AND nutrient_b = ANY(productCategories)
    .in("nutrient_a", productCategories)
    .in("nutrient_b", productCategories)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load nutrient competition rules: ${error.message}`);
  }

  const rows = (data ?? []) as NutrientCompetitionRule[];

  // Deduplicate bidirectional pairs: keep only the first rule per canonical A–B pair.
  // Canonical key = alphabetically sorted [nutrient_a, nutrient_b] joined with "|".
  const seen = new Set<string>();
  return rows.filter((rule) => {
    const key = [rule.nutrient_a, rule.nutrient_b].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── 2. applyCompetitionRules ─────────────────────────────────────────────────

/**
 * Maps a list of nutrient competition rules onto the active protocol to produce
 * actionable CompetitionResult objects.
 *
 * Action is determined first by competition_type, then overridden to 'log_silent'
 * for low-significance results so they don't surface as warnings.
 */
export function applyCompetitionRules(
  rules:    NutrientCompetitionRule[],
  protocol: ProtocolProduct[],
): CompetitionResult[] {
  const protocolSet = new Set(protocol.map((p) => p.supplement));

  return rules.map((rule): CompetitionResult => {
    const significance = toSignificance(rule.clinical_significance);
    const timingHours  = rule.timing_separation_hours ?? undefined;

    // ── Action by competition_type ────────────────────────────────────────────
    let action: CompetitionResult["action"];

    switch (rule.competition_type) {
      case "transporter_competition":
      case "absorption_inhibition":
      case "absorption_inhibitor":
        action = timingHours ? "schedule_apart" : "log_silent";
        break;

      case "synergy_dependency":
        // Flag missing dependency — if nutrient_b is already in the protocol
        // the dependency is satisfied; log silently.
        action = protocolSet.has(rule.nutrient_b) ? "log_silent" : "suggest_addition";
        break;

      case "synergy_enhancer":
        action = "suggest_pairing";
        break;

      case "antagonism":
      case "oxidative_interference":
        action = "schedule_apart";
        break;

      case "masking_interaction":
        action = "flag_lab";
        break;

      default:
        // binding_inhibition, metabolic_depletion, receptor_competition, and any
        // future types default to timing-based separation or silent logging.
        action = timingHours ? "schedule_apart" : "log_silent";
        break;
    }

    // ── Low-significance results are always logged silently ───────────────────
    if (significance === "low") action = "log_silent";

    return {
      nutrient_a:             rule.nutrient_a,
      nutrient_b:             rule.nutrient_b,
      competition_type:       rule.competition_type ?? "transporter_competition",
      clinical_significance:  significance,
      action,
      timing_separation_hours: timingHours,
      user_message:           rule.mitigation_strategy,
      mitigation_strategy:    rule.mitigation_strategy,
    };
  });
}

// ─── 3. generateTimingSchedule ────────────────────────────────────────────────

/**
 * Groups protocol supplements into morning / midday / evening windows.
 * Any pair with action='schedule_apart' is moved into different slots to
 * honour the timing_separation_hours requirement (morning ≈ 0h, midday ≈ 4h,
 * evening ≈ 8h from morning).
 */
export function generateTimingSchedule(
  results:  CompetitionResult[],
  protocol: ProtocolProduct[],
): TimingSlot[] {
  const SLOT_NAMES  = ["morning", "midday", "evening"] as const;
  // Approximate hours from midnight for each slot — used to validate gap.
  const SLOT_HOURS  = [8, 12, 20] as const;

  // Start all supplements in the morning slot.
  const assignment: Record<string, number> = {};
  for (const p of protocol) assignment[p.supplement] = 0;

  // Conflicts that need separation.
  const conflicts = results.filter(
    (r): r is CompetitionResult & { timing_separation_hours: number } =>
      r.action === "schedule_apart" && typeof r.timing_separation_hours === "number",
  );

  // Greedy pass: if two supplements are in the same slot and conflict, move the
  // second one forward until there's enough gap.
  for (const conflict of conflicts) {
    const { nutrient_a: a, nutrient_b: b, timing_separation_hours: required } = conflict;
    if (!(a in assignment) || !(b in assignment)) continue;

    const slotA = assignment[a];
    const slotB = assignment[b];
    const gapHours = Math.abs(SLOT_HOURS[slotA] - SLOT_HOURS[slotB]);

    if (slotA === slotB || gapHours < required) {
      // Move b to the next slot that provides enough gap from a.
      for (let candidate = 1; candidate <= 2; candidate++) {
        const candidateGap = Math.abs(SLOT_HOURS[slotA] - SLOT_HOURS[candidate]);
        if (candidateGap >= required) {
          assignment[b] = candidate;
          break;
        }
      }
    }
  }

  // Group supplements by slot index.
  const groups: Record<number, string[]>   = { 0: [], 1: [], 2: [] };
  const noteSets: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set() };

  for (const [supplement, slot] of Object.entries(assignment)) {
    groups[slot].push(supplement);
  }

  // Build notes: conflicts that were separated across slots.
  for (const conflict of conflicts) {
    const slotA = assignment[conflict.nutrient_a] ?? 0;
    const slotB = assignment[conflict.nutrient_b] ?? 0;
    if (slotA !== slotB) {
      const slotMin = Math.min(slotA, slotB);
      noteSets[slotMin].add(
        `Separate ${conflict.nutrient_a} and ${conflict.nutrient_b}` +
        ` by at least ${conflict.timing_separation_hours}h.`,
      );
    }
  }

  // schedule_apart results without timing_separation_hours — note in morning slot.
  for (const r of results.filter((r) => r.action === "schedule_apart" && !r.timing_separation_hours)) {
    noteSets[0].add(`${r.nutrient_a} × ${r.nutrient_b}: ${r.user_message}`);
  }

  // Build final array, omitting empty slots.
  const output: TimingSlot[] = [];
  for (let i = 0; i < 3; i++) {
    if (groups[i].length > 0) {
      output.push({
        time:     SLOT_NAMES[i],
        products: groups[i],
        notes:    Array.from(noteSets[i]),
      });
    }
  }

  return output;
}

// ─── 4. getCompetitionNarrativeContext ────────────────────────────────────────

/**
 * Returns a 2–3 sentence AI prompt summary of active nutrient conflicts.
 * Critical and high results are named explicitly; low results are counted only.
 */
export function getCompetitionNarrativeContext(results: CompetitionResult[]): string {
  if (results.length === 0) {
    return "No nutrient competition interactions detected for the current protocol.";
  }

  const critical = results.filter((r) => r.clinical_significance === "critical");
  const high     = results.filter((r) => r.clinical_significance === "high");
  const moderate = results.filter((r) => r.clinical_significance === "moderate");
  const low      = results.filter((r) => r.clinical_significance === "low");

  const sentences: string[] = [];

  // Sentence 1 — critical + high by name.
  const prominent = [...critical, ...high];
  if (prominent.length > 0) {
    const pairs  = prominent.map((r) => `${r.nutrient_a}–${r.nutrient_b}`).join(", ");
    const prefix = critical.length > 0 ? "Critical and high-significance" : "High-significance";
    sentences.push(
      `${prefix} nutrient interactions detected: ${pairs} — enforce timing separation or co-supplementation as specified.`,
    );
  }

  // Sentence 2 — moderate by name.
  if (moderate.length > 0) {
    const pairs = moderate.map((r) => `${r.nutrient_a}–${r.nutrient_b}`).join(", ");
    sentences.push(
      `Moderate interactions for ${pairs} are included in protocol timing notes.`,
    );
  }

  // Sentence 3 — low as count only.
  if (low.length > 0) {
    sentences.push(
      `${low.length} low-significance interaction${low.length > 1 ? "s" : ""} noted silently.`,
    );
  }

  // If only low results exist, the first two sentences are empty; sentence 3 is enough.
  return sentences.slice(0, 3).join(" ");
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function toSignificance(raw: string | null | undefined): CompetitionResult["clinical_significance"] {
  switch (raw) {
    case "critical": return "critical";
    case "high":     return "high";
    case "moderate": return "moderate";
    default:         return "low";
  }
}
