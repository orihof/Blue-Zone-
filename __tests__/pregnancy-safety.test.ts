/// __tests__/pregnancy-safety.test.ts

// ─── Mocks (must be declared before imports so Jest hoisting applies) ──────────

jest.mock("@/lib/supabase/admin");

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/middleware/requireConsent", () => ({
  requireConsent: () => (handler: (req: unknown) => unknown) => handler,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(
      (data: unknown, init?: { status?: number }) =>
        ({ _body: data, status: init?.status ?? 200 }),
    ),
  },
  NextRequest: class {},
}));

// ─── Imports (after mocks so hoisting applies) ────────────────────────────────

import { getAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "next-auth";
import {
  getPregnancyRulesForProduct,
  applyPregnancyGate,
  getPregnancyContextForNarrative,
  getMandatoryPregnancyDisclaimer,
} from "@/lib/pregnancy-safety";
import type { PregnancySafetyRule } from "@/lib/pregnancy-safety";
import { POST } from "@/app/api/pregnancy/status/route";

const mockGetAdminClient   = jest.mocked(getAdminClient);
const mockGetServerSession = jest.mocked(getServerSession);

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

type FakeCall = { table: string; chain: ReturnType<typeof makeChain> };

function makeDb(tableMap: Record<string, ChainResult>) {
  const _calls: FakeCall[] = [];
  const client = {
    from: jest.fn((table: string) => {
      const chain = makeChain(tableMap[table] ?? { data: null, error: null });
      _calls.push({ table, chain });
      return chain;
    }),
    _calls,
  };
  return client;
}

// ─── Rule fixtures ─────────────────────────────────────────────────────────────

const BASE_RULE: Omit<
  PregnancySafetyRule,
  "id" | "product_category" | "applicable_statuses" | "rule_type" | "user_facing_message"
> = {
  dose_limit_mg:        null,
  block_reason:         "",
  clinical_note:        null,
  evidence_level:       "established",
  trimester_specific:   true,
  source:               null,
  reviewed_by:          null,
  is_active:            true,
  max_dose_value:       null,
  max_dose_unit:        null,
  recommended_dose:     null,
  trimester_dose_varies: null,
  athlete_note:         null,
};

const ASHWAGANDHA_BLOCK: PregnancySafetyRule = {
  ...BASE_RULE,
  id:                  "rule-ashwagandha-block",
  product_category:    "ashwagandha",
  applicable_statuses: ["first_trimester"],
  rule_type:           "hard_block",
  user_facing_message: "Ashwagandha is not safe during the first trimester.",
};

const VIT_A_DOSE_LIMIT: PregnancySafetyRule = {
  ...BASE_RULE,
  id:                  "rule-vita-dose",
  product_category:    "vit_a_retinol_group",
  applicable_statuses: ["first_trimester"],
  rule_type:           "dose_limit",
  user_facing_message: "Vitamin A dose reduced for pregnancy safety.",
  max_dose_value:      3000,
  max_dose_unit:       "IU",
};

const DHA_MONITOR: PregnancySafetyRule = {
  ...BASE_RULE,
  id:                  "rule-dha-monitor",
  product_category:    "dha_omega3",
  applicable_statuses: ["second_trimester"],
  rule_type:           "monitor",
  user_facing_message: "DHA is beneficial.",
  trimester_specific:  false,
};

const MELATONIN_MD_APPROVAL: PregnancySafetyRule = {
  ...BASE_RULE,
  id:                  "rule-melatonin-md",
  product_category:    "melatonin_group",
  applicable_statuses: ["third_trimester"],
  rule_type:           "require_md_approval",
  user_facing_message: "Melatonin requires physician approval in the third trimester.",
  evidence_level:      "probable",
};

// ─── Test 1: getPregnancyRulesForProduct — not_pregnant short-circuit ─────────

describe("getPregnancyRulesForProduct", () => {
  test("1 — status='not_pregnant' returns [] without hitting the DB", async () => {
    mockGetAdminClient.mockClear();
    const result = await getPregnancyRulesForProduct("ashwagandha", "not_pregnant");
    expect(result).toEqual([]);
    expect(mockGetAdminClient).not.toHaveBeenCalled();
  });
});

// ─── Tests 2–6: applyPregnancyGate (pure function) ───────────────────────────

describe("applyPregnancyGate", () => {
  test("2 — ashwagandha + hard_block rule → blocked=true, action='block'", () => {
    const gate = applyPregnancyGate("ashwagandha", [ASHWAGANDHA_BLOCK], 600);
    expect(gate.blocked).toBe(true);
    expect(gate.action).toBe("block");
  });

  test("3 — ashwagandha + no rules → action='allow', blocked=false", () => {
    const gate = applyPregnancyGate("ashwagandha", [], 600);
    expect(gate.action).toBe("allow");
    expect(gate.blocked).toBe(false);
  });

  test("4 — vit_a_retinol_group + dose 5000 > limit 3000 → action='dose_limit', dose_limit=3000", () => {
    const gate = applyPregnancyGate("vit_a_retinol_group", [VIT_A_DOSE_LIMIT], 5000);
    expect(gate.action).toBe("dose_limit");
    expect(gate.blocked).toBe(false);
    expect(gate.dose_limit).toBe(3000);
  });

  test("5 — dha_omega3 + second_trimester rule → action='allow', user_message contains 'recommended during pregnancy'", () => {
    const gate = applyPregnancyGate("dha_omega3", [DHA_MONITOR], 500);
    expect(gate.action).toBe("allow");
    expect(gate.user_message).toContain("recommended during pregnancy");
  });

  test("6 — melatonin_group + require_md_approval rule → action='require_approval', blocked=true", () => {
    const gate = applyPregnancyGate("melatonin_group", [MELATONIN_MD_APPROVAL], 5);
    expect(gate.action).toBe("require_approval");
    expect(gate.blocked).toBe(true);
  });
});

// ─── Tests 7–8: getMandatoryPregnancyDisclaimer ───────────────────────────────

describe("getMandatoryPregnancyDisclaimer", () => {
  test("7 — status='not_pregnant' → returns null", () => {
    expect(getMandatoryPregnancyDisclaimer("not_pregnant")).toBeNull();
  });

  test("8 — status='first_trimester' → returns non-empty string", () => {
    const disclaimer = getMandatoryPregnancyDisclaimer("first_trimester");
    expect(typeof disclaimer).toBe("string");
    expect((disclaimer as string).length).toBeGreaterThan(0);
  });
});

// ─── Test 9: getPregnancyContextForNarrative — all 8 statuses ────────────────

describe("getPregnancyContextForNarrative", () => {
  const ALL_STATUSES = [
    "not_pregnant",
    "trying_to_conceive",
    "first_trimester",
    "second_trimester",
    "third_trimester",
    "postpartum_0_3mo",
    "postpartum_3_6mo",
    "breastfeeding",
  ] as const;

  test("9 — all 8 statuses return a string; not_pregnant returns empty string, others return non-empty", () => {
    for (const status of ALL_STATUSES) {
      expect(typeof getPregnancyContextForNarrative(status)).toBe("string");
    }
    expect(getPregnancyContextForNarrative("not_pregnant")).toBe("");
    for (const status of ALL_STATUSES.filter((s) => s !== "not_pregnant")) {
      expect(getPregnancyContextForNarrative(status).length).toBeGreaterThan(0);
    }
  });
});

// ─── Test 10: POST /api/pregnancy/status — valid status → { status_set } ──────

describe("POST /api/pregnancy/status", () => {
  test("10 — valid status updates user_health_context and returns { status_set }", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    const db = makeDb({
      user_health_context: { data: null, error: null },
      notification_log:    { data: null, error: null },
    });
    mockGetAdminClient.mockReturnValue(db as never);

    const mockReq = {
      json: jest.fn().mockResolvedValue({ status: "first_trimester" }),
    } as never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(mockReq) as any;

    expect(res.status).toBe(200);
    expect(res._body).toEqual({ status_set: "first_trimester" });

    const uhcCall = db._calls.find((c) => c.table === "user_health_context");
    expect(uhcCall).toBeDefined();
    expect(uhcCall!.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ pregnancy_status: "first_trimester" }),
    );
  });
});
