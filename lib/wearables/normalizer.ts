/// lib/wearables/normalizer.ts
import { randomUUID } from "crypto";
import type { NormalizedWearableData } from "@/lib/types/health";
import type { WearableSource } from "@/lib/db/schema";

// ============================================================
// HELPERS
// ============================================================

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

// Convert milliseconds to minutes, clamped to 0
function msToMin(ms: number): number {
  return Math.max(0, Math.round(ms / 60000));
}

// Normalise WHOOP strain (0–21) to 0–100
function whoopStrainToScore(strain: number): number {
  return clamp(Math.round((strain / 21) * 100));
}

// ============================================================
// WHOOP  (v2 recovery/sleep/strain export)
// ============================================================

export function normalizeWhoop(data: unknown): NormalizedWearableData {
  const d = data as Record<string, unknown>;

  const cycle     = d.cycle    as Record<string, unknown> | undefined ?? d;
  const score     = (cycle.score ?? cycle) as Record<string, unknown>;
  const sleep     = d.sleep as Record<string, unknown> | undefined ?? {};
  const sleepScore = (sleep.score ?? {}) as Record<string, unknown>;
  const stageSummary = (sleepScore.stage_summary ?? {}) as Record<string, unknown>;
  const strain    = d.strain as Record<string, unknown> | undefined ?? {};
  const strainScore = (strain.score ?? {}) as Record<string, unknown>;

  const hrv           = safeNum(score.hrv_rmssd_milli);
  const restingHR     = safeNum(score.resting_heart_rate);
  const recoveryScore = safeNum(score.recovery_score);
  const sleepPerf     = safeNum(sleepScore.sleep_performance_percentage);
  const deepSleepMs   = safeNum(stageSummary.total_slow_wave_sleep_time_milli);
  const remSleepMs    = safeNum(stageSummary.total_rem_sleep_time_milli);
  const strainRaw     = safeNum(strainScore.strain_score);

  return {
    hrv:              hrv,
    restingHR:        restingHR,
    sleepScore:       clamp(sleepPerf),
    deepSleepMinutes: msToMin(deepSleepMs),
    remSleepMinutes:  msToMin(remSleepMs),
    recoveryScore:    clamp(recoveryScore),
    strainScore:      whoopStrainToScore(strainRaw),
    readinessScore:   clamp(recoveryScore), // WHOOP doesn't have readiness; proxy with recovery
    steps:            safeNum(d.steps ?? d.step_count ?? strainScore.steps),
    activeCalories:   Math.round(safeNum(strainScore.kilojoule) * 0.239), // kJ → kcal
    date:             String(d.date ?? d.created_at ?? new Date().toISOString().slice(0, 10)),
    source:           "whoop",
  };
}

// ============================================================
// OURA  (Ring v2 readiness/sleep/activity export)
// ============================================================

export function normalizeOura(data: unknown): NormalizedWearableData {
  const d = data as Record<string, unknown>;

  // Accept both single-day and API array responses
  const readinessArr = Array.isArray(d.readiness)
    ? d.readiness
    : Array.isArray((d.data as unknown[]))
    ? (d.data as unknown[])
    : [d];
  const readiness = (readinessArr[0] ?? {}) as Record<string, unknown>;

  const sleepArr = Array.isArray(d.sleep) ? d.sleep : [d.sleep ?? {}];
  const sleep = (sleepArr[0] ?? {}) as Record<string, unknown>;

  const activity = (d.activity ?? {}) as Record<string, unknown>;

  const readinessScore  = safeNum(readiness.score);
  const hrvBalance      = safeNum(readiness.hrv_balance ?? (readiness.contributors as Record<string, unknown> | undefined)?.hrv_balance);
  const sleepScore      = safeNum(sleep.score);
  const deepSleepSec    = safeNum(sleep.deep_sleep_duration);
  const remSleepSec     = safeNum(sleep.rem_sleep_duration);
  const avgHrv          = safeNum(sleep.average_hrv);
  const lowestHR        = safeNum(sleep.lowest_heart_rate);

  return {
    hrv:              avgHrv || hrvBalance,
    restingHR:        lowestHR,
    sleepScore:       clamp(sleepScore),
    deepSleepMinutes: Math.round(deepSleepSec / 60),
    remSleepMinutes:  Math.round(remSleepSec / 60),
    recoveryScore:    clamp(readinessScore),
    strainScore:      clamp(safeNum(activity.score ?? activity.activity_score)),
    readinessScore:   clamp(readinessScore),
    steps:            safeNum(activity.steps),
    activeCalories:   safeNum(activity.active_calories),
    date:             String(readiness.day ?? sleep.day ?? new Date().toISOString().slice(0, 10)),
    source:           "oura",
  };
}

