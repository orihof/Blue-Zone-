/// __tests__/nutrient-competition.test.ts

// ─── Mocks (must be declared before imports so Jest hoisting applies) ──────────

jest.mock("@/lib/supabase/admin");

// ─── Imports (after mocks so hoisting applies) ────────────────────────────────

import { getAdminClient } from "@/lib/supabase/admin";
import {
  getNutrientPairsForProtocol,
  applyCompetitionRules,
  generateTimingSchedule,
  type ProtocolProduct,
  type CompetitionResult,
} from "@/lib/nutrient-competition";
import type { NutrientCompetitionRule } from "@/lib/types/health";

const mockGetAdminClient = jest.mocked(getAdminClient);

// ─── Chain / mock-DB helpers ──────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: null | { message: string } };

function makeChain(result: ChainResult) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "is", "not", "in", "gte", "lte", "gt", "lt",
    "ilike", "like", "order", "limit", "maybeSingle", "single",
    "filter", "match", "contains",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then    = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  chain.catch   = (reject:  (v: unknown) => unknown) => Promise.resolve(result).catch(reject);
  chain.finally = (cb: () => void)                   => Promise.resolve(result).finally(cb);
  return chain;
}

function makeDb(tableMap: Record<string, ChainResult>) {
  const client = {
    from: jest.fn((table: string) => {
      return makeChain(tableMap[table] ?? { data: null, error: null });
    }),
  };
  return client;
}

// ─── Rule fixtures ─────────────────────────────────────────────────────────────

const BASE_RULE: Omit<
  NutrientCompetitionRule,
  "id" | "nutrient_a" | "nutrient_b" | "competition_type" | "affected_nutrient" | "clinical_significance"
> = {
  competition_threshold_a_mg: null,
  competition_threshold_b_mg: null,
  absorption_impact_pct:      null,
  mitigation_strategy:        "Schedule 2 hours apart.",
  clinical_note:              null,
  source:                     null,
  is_active:                  true,
  evidence_level:             "established",
  timing_separation_hours:    null,
  is_bidirectional:           true,
  interaction_direction:      null,
};

const IRON_ZINC_RULE: NutrientCompetitionRule = {
  ...BASE_RULE,
  id:                    "rule-iron-zinc",
  nutrient_a:            "Iron",
  nutrient_b:            "Zinc",
  competition_type:      "transporter_competition",
  affected_nutrient:     "Zinc",
  clinical_significance: "high",
  timing_separation_hours: 2,
};

const VIT_D_K2_RULE: NutrientCompetitionRule = {
  ...BASE_RULE,
  id:                    "rule-vitd-k2",
  nutrient_a:            "Vitamin_D",
  nutrient_b:            "Vitamin_K2",
  competition_type:      "synergy_dependency",
  affected_nutrient:     "Vitamin_K2",
  clinical_significance: "critical",
  timing_separation_hours: null,
};

const VIT_C_IRON_RULE: NutrientCompetitionRule = {
  ...BASE_RULE,
  id:                    "rule-vitc-iron",
  nutrient_a:            "Vitamin_C",
  nutrient_b:            "Iron",
  competition_type:      "synergy_enhancer",
  affected_nutrient:     "Iron",
  clinical_significance: "high",
  timing_separation_hours: null,
};

const FOLATE_B12_RULE: NutrientCompetitionRule = {
  ...BASE_RULE,
  id:                    "rule-folate-b12",
  nutrient_a:            "Folate",
  nutrient_b:            "B12",
  competition_type:      "masking_interaction",
  affected_nutrient:     "B12",
  clinical_significance: "critical",
  timing_separation_hours: null,
};

const CALCIUM_IRON_RULE: NutrientCompetitionRule = {
  ...BASE_RULE,
  id:                    "rule-calcium-iron",
  nutrient_a:            "Calcium",
  nutrient_b:            "Iron",
  competition_type:      "transporter_competition",
  affected_nutrient:     "Iron",
  clinical_significance: "high",
  timing_separation_hours: 2,
};

// ─── Test 1–2: getNutrientPairsForProtocol ────────────────────────────────────

describe("getNutrientPairsForProtocol", () => {
  test("1 — ['Iron','Zinc'] → returns the Iron/Zinc transporter_competition rule", async () => {
    const db = makeDb({
      nutrient_competition_rules: { data: [IRON_ZINC_RULE], error: null },
    });
    mockGetAdminClient.mockReturnValue(db as never);

    const rules = await getNutrientPairsForProtocol(["Iron", "Zinc"]);

    expect(rules).toHaveLength(1);
    expect(rules[0].nutrient_a).toBe("Iron");
    expect(rules[0].nutrient_b).toBe("Zinc");
    expect(rules[0].competition_type).toBe("transporter_competition");
    expect(db.from).toHaveBeenCalledWith("nutrient_competition_rules");
  });

  test("2 — ['Vitamin_D'] alone → returns [] without hitting the DB (< 2 categories)", async () => {
    mockGetAdminClient.mockClear();

    const rules = await getNutrientPairsForProtocol(["Vitamin_D"]);

    expect(rules).toEqual([]);
    expect(mockGetAdminClient).not.toHaveBeenCalled();
  });
});

