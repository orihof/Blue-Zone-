/// __tests__/critical-values.test.ts

import type { CriticalValueEvent, UserHealthContextRow } from "@/lib/types/health";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();

const THRESHOLDS = [
  {
    id: "th-ferritin",
    marker_name: "Ferritin",
    critical_high: 1000,
    critical_low: 5,
    critical_high_condition: null,
    critical_low_condition: null,
    immediate_action_text: "Seek immediate medical care",
    practitioner_alert_text: null,
    unit: "ng/mL",
    source: null,
    athlete_critical_low: null,
    athlete_optimal_low: null,
    athlete_optimal_high: null,
    athlete_critical_high: null,
    sex_adjusted: null,
    athlete_note: null,
  },
  {
    id: "th-potassium",
    marker_name: "Potassium",
    critical_high: 6.5,
    critical_low: 2.5,
    critical_high_condition: null,
    critical_low_condition: null,
    immediate_action_text: "Contact physician immediately",
    practitioner_alert_text: null,
    unit: "mEq/L",
    source: null,
    athlete_critical_low: null,
    athlete_optimal_low: null,
    athlete_optimal_high: null,
    athlete_critical_high: null,
    sex_adjusted: null,
    athlete_note: null,
  },
];

const GATED_CTX: Partial<UserHealthContextRow> = {
  protocol_gated_reason:      "Ferritin (critical high)",
  protocol_gated_at:          "2024-01-01T00:00:00Z",
  protocol_gate_acknowledged: false,
};

const SAMPLE_EVENT: CriticalValueEvent = {
  id:                   "",
  user_id:              "",
  marker_name:          "Ferritin",
  observed_value:       1200,
  threshold_triggered:  "critical_high",
  threshold_value:      1000,
  biomarker_result_id:  null,
  alerted_at:           NOW,
  user_acknowledged_at: null,
  practitioner_alerted: false,
  protocol_gated:       false,
  resolved_at:          null,
  notes:                "Seek immediate medical care",
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/supabase/admin");

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/middleware/requireConsent", () => ({
  requireConsent: () => (handler: (req: unknown) => unknown) => handler,
}));

jest.mock("@/lib/ai/generateGoalProtocol", () => ({
  generateGoalProtocol: jest.fn(),
}));

jest.mock("@/lib/db/goal-payload", () => ({
  GOAL_CATEGORIES: { weight_loss: { label: "Weight Loss" } },
}));

// Mock next/server so NextResponse.json returns a plain object we can inspect
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(
      (data: unknown, init?: { status?: number }) =>
        ({ _body: data, status: init?.status ?? 200 }),
    ),
  },
  NextRequest: class {},
}));

// ─── Imports (after mock declarations so hoisting applies) ────────────────────

import { getAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "next-auth";
import {
  checkForCriticalValues,
  gateCriticalProtocol,
  isProtocolGated,
  acknowledgeGate,
} from "@/lib/critical-values";
import { POST } from "@/app/api/goal-prep/generate/route";

const mockGetAdminClient  = jest.mocked(getAdminClient);
const mockGetServerSession = jest.mocked(getServerSession);

// ─── Chain / mock-DB helpers ──────────────────────────────────────────────────

type ChainResult = { data?: unknown; error?: null | { message: string } };

/** Returns a chainable object where every fluent method returns itself.
 *  Awaiting the chain resolves to `result`. */
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

/** Creates a mock Supabase client. Each `from(table)` call creates a fresh chain
 *  resolved to the data defined in `tableMap`. All calls are recorded in `_calls`. */
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

// ─── Tests 1–5: checkForCriticalValues ───────────────────────────────────────

describe("checkForCriticalValues", () => {
  beforeAll(() => {
    // Populate threshold cache — only the first call actually hits the DB mock.
    mockGetAdminClient.mockReturnValue(
      makeDb({ critical_value_thresholds: { data: THRESHOLDS } }) as never,
    );
  });

  test("1 — ferritin 1200 triggers critical_high", async () => {
    const events = await checkForCriticalValues([
      { name: "Ferritin", value: 1200, unit: "ng/mL" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].marker_name).toBe("Ferritin");
    expect(events[0].threshold_triggered).toBe("critical_high");
    expect(events[0].notes).toBe("Seek immediate medical care");
  });

  test("2 — ferritin 68 (normal) → empty array", async () => {
    const events = await checkForCriticalValues([
      { name: "Ferritin", value: 68, unit: "ng/mL" },
    ]);
    expect(events).toHaveLength(0);
  });

  test("3 — potassium 2.3 triggers critical_low", async () => {
    const events = await checkForCriticalValues([
      { name: "Potassium", value: 2.3, unit: "mEq/L" },
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].marker_name).toBe("Potassium");
    expect(events[0].threshold_triggered).toBe("critical_low");
  });

  test("4 — potassium 3.8 (normal) → empty array", async () => {
    const events = await checkForCriticalValues([
      { name: "Potassium", value: 3.8, unit: "mEq/L" },
    ]);
    expect(events).toHaveLength(0);
  });

  test("5 — one critical + one normal → only critical returned", async () => {
    const events = await checkForCriticalValues([
      { name: "Ferritin", value: 1200, unit: "ng/mL" }, // critical_high
      { name: "Potassium", value: 3.8,  unit: "mEq/L" },  // normal
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].marker_name).toBe("Ferritin");
  });
});

// ─── Test 6: gateCriticalProtocol ────────────────────────────────────────────

describe("gateCriticalProtocol", () => {
  test("6 — sets protocol_gated_reason and protocol_gate_acknowledged=false on user_health_context", async () => {
    const db = makeDb({
      practitioner_access:   { data: [] },
      critical_value_events: { data: null },
      user_health_context:   { data: null },
      notification_log:      { data: null },
    });
    mockGetAdminClient.mockReturnValue(db as never);

    await gateCriticalProtocol("user-1", [SAMPLE_EVENT]);

    const uhcCall = db._calls.find((c) => c.table === "user_health_context");
    expect(uhcCall).toBeDefined();
    expect(uhcCall!.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol_gated_reason:      expect.stringContaining("Ferritin"),
        protocol_gate_acknowledged: false,
      }),
    );
  });
});

// ─── Tests 7–8: isProtocolGated ──────────────────────────────────────────────

describe("isProtocolGated", () => {
  test("7 — gated_reason set + acknowledged=false → true", () => {
    const user = {
      protocol_gated_reason:      "Ferritin (critical high)",
      protocol_gated_at:          NOW,
      protocol_gate_acknowledged: false,
    } as unknown as UserHealthContextRow;
    expect(isProtocolGated(user)).toBe(true);
  });

  test("8 — protocol_gate_acknowledged=true → false", () => {
    const user = {
      protocol_gated_reason:      "Ferritin (critical high)",
      protocol_gated_at:          NOW,
      protocol_gate_acknowledged: true,
    } as unknown as UserHealthContextRow;
    expect(isProtocolGated(user)).toBe(false);
  });
});

// ─── Test 9: goal-prep route returns 403 for gated user ──────────────────────

describe("goal-prep /generate route — gated user", () => {
  test("9 — gated user receives { gated: true, recommendations: [] } with status 403", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as never);

    const db = makeDb({
      user_health_context:   { data: GATED_CTX },
      critical_value_events: { data: [] },
    });
    mockGetAdminClient.mockReturnValue(db as never);

    // The gate check happens before body parsing, so req.json() is never called.
    const mockReq = { json: jest.fn().mockResolvedValue({}) } as never;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(mockReq) as any;
    expect(res.status).toBe(403);
    expect(res._body).toMatchObject({ gated: true, recommendations: [] });
  });
});

// ─── Test 10: acknowledgeGate lifts gate when all events acknowledged ─────────

describe("acknowledgeGate", () => {
  test("10 — all events acknowledged → protocol_gate_acknowledged=true", async () => {
    // Both DB calls on critical_value_events resolve to the same data:
    //   - update call:  error=null (ignores data)
    //   - select call:  data=[acknowledged event] → allAcknowledged=true
    const db = makeDb({
      critical_value_events: {
        data: [{ id: "event-1", user_acknowledged_at: NOW }], // already stamped
      },
      user_health_context: { data: null },
    });
    mockGetAdminClient.mockReturnValue(db as never);

    await acknowledgeGate("user-1", "event-1", "provider_seen");

    const uhcCall = db._calls.find((c) => c.table === "user_health_context");
    expect(uhcCall).toBeDefined();
    expect(uhcCall!.chain.update).toHaveBeenCalledWith({ protocol_gate_acknowledged: true });
  });
});
