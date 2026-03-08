/// lib/pregnancy-safety.ts
// Server-only — import only from API routes or server components.

import { getAdminClient }    from "@/lib/supabase/admin";
import { TABLES }            from "@/lib/db/schema";
import type { PregnancySafetyRule } from "@/lib/types/health";

// ─── Public result type ────────────────────────────────────────────────────────

export type PregnancyGateResult = {
  action:        "allow" | "dose_limit" | "require_approval" | "block";
  blocked:       boolean;
  dose_limit?:   number;
  user_message:  string;
  clinical_note?: string;
  rule_applied?: PregnancySafetyRule;
};

// Re-export for convenience so callers only need one import.
export type { PregnancySafetyRule };

// ─── 1. getPregnancyRulesForProduct ──────────────────────────────────────────

/**
 * Loads pregnancy safety rules for a specific supplement category and status.
 * Returns [] immediately if status is 'not_pregnant' — no DB query.
 * Queries pregnancy_safety_rules WHERE product_category = productCategory
 * AND pregnancyStatus = ANY(applicable_statuses) AND is_active = true.
 */
export async function getPregnancyRulesForProduct(
  productCategory: string,
  pregnancyStatus: string,
): Promise<PregnancySafetyRule[]> {
  if (pregnancyStatus === "not_pregnant") return [];

  const db = getAdminClient();
  const { data, error } = await db
    .from(TABLES.PREGNANCY_SAFETY_RULES)
    .select("*")
    .eq("product_category", productCategory)
    // applicable_statuses @> ARRAY[pregnancyStatus] ≡ pregnancyStatus = ANY(applicable_statuses)
    .contains("applicable_statuses", [pregnancyStatus])
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load pregnancy safety rules: ${error.message}`);
  }

  return (data ?? []) as PregnancySafetyRule[];
}

// ─── 2. applyPregnancyGate ────────────────────────────────────────────────────

/**
 * Applies pregnancy safety rules to a recommended dose and returns a gate result.
 * Priority order: hard_block → dose_limit (triggered) → require_md_approval
 *                → monitor → no rules.
 * Special case: dha_omega3 always returns allow with a positive recommendation message.
 */
export function applyPregnancyGate(
  productCategory:  string,
  rules:            PregnancySafetyRule[],
  recommendedDoseMg: number,
): PregnancyGateResult {

  // ── Special case: DHA is recommended during pregnancy ─────────────────────
  if (productCategory === "dha_omega3" && rules.length > 0) {
    return {
      action:       "allow",
      blocked:      false,
      user_message: "DHA omega-3 is highly recommended during pregnancy for fetal brain development.",
    };
  }

  // ── No rules ───────────────────────────────────────────────────────────────
  if (rules.length === 0) {
    return { action: "allow", blocked: false, user_message: "" };
  }

  // ── Priority 1: hard_block ─────────────────────────────────────────────────
  const hardBlock = rules.find((r) => r.rule_type === "hard_block");
  if (hardBlock) {
    return {
      action:       "block",
      blocked:      true,
      user_message: hardBlock.user_facing_message,
      clinical_note: hardBlock.clinical_note ?? undefined,
      rule_applied: hardBlock,
    };
  }

  // ── Priority 2: dose_limit (only when recommended dose exceeds the cap) ────
  const doseLimit = rules.find(
    (r) =>
      r.rule_type === "dose_limit" &&
      r.max_dose_value !== null &&
      recommendedDoseMg > r.max_dose_value,
  );
  if (doseLimit) {
    return {
      action:       "dose_limit",
      blocked:      false,
      dose_limit:   doseLimit.max_dose_value!,
      user_message: doseLimit.user_facing_message,
      clinical_note: doseLimit.clinical_note ?? undefined,
      rule_applied: doseLimit,
    };
  }

  // ── Priority 3: require_md_approval ───────────────────────────────────────
  const mdApproval = rules.find((r) => r.rule_type === "require_md_approval");
  if (mdApproval) {
    return {
      action:       "require_approval",
      blocked:      true,
      user_message: mdApproval.user_facing_message,
      clinical_note: mdApproval.clinical_note ?? undefined,
      rule_applied: mdApproval,
    };
  }

  // ── Priority 4: monitor-only rules ────────────────────────────────────────
  const monitor = rules.find((r) => r.rule_type === "monitor");
  if (monitor) {
    return {
      action:       "allow",
      blocked:      false,
      user_message: monitor.user_facing_message,
      clinical_note: monitor.clinical_note ?? undefined,
      rule_applied: monitor,
    };
  }

  // Fallback: dose_limit rules present but none triggered (dose is within safe range)
  return { action: "allow", blocked: false, user_message: "" };
}

// ─── 3. getPregnancyContextForNarrative ──────────────────────────────────────

/**
 * Returns a single sentence to inject into AI narrative prompts describing
 * the user's pregnancy/postpartum context. Returns '' for not_pregnant.
 */
export function getPregnancyContextForNarrative(status: string): string {
  switch (status) {
    case "not_pregnant":
      return "";
    case "trying_to_conceive":
      return "User is trying to conceive — same safety rules as first trimester apply.";
    case "first_trimester":
      return "User is in first trimester — strict safety mode active, several supplements blocked.";
    case "second_trimester":
      return "User is in second trimester — DHA and iron prioritized, adaptogens blocked.";
    case "third_trimester":
      return "User is in third trimester — DHA and iron prioritized, adaptogens blocked.";
    case "postpartum_0_3mo":
      return "User is postpartum (0–3 months) — stimulant herbs blocked, DHA prioritized.";
    case "postpartum_3_6mo":
      return "User is postpartum (3–6 months) — most supplements can resume with caution.";
    case "breastfeeding":
      return "User is breastfeeding — stimulant herbs blocked, DHA prioritized.";
    default:
      return "";
  }
}

// ─── 4. getMandatoryPregnancyDisclaimer ──────────────────────────────────────

/**
 * Returns a mandatory disclaimer for any non-not_pregnant status, or null.
 * Intended to be appended to the bottom of any protocol output.
 */
export function getMandatoryPregnancyDisclaimer(status: string): string | null {
  if (status === "not_pregnant") return null;

  return (
    "This protocol has been filtered for pregnancy safety. Supplement needs change throughout " +
    "pregnancy and postpartum. Always review your full supplement list with your OB, midwife, " +
    "or prenatal dietitian before starting, stopping, or changing any supplement."
  );
}
