/// __tests__/personal-baselines.test.ts

// ─── Mocks (must be declared before imports so Jest hoisting applies) ──────────

jest.mock("@/lib/supabase/admin");

// ─── Imports ──────────────────────────────────────────────────────────────────

import { getAdminClient } from "@/lib/supabase/admin";
import {
  upsertBaseline,
  getTrendDirection,
  getBaselineContext,
  getBaselineNarrativeContext,
} from "@/lib/personal-baselines";

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

const NOW  = new Date().toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const BASE_BASELINE = {
  user_id:               "user-1",
  marker_name:           "ldl",
  personal_mean:         100,
  personal_std_dev:      null,
  personal_optimal_low:  null,
  personal_optimal_high: null,
  data_points:           1,
  confidence:            0,
  first_sample_date:     "2026-01-01",
  last_sample_date:      "2026-01-10",
  last_computed_at:      NOW,
};

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetAdminClient.mockReset();
});

// ─── Tests 1–3: upsertBaseline ────────────────────────────────────────────────

describe("upsertBaseline", () => {
  test("1 — new marker → inserts row with data_points=1", async () => {
    const inserted = { ...BASE_BASELINE, personal_mean: 80, data_points: 1 };

    // Call order: select (no existing) → history insert → baseline insert
    const db = setupDb([
      makeChain({ data: null, error: null }),       // personal_biomarker_baselines select → no row
      makeChain({ error: null }),                    // personal_baseline_history insert
      makeChain({ data: inserted, error: null }),    // personal_biomarker_baselines insert
    ]);

    const result = await upsertBaseline("user-1", "ldl", 80, "mg/dL", "lab");

    expect(result.data_points).toBe(1);
    expect(result.personal_mean).toBe(80);

    const tables = (db.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(tables[0]).toBe("personal_biomarker_baselines"); // select
    expect(tables[1]).toBe("personal_baseline_history");    // history insert
    expect(tables[2]).toBe("personal_biomarker_baselines"); // baseline insert
  });

  test("2 — existing marker → increments data_points and recomputes personal_mean", async () => {
    const existing = { personal_mean: 100, data_points: 1, first_sample_date: "2026-01-01" };
    // new value = 120 → newMean = (100*1 + 120)/2 = 110, newCount = 2
    const updated  = { ...BASE_BASELINE, personal_mean: 110, data_points: 2 };

    // Call order: select (existing) → history insert → baseline update
    setupDb([
      makeChain({ data: existing, error: null }),    // personal_biomarker_baselines select
      makeChain({ error: null }),                    // personal_baseline_history insert
      makeChain({ data: updated, error: null }),     // personal_biomarker_baselines update
    ]);

    const result = await upsertBaseline("user-1", "ldl", 120, "mg/dL", "lab");

    expect(result.data_points).toBe(2);
    expect(result.personal_mean).toBe(110);
  });

  test("3 — existing marker → inserts new value into personal_baseline_history", async () => {
    const existing  = { personal_mean: 100, data_points: 1, first_sample_date: "2026-01-01" };
    const updated   = { ...BASE_BASELINE, personal_mean: 115, data_points: 2 };
    const histChain = makeChain({ error: null });

    // Call order: select → history insert (histChain) → baseline update
    setupDb([
      makeChain({ data: existing, error: null }),    // personal_biomarker_baselines select
      histChain,                                     // personal_baseline_history insert ← assert
      makeChain({ data: updated, error: null }),     // personal_biomarker_baselines update
    ]);

    await upsertBaseline("user-1", "ldl", 130, "mg/dL", "lab");

    expect(histChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ value_at: 130, marker_name: "ldl" }),
    );
  });
});

// ─── Tests 4–8: getTrendDirection ─────────────────────────────────────────────

