/// __tests__/outcome-tracker.test.ts

// ─── Mocks (hoisted before imports) ──────────────────────────────────────────

jest.mock("@/lib/supabase/admin");
jest.mock("next-auth",            () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth",           () => ({ authOptions: {} }));
jest.mock("@/middleware/requireConsent", () => ({
  requireConsent: () => (handler: (req: unknown) => unknown) => handler,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { getAdminClient }  from "@/lib/supabase/admin";
import { getServerSession } from "next-auth";
import {
  evaluateMilestones,
  generateOutcomeSummary,
  createMilestone,
  getOutcomeNarrativeContext,
  type OutcomeSummary,
} from "@/lib/outcome-tracker";
import { POST } from "@/app/api/outcomes/milestones/route";
import type { NextRequest } from "next/server";

// ─── Typed mocks ──────────────────────────────────────────────────────────────

const mockGetAdminClient = jest.mocked(getAdminClient);
const mockSession        = jest.mocked(getServerSession);

// ─── Chain / mock-DB helpers ──────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: null | { message: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeChain(result: ChainResult): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  const methods = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "is", "not", "in", "gte", "lte", "gt", "lt",
    "ilike", "like", "order", "limit", "maybeSingle", "single",
    "filter", "match", "contains",
  ];
  for (const m of methods) chain[m] = jest.fn().mockReturnValue(chain);
  chain.then    = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  chain.catch   = (rej: (v: unknown) => unknown) => Promise.resolve(result).catch(rej);
  chain.finally = (cb: () => void)               => Promise.resolve(result).finally(cb);
  return chain;
}

function setupDb(chains: ReturnType<typeof makeChain>[]) {
  const db = { from: jest.fn() };
  for (const chain of chains) (db.from as jest.Mock).mockReturnValueOnce(chain);
  mockGetAdminClient.mockReturnValue(db as never);
  return db;
}

// ─── Request factory for API route tests ─────────────────────────────────────

function makeReq(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
    nextUrl: { pathname: "/api/outcomes/milestones" },
  } as unknown as NextRequest;
}

// ─── Shared milestone row fixture ─────────────────────────────────────────────
// baseline = 10, target = 50  → range = 40

function milestoneRow(overrides: Record<string, unknown> = {}) {
  return {
    id:              "ms-1",
    narrative_text:  "Ferritin above 50",
    milestone_value: "50",    // target
    previous_value:  "10",    // baseline
    achieved_at:     null,
    ...overrides,
  };
}

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetAdminClient.mockReset();
  mockSession.mockReset();
});

// ─── Tests 1–5: evaluateMilestones ───────────────────────────────────────────

describe("evaluateMilestones", () => {
  test("1 — currentValue at 100% of target → status='achieved', progress_pct=100", async () => {
    // progress = (50 - 10) / (50 - 10) * 100 = 100 → achieved + UPDATE
    setupDb([
      makeChain({ data: [milestoneRow()], error: null }),  // SELECT
      makeChain({ error: null }),                          // UPDATE (newly achieved)
    ]);

    const results = await evaluateMilestones("user-1", "Ferritin", 50);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("achieved");
    expect(results[0].progress_pct).toBe(100);
  });

  test("2 — currentValue at 50% of target → status='in_progress', progress_pct=50", async () => {
    // progress = (30 - 10) / (50 - 10) * 100 = 50
    setupDb([
      makeChain({ data: [milestoneRow()], error: null }),  // SELECT only (not achieved)
    ]);

    const results = await evaluateMilestones("user-1", "Ferritin", 30);

    expect(results[0].status).toBe("in_progress");
    expect(results[0].progress_pct).toBe(50);
  });

  test("3 — currentValue at baseline → status='not_started', progress_pct=0", async () => {
    // progress = (10 - 10) / (50 - 10) * 100 = 0
    setupDb([
      makeChain({ data: [milestoneRow()], error: null }),
    ]);

    const results = await evaluateMilestones("user-1", "Ferritin", 10);

    expect(results[0].status).toBe("not_started");
    expect(results[0].progress_pct).toBe(0);
  });

  test("4 — currentValue below baseline → progress_pct clamped to 0", async () => {
    // progress = (5 - 10) / (50 - 10) * 100 = -12.5 → clamped to 0
    setupDb([
      makeChain({ data: [milestoneRow()], error: null }),
    ]);

    const results = await evaluateMilestones("user-1", "Ferritin", 5);

    expect(results[0].progress_pct).toBe(0);
    expect(results[0].status).toBe("not_started");
  });

  test("5 — newly achieved milestone → achieved_at updated to NOW()", async () => {
    const updateChain = makeChain({ error: null });

    setupDb([
      makeChain({ data: [milestoneRow()], error: null }),  // SELECT
      updateChain,                                         // UPDATE
    ]);

    const before = Date.now();
    const results = await evaluateMilestones("user-1", "Ferritin", 50);
    const after   = Date.now();

    // achieved_at should be an ISO string representing approximately NOW
    expect(results[0].achieved_at).toBeDefined();
    const achievedMs = new Date(results[0].achieved_at!).getTime();
    expect(achievedMs).toBeGreaterThanOrEqual(before - 1000);
    expect(achievedMs).toBeLessThanOrEqual(after  + 1000);

    // UPDATE must have been called with an achieved_at timestamp
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ achieved_at: expect.any(String) }),
    );
  });
});

// ─── Tests 6–7: generateOutcomeSummary ───────────────────────────────────────
// DB call order: personal_baseline_history SELECT → outcome_milestones SELECT → outcome_summaries UPSERT

