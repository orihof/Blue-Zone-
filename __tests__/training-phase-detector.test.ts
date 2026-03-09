/// __tests__/training-phase-detector.test.ts

// ─── Mocks (must be declared before imports so Jest hoisting applies) ──────────

jest.mock("@/lib/supabase/admin");

// ─── Imports ──────────────────────────────────────────────────────────────────

import { getAdminClient } from "@/lib/supabase/admin";
import {
  detectTrainingPhase,
  savePhaseDetection,
  getEffectiveTrainingPhase,
} from "@/lib/training-phase-detector";

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
 * All getAdminClient() calls within a test return the same db,
 * so mockReturnValueOnce chains are consumed in call order across all functions.
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

const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

/**
 * Build wearable rows ascending by date (as returned by `order(date, {ascending: true})`).
 * All dates fall within the 14-day detection window.
 */
function makeWearableRows(
  rows: Array<{ hrv_rmssd: number; strain_score: number; readiness_score: number }>,
) {
  return rows.map((r, i) => ({
    ...r,
    date: new Date(Date.now() - (rows.length - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  }));
}

// ─── detectTrainingPhase: call order per test ─────────────────────────────────
// 1. wearable_snapshots     select (no maybeSingle)
// 2. user_health_context    select + maybeSingle
// 3. sports_protocols       select + maybeSingle (calendar signal)

// ─── Reset between tests ──────────────────────────────────────────────────────

beforeEach(() => {
  mockGetAdminClient.mockReset();
});

// ─── Tests 1–6: detectTrainingPhase ──────────────────────────────────────────

describe("detectTrainingPhase", () => {
  test("1 — hrv declining + high strain → returns 'build' or 'peak'", async () => {
    // 4 rows (mid=2): first-half HRV avg=59, second-half HRV avg=49 → trend=-16.9% (<-5%)
    // mean strain=16.5 > 14 → strainHigh → detected_phase = 'build'
    const wearableRows = makeWearableRows([
      { hrv_rmssd: 60, strain_score: 16, readiness_score: 75 },
      { hrv_rmssd: 58, strain_score: 15, readiness_score: 72 },
      { hrv_rmssd: 50, strain_score: 17, readiness_score: 70 },
      { hrv_rmssd: 48, strain_score: 18, readiness_score: 65 },
    ]);

    setupDb([
      makeChain({ data: wearableRows, error: null }),  // wearable_snapshots
      makeChain({ data: null, error: null }),           // user_health_context (no manual)
      makeChain({ data: null, error: null }),           // sports_protocols (no event)
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(["build", "peak"]).toContain(result.detected_phase);
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  test("2 — hrv improving + low strain → returns 'recovery' or 'taper'", async () => {
    // 4 rows: first-half HRV avg=41, second-half HRV avg=50 → trend=+21.9% (>+5%)
    // mean strain=6 < 10 → strainLow → detected_phase = 'taper'
    const wearableRows = makeWearableRows([
      { hrv_rmssd: 40, strain_score: 6, readiness_score: 80 },
      { hrv_rmssd: 42, strain_score: 7, readiness_score: 78 },
      { hrv_rmssd: 48, strain_score: 5, readiness_score: 82 },
      { hrv_rmssd: 52, strain_score: 6, readiness_score: 85 },
    ]);

    setupDb([
      makeChain({ data: wearableRows, error: null }),  // wearable_snapshots
      makeChain({ data: null, error: null }),           // user_health_context
      makeChain({ data: null, error: null }),           // sports_protocols
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(["recovery", "taper"]).toContain(result.detected_phase);
  });

  test("3 — readiness < 60 for 5+ consecutive days → returns 'recovery'", async () => {
    // 5 rows all with readiness_score < 60 → maxStreak=5 → recovery (checked before HRV trend)
    const wearableRows = makeWearableRows([
      { hrv_rmssd: 45, strain_score: 12, readiness_score: 52 },
      { hrv_rmssd: 43, strain_score: 13, readiness_score: 50 },
      { hrv_rmssd: 41, strain_score: 11, readiness_score: 48 },
      { hrv_rmssd: 40, strain_score: 14, readiness_score: 55 },
      { hrv_rmssd: 38, strain_score: 15, readiness_score: 45 },
    ]);

    setupDb([
      makeChain({ data: wearableRows, error: null }),  // wearable_snapshots
      makeChain({ data: null, error: null }),           // user_health_context
      makeChain({ data: null, error: null }),           // sports_protocols
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(result.detected_phase).toBe("recovery");
  });

  test("4 — manual training_phase set within 30 days → uses manual phase, confidence >= 0.3", async () => {
    // No wearable data (<3 rows) so wearable signal is skipped.
    // Manual phase "peak" updated 1 day ago → within 30d → overrides, confidence += 0.3
    setupDb([
      makeChain({ data: [], error: null }),             // wearable_snapshots (empty)
      makeChain({
        data: { training_phase: "peak", training_phase_updated_at: ONE_DAY_AGO },
        error: null,
      }),                                              // user_health_context (manual override)
      makeChain({ data: null, error: null }),           // sports_protocols
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(result.detected_phase).toBe("peak");
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
    expect(result.signals_used).toContain("manual_training_phase_override");
  });

  test("5 — no wearable data, no manual phase → returns 'base', confidence=0.4", async () => {
    setupDb([
      makeChain({ data: [], error: null }),             // wearable_snapshots (empty)
      makeChain({ data: null, error: null }),            // user_health_context (no row)
      makeChain({ data: null, error: null }),            // sports_protocols
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(result.detected_phase).toBe("base");
    expect(result.confidence).toBe(0.4);
  });

  test("6 — signals_used array is populated with at least one entry", async () => {
    // Default case (no data) produces signals_used: ['default_base_phase'] (length 1)
    setupDb([
      makeChain({ data: [], error: null }),
      makeChain({ data: null, error: null }),
      makeChain({ data: null, error: null }),
    ]);

    const result = await detectTrainingPhase("user-1");

    expect(result.signals_used.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Test 7: savePhaseDetection ────────────────────────────────────────────────

describe("savePhaseDetection", () => {
  test("7 — inserts to training_phase_detections and updates user_health_context", async () => {
    // Call order: training_phase_detections insert → user_health_context update
    const db = setupDb([
      makeChain({ error: null }),  // training_phase_detections insert
      makeChain({ error: null }),  // user_health_context update
    ]);

    await savePhaseDetection("user-1", {
      detected_phase: "build",
      confidence:     0.6,
      signals_used:   ["wearable_hrv_declining", "wearable_strain_high"],
      reasoning:      "HRV-RMSSD trending down with elevated strain.",
    });

    const tables = (db.from as jest.Mock).mock.calls.map(([t]: [string]) => t);
    expect(tables).toContain("training_phase_detections");
    expect(tables).toContain("user_health_context");
  });
});

// ─── Tests 8–10: getEffectiveTrainingPhase ────────────────────────────────────

describe("getEffectiveTrainingPhase", () => {
  test("8 — manual phase set → returns manual phase (ignores auto-detected)", async () => {
    setupDb([
      makeChain({
        data: { training_phase: "peak", auto_detected_training_phase: "build" },
        error: null,
      }),
    ]);
    await expect(getEffectiveTrainingPhase("user-1")).resolves.toBe("peak");
  });

  test("9 — no manual phase, auto detected → returns auto detected phase", async () => {
    setupDb([
      makeChain({
        data: { training_phase: null, auto_detected_training_phase: "recovery" },
        error: null,
      }),
    ]);
    await expect(getEffectiveTrainingPhase("user-1")).resolves.toBe("recovery");
  });

  test("10 — no manual, no auto detected → returns 'base'", async () => {
    setupDb([
      makeChain({
        data: { training_phase: null, auto_detected_training_phase: null },
        error: null,
      }),
    ]);
    await expect(getEffectiveTrainingPhase("user-1")).resolves.toBe("base");
  });
});