// ============================================================
// GARMIN  (Connect dailySummaries export)
// ============================================================

export function normalizeGarmin(data: unknown): NormalizedWearableData {
  const d = data as Record<string, unknown>;

  // Accept single summary or array
  const summaries = Array.isArray(d.dailySummaries)
    ? d.dailySummaries
    : Array.isArray(d)
    ? (d as unknown[])
    : [d];
  const summary = (summaries[0] ?? {}) as Record<string, unknown>;

  const hrData    = (summary.heartRateData ?? {}) as Record<string, unknown>;
  const wellness  = (summary.wellnessData ?? {}) as Record<string, unknown>;
  const hrvData   = (wellness.hrv ?? {}) as Record<string, unknown>;
  const sleepData = (summary.sleepData ?? {}) as Record<string, unknown>;
  const sleepScores = (sleepData.sleepScores ?? {}) as Record<string, unknown>;
  const overall     = (sleepScores.overall ?? {}) as Record<string, unknown>;

  const hrv       = safeNum(hrvData.lastNight ?? hrvData.weeklyAverage);
  const restingHR = safeNum(hrData.restingHeartRate);

  const deepSec     = safeNum(sleepData.deepSleepSeconds);
  const remSec      = safeNum(sleepData.remSleepSeconds);
  const sleepScore  = safeNum(overall.value ?? sleepScores.overall);

  // Garmin doesn't have a direct recovery/readiness score — estimate from HRV and stress
  const stressLevel   = safeNum(wellness.averageStressLevel ?? 50);
  const recoveryProxy = clamp(100 - stressLevel);

  return {
    hrv:              hrv,
    restingHR:        restingHR,
    sleepScore:       clamp(sleepScore),
    deepSleepMinutes: Math.round(deepSec / 60),
    remSleepMinutes:  Math.round(remSec / 60),
    recoveryScore:    recoveryProxy,
    strainScore:      clamp(stressLevel),
    readinessScore:   recoveryProxy,
    steps:            safeNum(summary.totalSteps),
    activeCalories:   safeNum(summary.activeKilocalories),
    date:             String(summary.calendarDate ?? new Date().toISOString().slice(0, 10)),
    source:           "garmin",
  };
}

// ============================================================
// APPLE HEALTH  (exported XML converted to JSON, or shortcuts export)
// ============================================================

interface AppleRecord {
  type: string;
  value: string;
  unit?: string;
  startDate?: string;
  endDate?: string;
  sourceName?: string;
}

function appleRecords(data: unknown): AppleRecord[] {
  const d = data as Record<string, unknown>;
  // Handle both raw export JSON and pre-processed arrays
  const health = (d.HealthData ?? d) as Record<string, unknown>;
  const records = health.Record ?? health.records ?? [];
  return Array.isArray(records) ? (records as AppleRecord[]) : [];
}

function latestApple(records: AppleRecord[], type: string): number {
  const matches = records
    .filter((r) => r.type === type)
    .map((r) => parseFloat(r.value))
    .filter(isFinite);
  return matches.length ? matches[matches.length - 1] : 0;
}

