import { XMLParser } from "fast-xml-parser";
import type { AppleHealthMetrics, HealthRecord } from "@/types";

const TRACKED_METRICS = [
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierVO2Max",
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierBodyMass",
] as const;

type MetricKey = (typeof TRACKED_METRICS)[number];

const METRIC_LABEL_MAP: Record<MetricKey, keyof AppleHealthMetrics> = {
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierRestingHeartRate: "resting_heart_rate",
  HKQuantityTypeIdentifierVO2Max: "vo2_max",
  HKQuantityTypeIdentifierStepCount: "step_count",
  HKQuantityTypeIdentifierBodyMass: "body_mass",
};

interface RawRecord {
  "@_type": string;
  "@_value": string;
  "@_unit": string;
  "@_startDate": string;
  "@_endDate": string;
}

export function parseAppleHealth(xmlString: string): AppleHealthMetrics {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let data: { HealthData?: { Record?: RawRecord | RawRecord[] } };
  try {
    data = parser.parse(xmlString);
  } catch {
    throw new Error("Invalid Apple Health XML file");
  }

  const rawRecords = data?.HealthData?.Record;
  if (!rawRecords) return {};

  // fast-xml-parser returns a single object (not array) when there's only one record
  const records: RawRecord[] = Array.isArray(rawRecords)
    ? rawRecords
    : [rawRecords];

  const result: AppleHealthMetrics = {};

  for (const metricType of TRACKED_METRICS) {
    const label = METRIC_LABEL_MAP[metricType];
    const filtered = records.filter((r) => r["@_type"] === metricType);

    const mapped: HealthRecord[] = filtered
      .slice(-30)
      .map((r) => ({
        value: r["@_value"],
        unit: r["@_unit"],
        startDate: r["@_startDate"],
        endDate: r["@_endDate"],
      }));

    if (mapped.length > 0) {
      result[label] = mapped;
    }
  }

  return result;
}

// Compute simple averages for the AI prompt
export function summarizeAppleHealth(metrics: AppleHealthMetrics): Record<string, number> {
  const avg = (records: HealthRecord[] | undefined) => {
    if (!records || records.length === 0) return null;
    const sum = records.reduce((acc, r) => acc + parseFloat(r.value), 0);
    return Math.round((sum / records.length) * 10) / 10;
  };

  return Object.fromEntries(
    Object.entries({
      avg_hrv_ms: avg(metrics.hrv),
      avg_resting_hr: avg(metrics.resting_heart_rate),
      avg_vo2_max: avg(metrics.vo2_max),
      avg_daily_steps: avg(metrics.step_count),
      body_mass_kg: avg(metrics.body_mass),
    }).filter(([, v]) => v !== null)
  ) as Record<string, number>;
}
