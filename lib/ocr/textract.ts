/// lib/ocr/textract.ts
import {
  TextractClient,
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  type Block,
} from "@aws-sdk/client-textract";
import { randomUUID } from "crypto";
import type { NormalizedBiomarkers } from "@/lib/types/health";

// ============================================================
// CLIENT
// ============================================================

function getClient(): TextractClient {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured — set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
  }
  return new TextractClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// ============================================================
// PII SANITIZER  (strip PHI before sending to Claude)
// ============================================================

// Patterns that identify PII — keep only clinically relevant text
const PII_PATTERNS: RegExp[] = [
  /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/g,                          // SSN
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,                   // dates of birth
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b(?=.*(?:patient|name|dob))/gi,  // Patient Name lines
  /(?:patient|name|dob|date of birth|address|phone|fax|mrn|id)[:\s]+[^\n]+/gi,
  /\b\d{10,}\b/g,                                               // phone/MRN numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,      // email addresses
];

export function sanitizeForAI(text: string): string {
  let clean = text;
  for (const pattern of PII_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED]");
  }
  return clean;
}

// ============================================================
// PDF → RAW TEXT
// ============================================================

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const client = getClient();

  // Use FORMS + TABLES feature set for structured lab reports
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: new Uint8Array(buffer) },
    FeatureTypes: ["TABLES", "FORMS"],
  });

  const response = await client.send(command);
  const blocks: Block[] = response.Blocks ?? [];

  // Reconstruct reading order: LINE blocks preserve layout
  const lines = blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .sort((a, b) => {
      const ay = a.Geometry?.BoundingBox?.Top ?? 0;
      const by = b.Geometry?.BoundingBox?.Top ?? 0;
      return ay - by;
    })
    .map((b) => b.Text!);

  return lines.join("\n");
}

// Lightweight version for images (single page, no layout analysis needed)
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const client = getClient();
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: new Uint8Array(buffer) },
  });
  const response = await client.send(command);
  return (response.Blocks ?? [])
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!)
    .join("\n");
}

// ============================================================
// LAB REPORT PARSER  (text → NormalizedBiomarkers[])
// ============================================================

// Known biomarker aliases → canonical name
const BIOMARKER_ALIASES: Record<string, string> = {
  "vit d":          "Vitamin D",
  "vitamin d":      "Vitamin D",
  "25(oh)d":        "Vitamin D",
  "25-oh vitamin d":"Vitamin D",
  "tsh":            "TSH",
  "free t4":        "Free T4",
  "free t3":        "Free T3",
  "crp":            "CRP",
  "c-reactive protein": "CRP",
  "hs-crp":         "hsCRP",
  "high sensitivity crp": "hsCRP",
  "hba1c":          "HbA1c",
  "hemoglobin a1c": "HbA1c",
  "fasting glucose":"Fasting Glucose",
  "glucose":        "Fasting Glucose",
  "insulin":        "Fasting Insulin",
  "igf-1":          "IGF-1",
  "igf1":           "IGF-1",
  "testosterone":   "Total Testosterone",
  "free testosterone": "Free Testosterone",
  "dhea":           "DHEA-S",
  "dheas":          "DHEA-S",
  "dhea-s":         "DHEA-S",
  "cortisol":       "Cortisol",
  "ferritin":       "Ferritin",
  "iron":           "Serum Iron",
  "hemoglobin":     "Hemoglobin",
  "hgb":            "Hemoglobin",
  "hematocrit":     "Hematocrit",
  "hct":            "Hematocrit",
  "wbc":            "WBC",
  "rbc":            "RBC",
  "platelets":      "Platelets",
  "sodium":         "Sodium",
  "potassium":      "Potassium",
  "calcium":        "Calcium",
  "magnesium":      "Magnesium",
  "phosphorus":     "Phosphorus",
  "alt":            "ALT",
  "ast":            "AST",
  "ggt":            "GGT",
  "alkaline phosphatase": "ALP",
  "alp":            "ALP",
  "bilirubin":      "Total Bilirubin",
  "albumin":        "Albumin",
  "total protein":  "Total Protein",
  "creatinine":     "Creatinine",
  "bun":            "BUN",
  "egfr":           "eGFR",
  "uric acid":      "Uric Acid",
  "ldl":            "LDL",
  "hdl":            "HDL",
  "triglycerides":  "Triglycerides",
  "total cholesterol": "Total Cholesterol",
  "cholesterol":    "Total Cholesterol",
  "apob":           "ApoB",
  "lpa":            "Lp(a)",
  "lipoprotein a":  "Lp(a)",
  "homocysteine":   "Homocysteine",
  "b12":            "Vitamin B12",
  "vitamin b12":    "Vitamin B12",
  "folate":         "Folate",
  "zinc":           "Zinc",
  "omega-3 index":  "Omega-3 Index",
};