function sleepMinutesByCategory(records: AppleRecord[], category: string): number {
  return records
    .filter((r) => r.type === "HKCategoryTypeIdentifierSleepAnalysis" && r.value === category)
    .reduce((total, r) => {
      if (!r.startDate || !r.endDate) return total;
      const dur = new Date(r.endDate).getTime() - new Date(r.startDate).getTime();
      return total + Math.max(0, dur / 60000);
    }, 0);
}

export function normalizeAppleHealth(data: unknown): NormalizedWearableData {
  const records = appleRecords(data);

  const hrv       = latestApple(records, "HKQuantityTypeIdentifierHeartRateVariabilitySDNN");
  const restingHR = latestApple(records, "HKQuantityTypeIdentifierRestingHeartRate");
  const steps     = latestApple(records, "HKQuantityTypeIdentifierStepCount");
  const calories  = latestApple(records, "HKQuantityTypeIdentifierActiveEnergyBurned");
  const vo2Max    = latestApple(records, "HKQuantityTypeIdentifierVO2Max");

  const deepSleepMin = Math.round(
    sleepMinutesByCategory(records, "HKCategoryValueSleepAnalysisAsleepDeep")
  );
  const remSleepMin = Math.round(
    sleepMinutesByCategory(records, "HKCategoryValueSleepAnalysisAsleepREM")
  );
  const totalSleepMin = Math.round(
    sleepMinutesByCategory(records, "HKCategoryValueSleepAnalysisAsleep") +
    deepSleepMin + remSleepMin
  );

  // Apple Health doesn't export recovery/readiness scores — estimate from hrv
  const recoveryProxy = hrv > 0 ? clamp(Math.round((hrv / 100) * 100)) : 50;
  const sleepScore    = totalSleepMin > 0 ? clamp(Math.round((totalSleepMin / 480) * 100)) : 0;
  const strainProxy   = vo2Max > 0 ? clamp(Math.round((vo2Max / 60) * 100)) : 50;

  // Use most recent date from records
  const dates = records.map((r) => r.startDate ?? "").filter(Boolean).sort();
  const date  = dates[dates.length - 1]?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

  return {
    hrv:              hrv,
    restingHR:        restingHR,
    sleepScore:       sleepScore,
    deepSleepMinutes: deepSleepMin,
    remSleepMinutes:  remSleepMin,
    recoveryScore:    recoveryProxy,
    strainScore:      strainProxy,
    readinessScore:   recoveryProxy,
    steps:            Math.round(steps),
    activeCalories:   Math.round(calories),
    date:             date,
    source:           "apple_health",
  };
}

// ============================================================
// UNIFIED ENTRY POINT
// ============================================================

export function normalizeWearable(
  source: WearableSource,
  data: unknown
): NormalizedWearableData {
  switch (source) {
    case "whoop":
      return normalizeWhoop(data);
    case "oura":
      return normalizeOura(data);
    case "garmin":
      return normalizeGarmin(data);
    case "apple_health":
      return normalizeAppleHealth(data);
    case "samsung_galaxy_watch":
      // Terra writes directly to wearable_snapshots — no client-side normalization needed.
      throw new Error("samsung_galaxy_watch data is ingested via Terra webhook, not this normalizer");
  }
}

// Detect wearable source from payload shape (used when source isn't explicit)
export function detectWearableSource(data: unknown): WearableSource | null {
  const d = data as Record<string, unknown>;
  if (d.recovery_score !== undefined || d.hrv_rmssd_milli !== undefined) return "whoop";
  if (d.readiness !== undefined && d.ring !== undefined) return "oura";
  if (d.dailySummaries !== undefined || d.heartRateData !== undefined) return "garmin";
  if ((d.HealthData as Record<string, unknown> | undefined)?.Record !== undefined) return "apple_health";
  return null;
}

export { randomUUID };
