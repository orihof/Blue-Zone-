/// __tests__/adverse-events.test.ts

// ─── Mocks (must be declared before imports so Jest hoisting applies) ──────────

jest.mock("@/lib/supabase/admin");

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/middleware/requireConsent", () => ({
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
  submitAdverseEvent,
  updateAdverseAggregates,
  getAdverseEventPrompts,
  shouldSuppressProduct,
} from "@/lib/adverse-events";
import { POST } from "@/app/api/adverse-events/route";

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

/**
 * Creates a fresh db mock whose `from()` returns each chain in order.
 * All calls to getAdminClient() within a test return the same db, so
 * the mockReturnValueOnce queue spans all functions called in that test.
 */
function setupDb(chains: ReturnType<typeof makeChain>[]) {
  const db = { from: jest.fn() };
  for (const chain of chains) {
    (db.from as jest.Mock).mockReturnValueOnce(chain);
  }
  mockGetAdminClient.mockReturnValue(db as never);
  return db;
}

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW    = new Date().toISOString();
const RECENT = new Date(Date.now() -  5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago (inside 30d + 90d)

function makeReport(severity: string, reported_at = NOW) {
  return {
    id:                  `report-${Math.random().toString(36).slice(2)}`,
    user_id:             "user-1",
    product_id:          "prod-1",
    severity,
    reported_at,
    notes:               "test symptom",
    action_taken:        "nothing",
    event_type:          [],
    onset_days:          null,
    duration_days:       null,
    protocol_snapshot_id: null,
    resolved_at:         null,
    reviewed_by_rd:      false,
    rd_notes:            null,
  };
}

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetAdminClient.mockReset();
  mockGetServerSession.mockReset();
});

// ─── Tests 1–2: submitAdverseEvent ───────────────────────────────────────────

describe("submitAdverseEvent", () => {
  test("1 — mild severity → inserts to adverse_event_reports, no notification_log row", async () => {
    const reportRow = makeReport("mild");

    // Call order: insert (report) → select (aggregates) → upsert (aggregates)
    const db = setupDb([
      makeChain({ data: reportRow, error: null }), // adverse_event_reports insert
      makeChain({ data: [], error: null }),         // adverse_event_reports select (aggregates)
      makeChain({ error: null }),                  // adverse_event_aggregates upsert
    ]);

    const result = await submitAdverseEvent("user-1", {
      product_id:          "prod-1",
      symptom_description: "mild headache",
      severity:            "mild",
    });

    expect(result.severity).toBe("mild");
    expect(result.id).toBe(reportRow.id);

    const tables = (db.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(tables).toContain("adverse_event_reports");
    expect(tables).not.toContain("notification_log");
  });

  test("2 — significant severity → inserts report AND notification_log row with urgency=1", async () => {
    const reportRow = makeReport("significant");
    const notifChain = makeChain({ error: null });

    // Call order: insert → select (aggregates) → upsert (aggregates) → notification_log insert
    const db = setupDb([
      makeChain({ data: reportRow, error: null }), // adverse_event_reports insert
      makeChain({ data: [], error: null }),         // adverse_event_reports select (aggregates)
      makeChain({ error: null }),                  // adverse_event_aggregates upsert
      notifChain,                                  // notification_log insert
    ]);

    await submitAdverseEvent("user-1", {
      product_id:          "prod-1",
      symptom_description: "severe reaction",
      severity:            "significant",
    });

    const tables = (db.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(tables).toContain("notification_log");
    expect(notifChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ urgency: 1 }),
    );
  });
});

// ─── Test 3: updateAdverseAggregates ─────────────────────────────────────────

describe("updateAdverseAggregates", () => {
  test("3 — 3 mild reports → aggregate counts updated correctly", async () => {
    const mildRow = { severity: "mild", reported_at: RECENT };
    const upsertChain = makeChain({ error: null });

    // Call order: select (reports) → upsert (aggregates)
    setupDb([
      makeChain({ data: [mildRow, mildRow, mildRow], error: null }), // adverse_event_reports select
      upsertChain,                                                    // adverse_event_aggregates upsert
    ]);

    await updateAdverseAggregates("prod-1");

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id:                   "prod-1",
        total_reports:                3,
        reports_last_90d:             3,
        significant_reports_last_90d: 0,
      }),
      expect.anything(),
    );
  });
});

// ─── Tests 4–7: shouldSuppressProduct ────────────────────────────────────────