function canonicalizeName(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return BIOMARKER_ALIASES[lower] ?? raw.trim();
}

function deriveStatus(
  value: number,
  refLow: number | null,
  refHigh: number | null
): NormalizedBiomarkers["status"] {
  if (refLow === null && refHigh === null) return "normal";

  if (refLow !== null && value < refLow) {
    return value < refLow * 0.7 ? "critical" : "low";
  }
  if (refHigh !== null && value > refHigh) {
    return value > refHigh * 1.3 ? "critical" : "high";
  }

  // In range — mark optimal if in upper-middle third
  if (refLow !== null && refHigh !== null) {
    const range = refHigh - refLow;
    const threshold = refLow + range * 0.66;
    return value >= threshold ? "optimal" : "normal";
  }

  return "normal";
}

// Primary parsing pattern — handles most US/EU lab formats:
// "Vitamin D    25.4    ng/mL    30-100"
// "TSH: 2.13 mIU/L (0.40 - 4.00)"
const LAB_LINE_PATTERN =
  /^([A-Za-z][\w\s\-\.\/\(\)]+?)\s{1,}([\d]+(?:[.,]\d+)?)\s+([a-zA-Z%µ\/\^0-9]+(?:\/[a-zA-Z]+)?)\s*(?:[\(\[]?\s*([\d.]+)\s*[-–]\s*([\d.]+)\s*[\)\]]?)?/;

// Alternative pattern for "Name: value unit (ref)"
const COLON_PATTERN =
  /^([A-Za-z][\w\s\-\.]+?):\s*([\d]+(?:[.,]\d+)?)\s*([a-zA-Z%µ\/\^0-9]+)\s*(?:[\(\[]?([\d.]+)\s*[-–]\s*([\d.]+)[\)\]]?)?/;

export function parseLabReport(text: string): NormalizedBiomarkers[] {
  const results: NormalizedBiomarkers[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  const lines = text.split(/\n|\r\n?/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 5) continue;

    // Try primary pattern, then colon pattern
    const match = line.match(LAB_LINE_PATTERN) ?? line.match(COLON_PATTERN);
    if (!match) continue;

    const [, rawName, rawValue, unit, rawMin, rawMax] = match;

    const value = parseFloat(rawValue.replace(",", "."));
    if (isNaN(value)) continue;

    const name = canonicalizeName(rawName);

    // Skip duplicates and non-biomarker lines
    if (seen.has(name.toLowerCase())) continue;
    if (name.length < 2 || /^\d/.test(name)) continue;
    if (/^(page|date|time|report|specimen|lab|order|drawn|physician|result)/i.test(name)) continue;

    seen.add(name.toLowerCase());

    const refLow  = rawMin ? parseFloat(rawMin) : null;
    const refHigh = rawMax ? parseFloat(rawMax) : null;
    const status  = deriveStatus(value, refLow, refHigh);

    results.push({
      biomarkerId: randomUUID(),
      name,
      value,
      unit: unit.trim(),
      referenceRange: { low: refLow, high: refHigh },
      status,
      source: "lab",
      date: today,
    });
  }

  return results;
}