describe("getTrendDirection", () => {
  test("4 — fewer than 2 readings → returns 'insufficient_data'", async () => {
    // Only 1 row returned → rows.length < 2 → insufficient_data
    setupDb([
      makeChain({ data: [{ value_at: 50, created_at: NOW }], error: null }),
    ]);
    await expect(getTrendDirection("user-1", "vitamin_d")).resolves.toBe("insufficient_data");
  });

  test("5 — vitamin_d rising 10% → returns 'improving'", async () => {
    // rows ordered DESC: newest first — 55 now, 50 past (+10%, higher-is-better → improving)
    setupDb([
      makeChain({
        data: [
          { value_at: 55, created_at: NOW  },
          { value_at: 50, created_at: PAST },
        ],
        error: null,
      }),
    ]);
    await expect(getTrendDirection("user-1", "vitamin_d")).resolves.toBe("improving");
  });

  test("6 — vitamin_d declining 10% → returns 'declining'", async () => {
    // 45 now vs 50 past (−10%, higher-is-better → declining)
    setupDb([
      makeChain({
        data: [
          { value_at: 45, created_at: NOW  },
          { value_at: 50, created_at: PAST },
        ],
        error: null,
      }),
    ]);
    await expect(getTrendDirection("user-1", "vitamin_d")).resolves.toBe("declining");
  });

  test("7 — value within 5% variance → returns 'stable'", async () => {
    // pctChange = (102-100)/100 = 2% ≤ 5% → stable regardless of direction
    setupDb([
      makeChain({
        data: [
          { value_at: 102, created_at: NOW  },
          { value_at: 100, created_at: PAST },
        ],
        error: null,
      }),
    ]);
    await expect(getTrendDirection("user-1", "ldl")).resolves.toBe("stable");
  });

  test("8 — LDL rising 10% (lower-is-better marker) → returns 'declining'", async () => {
    // ldl NOT in HIGHER_IS_BETTER; pctChange = +10% → declining
    setupDb([
      makeChain({
        data: [
          { value_at: 110, created_at: NOW  },
          { value_at: 100, created_at: PAST },
        ],
        error: null,
      }),
    ]);
    await expect(getTrendDirection("user-1", "ldl")).resolves.toBe("declining");
  });
});

// ─── Test 9: getBaselineContext ───────────────────────────────────────────────

describe("getBaselineContext", () => {
  test("9 — 3 markers → returns array of 3 BaselineContext with trend populated", async () => {
    const batchRows = [
      { marker_name: "vitamin_d", personal_mean: 55, data_points: 3, personal_optimal_low: null, personal_optimal_high: null },
      { marker_name: "ldl",       personal_mean: 90, data_points: 2, personal_optimal_low: null, personal_optimal_high: null },
      { marker_name: "ferritin",  personal_mean: 80, data_points: 4, personal_optimal_low: 30,   personal_optimal_high: 120  },
    ];

    /**
     * DB call order:
     *   1. personal_biomarker_baselines  select (batch)
     *   2. personal_baseline_history     select (vitamin_d getTrendDirection)
     *   3. personal_baseline_history     select (ldl getTrendDirection)
     *   4. personal_baseline_history     select (ferritin getTrendDirection → 1 row → insufficient_data)
     */
    setupDb([
      makeChain({ data: batchRows, error: null }),
      // vitamin_d: newest=55, older=50 → +10%, higher-is-better → improving
      makeChain({ data: [{ value_at: 55, created_at: NOW }, { value_at: 50, created_at: PAST }], error: null }),
      // ldl: newest=90, older=85 → +~6%, lower-is-better → declining
      makeChain({ data: [{ value_at: 90, created_at: NOW }, { value_at: 85, created_at: PAST }], error: null }),
      // ferritin: only 1 reading → insufficient_data
      makeChain({ data: [{ value_at: 80, created_at: NOW }], error: null }),
    ]);

    const result = await getBaselineContext("user-1", ["vitamin_d", "ldl", "ferritin"]);

    expect(result).toHaveLength(3);

    const vd = result.find((r) => r.marker_name === "vitamin_d")!;
    expect(vd.current_value).toBe(55);
    expect(vd.trend).toBe("improving");
    expect(vd.data_points_count).toBe(3);

    const ldl = result.find((r) => r.marker_name === "ldl")!;
    expect(ldl.current_value).toBe(90);
    expect(ldl.trend).toBe("declining");

    const ferritin = result.find((r) => r.marker_name === "ferritin")!;
    expect(ferritin.trend).toBe("insufficient_data");
    expect(ferritin.personal_optimal_low).toBe(30);
    expect(ferritin.personal_optimal_high).toBe(120);
  });
});

// ─── Test 10: getBaselineNarrativeContext ─────────────────────────────────────

describe("getBaselineNarrativeContext", () => {
  test("10 — mix of improving/declining/stable/insufficient_data → returns correctly formatted string", () => {
    const baselines = [
      { marker_name: "vitamin_d", current_value: 55,  trend: "improving"        as const, data_points_count: 3 },
      { marker_name: "b12",       current_value: 400, trend: "improving"        as const, data_points_count: 2 },
      { marker_name: "ldl",       current_value: 110, trend: "declining"        as const, data_points_count: 5 },
      { marker_name: "glucose",   current_value: 90,  trend: "stable"           as const, data_points_count: 4 },
      { marker_name: "tsh",       current_value: 2.5, trend: "insufficient_data" as const, data_points_count: 1 },
    ];

    const narrative = getBaselineNarrativeContext(baselines);

    // 4 of 5 have sufficient data (tsh excluded)
    expect(narrative).toContain("4 markers");
    expect(narrative).toContain("Improving: vitamin_d, b12");
    expect(narrative).toContain("Declining: ldl");
    expect(narrative).toContain("Stable: glucose");
    expect(narrative).not.toContain("tsh");
  });
});