describe("shouldSuppressProduct", () => {
  test("4 — one significant report → returns true", async () => {
    setupDb([
      makeChain({ data: [{ severity: "significant", reported_at: NOW }], error: null }),
    ]);
    await expect(shouldSuppressProduct("prod-1", "user-1")).resolves.toBe(true);
  });

  test("5 — 3 recent mild reports (within 30 days) → returns true", async () => {
    setupDb([
      makeChain({
        data: [
          { severity: "mild", reported_at: RECENT },
          { severity: "mild", reported_at: RECENT },
          { severity: "mild", reported_at: RECENT },
        ],
        error: null,
      }),
    ]);
    await expect(shouldSuppressProduct("prod-1", "user-1")).resolves.toBe(true);
  });

  test("6 — 2 mild reports → returns false", async () => {
    setupDb([
      makeChain({
        data: [
          { severity: "mild", reported_at: RECENT },
          { severity: "mild", reported_at: RECENT },
        ],
        error: null,
      }),
    ]);
    await expect(shouldSuppressProduct("prod-1", "user-1")).resolves.toBe(false);
  });

  test("7 — no reports → returns false", async () => {
    setupDb([
      makeChain({ data: [], error: null }),
    ]);
    await expect(shouldSuppressProduct("prod-1", "user-1")).resolves.toBe(false);
  });
});

// ─── Test 8: getAdverseEventPrompts ──────────────────────────────────────────

describe("getAdverseEventPrompts", () => {
  test("8 — returns prompts ordered by prompted_at ASC", async () => {
    const older = {
      id: "p1", user_id: "user-1", product_id: "prod-1",
      prompt_trigger: "follow_up_1", prompted_at: RECENT,
      responded_at: null, response: null,
    };
    const newer = {
      id: "p2", user_id: "user-1", product_id: "prod-1",
      prompt_trigger: "follow_up_2", prompted_at: NOW,
      responded_at: null, response: null,
    };

    const promptChain = makeChain({ data: [older, newer], error: null });
    setupDb([promptChain]);

    const result = await getAdverseEventPrompts("prod-1", "user-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("p1"); // older first (ASC order)
    expect(result[1].id).toBe("p2");
    expect(promptChain.order).toHaveBeenCalledWith("prompted_at", { ascending: true });
  });
});

// ─── Tests 9–10: POST /api/adverse-events ────────────────────────────────────

describe("POST /api/adverse-events", () => {
  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({ user: { id: "user-1" } } as never);
  });

  test("9 — significant event + prior significant report → product_suppressed=true", async () => {
    const reportRow  = makeReport("significant");
    const sigRow     = { severity: "significant", reported_at: NOW };

    /**
     * DB call order across submitAdverseEvent + shouldSuppressProduct + route snapshot:
     *   1. adverse_event_reports    insert   → report row
     *   2. adverse_event_reports    select   → [sigRow]     (updateAdverseAggregates)
     *   3. adverse_event_aggregates upsert   → ok
     *   4. notification_log         insert   → ok           (significant)
     *   5. adverse_event_reports    select   → [sigRow]     (shouldSuppressProduct)
     *   6. protocol_snapshots       select   → snapshot
     *   7. protocol_snapshots       update   → ok
     */
    setupDb([
      makeChain({ data: reportRow, error: null }),              // 1
      makeChain({ data: [sigRow], error: null }),               // 2
      makeChain({ error: null }),                              // 3
      makeChain({ error: null }),                              // 4
      makeChain({ data: [sigRow], error: null }),               // 5
      makeChain({ data: { id: "snap-1", product_ids: ["prod-1"] }, error: null }), // 6
      makeChain({ error: null }),                              // 7
    ]);

    const req = {
      json: jest.fn().mockResolvedValue({
        product_id:          "prod-1",
        symptom_description: "severe reaction",
        severity:            "significant",
      }),
    } as never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req) as any;

    expect(res.status).toBe(200);
    expect(res._body.report_saved).toBe(true);
    expect(res._body.product_suppressed).toBe(true);
  });

  test("10 — mild event, first report only → product_suppressed=false", async () => {
    const reportRow = makeReport("mild");
    const mildRow   = { severity: "mild", reported_at: NOW };

    /**
     * DB call order:
     *   1. adverse_event_reports    insert → report row
     *   2. adverse_event_reports    select → [mildRow]     (updateAdverseAggregates)
     *   3. adverse_event_aggregates upsert → ok
     *   4. adverse_event_reports    select → [mildRow]     (shouldSuppressProduct → false)
     *   (no notification_log, no snapshot cleanup)
     */
    setupDb([
      makeChain({ data: reportRow, error: null }),  // 1
      makeChain({ data: [mildRow], error: null }),  // 2
      makeChain({ error: null }),                  // 3
      makeChain({ data: [mildRow], error: null }),  // 4
    ]);

    const req = {
      json: jest.fn().mockResolvedValue({
        product_id:          "prod-1",
        symptom_description: "mild headache",
        severity:            "mild",
      }),
    } as never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req) as any;

    expect(res.status).toBe(200);
    expect(res._body.report_saved).toBe(true);
    expect(res._body.product_suppressed).toBe(false);
  });
});