describe("generateOutcomeSummary", () => {
  test("6 — 3 improved markers, 1 declined → overall_trajectory='positive'", async () => {
    // improved - declined = 3 - 1 = 2 ≥ 2 → 'positive'
    const historyRows = [
      // Vitamin D: 20 → 35, changePct = +75% (improving)
      { marker_name: "Vitamin D", value_at: 20, measured_date: "2025-01-01" },
      { marker_name: "Vitamin D", value_at: 35, measured_date: "2025-03-01" },
      // Ferritin: 15 → 25, changePct = +67% (improving)
      { marker_name: "Ferritin",  value_at: 15, measured_date: "2025-01-01" },
      { marker_name: "Ferritin",  value_at: 25, measured_date: "2025-03-01" },
      // B12: 200 → 350, changePct = +75% (improving)
      { marker_name: "B12",       value_at: 200, measured_date: "2025-01-01" },
      { marker_name: "B12",       value_at: 350, measured_date: "2025-03-01" },
      // LDL: 100 → 85, changePct = -15% (declining)
      { marker_name: "LDL",       value_at: 100, measured_date: "2025-01-01" },
      { marker_name: "LDL",       value_at: 85,  measured_date: "2025-03-01" },
    ];

    setupDb([
      makeChain({ data: historyRows, error: null }),  // personal_baseline_history
      makeChain({ data: [],          error: null }),  // outcome_milestones
      makeChain({ error: null }),                    // outcome_summaries upsert
    ]);

    const summary = await generateOutcomeSummary("user-1", "snap-1");

    expect(summary.overall_trajectory).toBe("positive");
    expect(summary.markers_improved).toContain("Vitamin D");
    expect(summary.markers_improved).toContain("Ferritin");
    expect(summary.markers_improved).toContain("B12");
    expect(summary.markers_declined).toContain("LDL");
  });

  test("7 — fewer than 3 markers with data → overall_trajectory='insufficient_data'", async () => {
    // Only 2 markers → totalMarkers < 3 → insufficient_data
    const historyRows = [
      { marker_name: "Vitamin D", value_at: 20, measured_date: "2025-01-01" },
      { marker_name: "Vitamin D", value_at: 35, measured_date: "2025-03-01" },
      { marker_name: "Ferritin",  value_at: 15, measured_date: "2025-01-01" },
      { marker_name: "Ferritin",  value_at: 25, measured_date: "2025-03-01" },
    ];

    setupDb([
      makeChain({ data: historyRows, error: null }),
      makeChain({ data: [],          error: null }),
      makeChain({ error: null }),
    ]);

    const summary = await generateOutcomeSummary("user-1", "snap-1");

    expect(summary.overall_trajectory).toBe("insufficient_data");
  });
});

// ─── Test 8: createMilestone ──────────────────────────────────────────────────
// DB call order: personal_biomarker_baselines SELECT → outcome_milestones INSERT

describe("createMilestone", () => {
  test("8 — inserts with baseline_value from personal_biomarker_baselines", async () => {
    const insertChain = makeChain({
      data:  { id: "ms-new", created_at: "2025-06-01T00:00:00Z" },
      error: null,
    });

    const db = setupDb([
      makeChain({ data: { personal_mean: 25 }, error: null }),  // personal_biomarker_baselines
      insertChain,                                              // outcome_milestones INSERT
    ]);

    const result = await createMilestone("user-1", {
      marker_name:    "Ferritin",
      milestone_name: "Ferritin above 50",
      target_value:   50,
      target_unit:    "ng/mL",
    });

    // INSERT called with previous_value = "25" (personal_mean as string)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ previous_value: "25" }),
    );

    expect(result.baseline_value).toBe(25);
    expect(result.target_value).toBe(50);
    expect(result.status).toBe("not_started");
    expect(result.progress_pct).toBe(0);

    // Verify correct tables were accessed in order
    const tables = (db.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(tables[0]).toBe("personal_biomarker_baselines");
    expect(tables[1]).toBe("outcome_milestones");
  });
});

// ─── Test 9: getOutcomeNarrativeContext ───────────────────────────────────────

describe("getOutcomeNarrativeContext", () => {
  test("9 — achieved milestone is mentioned by name in output string", () => {
    const summary: OutcomeSummary = {
      protocol_snapshot_id: "snap-1",
      markers_improved:     ["Vitamin D", "Ferritin"],
      markers_declined:     [],
      markers_stable:       ["B12"],
      milestones_achieved:  [
        {
          milestone_id:   "ms-1",
          milestone_name: "Ferritin above 50",
          status:         "achieved",
          progress_pct:   100,
          achieved_at:    "2025-06-01T00:00:00Z",
        },
      ],
      overall_trajectory: "positive",
      narrative:          "",
    };

    const context = getOutcomeNarrativeContext(summary);

    expect(typeof context).toBe("string");
    expect(context.length).toBeGreaterThan(0);
    expect(context).toContain("Ferritin above 50");
  });
});

// ─── Test 10: POST /api/outcomes/milestones ───────────────────────────────────

describe("POST /api/outcomes/milestones", () => {
  test("10 — missing marker_name returns 400", async () => {
    mockSession.mockResolvedValue({
      user: { id: "user-1", name: "Alice", email: "alice@example.com" },
    } as never);

    const req = makeReq({
      // marker_name intentionally omitted
      milestone_name: "Reach healthy ferritin",
      target_value:   50,
      target_unit:    "ng/mL",
    });

    const res  = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/marker_name/i);
  });
});