// ─── Tests 3–9: applyCompetitionRules (pure function) ─────────────────────────

describe("applyCompetitionRules", () => {
  test("3 — Iron+Zinc transporter rule → action='schedule_apart', timing_separation_hours=2", () => {
    const protocol: ProtocolProduct[] = [
      { supplement: "Iron" },
      { supplement: "Zinc" },
    ];
    const results = applyCompetitionRules([IRON_ZINC_RULE], protocol);

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("schedule_apart");
    expect(results[0].timing_separation_hours).toBe(2);
  });

  test("4 — Vitamin_D+K2 synergy_dependency, K2 absent → action='suggest_addition'", () => {
    const protocol: ProtocolProduct[] = [{ supplement: "Vitamin_D" }];
    // K2 not in protocol — dependency unmet
    const results = applyCompetitionRules([VIT_D_K2_RULE], protocol);

    expect(results[0].action).toBe("suggest_addition");
  });

  test("5 — Vitamin_D+K2 synergy_dependency, K2 already in protocol → action='log_silent'", () => {
    const protocol: ProtocolProduct[] = [
      { supplement: "Vitamin_D" },
      { supplement: "Vitamin_K2" },
    ];
    // K2 is present — dependency is satisfied, log silently
    const results = applyCompetitionRules([VIT_D_K2_RULE], protocol);

    expect(results[0].action).toBe("log_silent");
  });

  test("6 — Vitamin_C+Iron synergy_enhancer → action='suggest_pairing'", () => {
    const protocol: ProtocolProduct[] = [
      { supplement: "Vitamin_C" },
      { supplement: "Iron" },
    ];
    const results = applyCompetitionRules([VIT_C_IRON_RULE], protocol);

    expect(results[0].action).toBe("suggest_pairing");
  });

  test("7 — Folate+B12 masking_interaction → action='flag_lab'", () => {
    const protocol: ProtocolProduct[] = [
      { supplement: "Folate" },
      { supplement: "B12" },
    ];
    const results = applyCompetitionRules([FOLATE_B12_RULE], protocol);

    expect(results[0].action).toBe("flag_lab");
  });

  test("8 — clinical_significance='critical' → result surfaces in output (not log_silent)", () => {
    const criticalRule: NutrientCompetitionRule = {
      ...IRON_ZINC_RULE,
      id:                    "rule-critical",
      clinical_significance: "critical",
    };
    const protocol: ProtocolProduct[] = [
      { supplement: "Iron" },
      { supplement: "Zinc" },
    ];
    const results = applyCompetitionRules([criticalRule], protocol);

    expect(results[0].clinical_significance).toBe("critical");
    expect(results[0].action).not.toBe("log_silent");
  });

  test("9 — clinical_significance='low' → action='log_silent' regardless of competition_type", () => {
    const lowRule: NutrientCompetitionRule = {
      ...IRON_ZINC_RULE,
      id:                    "rule-low",
      clinical_significance: "low",
    };
    const protocol: ProtocolProduct[] = [
      { supplement: "Iron" },
      { supplement: "Zinc" },
    ];
    const results = applyCompetitionRules([lowRule], protocol);

    expect(results[0].action).toBe("log_silent");
  });
});

// ─── Test 10: generateTimingSchedule ─────────────────────────────────────────

describe("generateTimingSchedule", () => {
  test("10 — Iron and Calcium in same protocol → placed in separate time windows", () => {
    const protocol: ProtocolProduct[] = [
      { supplement: "Calcium" },
      { supplement: "Iron" },
    ];
    // A schedule_apart CompetitionResult for the pair
    const conflict: CompetitionResult = {
      nutrient_a:             "Calcium",
      nutrient_b:             "Iron",
      competition_type:       "transporter_competition",
      clinical_significance:  "high",
      action:                 "schedule_apart",
      timing_separation_hours: 2,
      user_message:           "Separate Calcium and Iron by 2 hours.",
      mitigation_strategy:    "Separate Calcium and Iron by 2 hours.",
    };

    const schedule = generateTimingSchedule([conflict], protocol);

    // Find which slots each supplement landed in
    const calciumSlot = schedule.find((slot) => slot.products.includes("Calcium"));
    const ironSlot    = schedule.find((slot) => slot.products.includes("Iron"));

    expect(calciumSlot).toBeDefined();
    expect(ironSlot).toBeDefined();
    // They must NOT be in the same time window
    expect(calciumSlot!.time).not.toBe(ironSlot!.time);
  });
});
