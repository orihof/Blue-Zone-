/// lib/mock-data.ts
// Realistic mock data for the /demo route.
// All values represent a 38-year-old male focused on longevity.
// 90-day trajectory: HRV improving, sleep improving, fasting glucose needs work.

// ── User ─────────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  name: "Alex M.",
  age: 38,
};

// ── Scores ───────────────────────────────────────────────────────────────────
export const MOCK_SCORES = {
  biologicalAge: 34,          // 4 years younger than chronological
  chronologicalAge: 38,
  recovery: 72,               // /100
  sleep: 71,                  // /100
  metabolic: 68,              // /100
  readiness: 74,              // /100
};

// ── Biomarkers ───────────────────────────────────────────────────────────────
export interface MockBiomarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  status: "normal" | "low" | "high" | "critical";
  category: string;
}

export const MOCK_BIOMARKERS: MockBiomarker[] = [
  { id: "b1",  name: "hsCRP",                value: 1.4,  unit: "mg/L",  reference_min: null, reference_max: 1.0,  status: "high",   category: "Inflammation" },
  { id: "b2",  name: "Omega-3 Index",        value: 6.2,  unit: "%",     reference_min: 8,    reference_max: 12,   status: "low",    category: "Inflammation" },
  { id: "b3",  name: "Fasting Glucose",      value: 92,   unit: "mg/dL", reference_min: 70,   reference_max: 85,   status: "high",   category: "Metabolic" },
  { id: "b4",  name: "CoQ10 Plasma",         value: 0.8,  unit: "mg/L",  reference_min: 1.0,  reference_max: null, status: "low",    category: "Metabolic" },
  { id: "b5",  name: "Vitamin D (25-OH)",    value: 52,   unit: "ng/mL", reference_min: 40,   reference_max: 80,   status: "normal", category: "Hormonal" },
  { id: "b6",  name: "Testosterone (Total)", value: 620,  unit: "ng/dL", reference_min: 400,  reference_max: 700,  status: "normal", category: "Hormonal" },
  { id: "b7",  name: "HbA1c",               value: 5.3,  unit: "%",     reference_min: null, reference_max: 5.4,  status: "normal", category: "Metabolic" },
  { id: "b8",  name: "LDL-C",               value: 98,   unit: "mg/dL", reference_min: null, reference_max: 100,  status: "normal", category: "Cardiovascular" },
  { id: "b9",  name: "TSH",                 value: 1.9,  unit: "mIU/L", reference_min: 0.5,  reference_max: 2.5,  status: "normal", category: "Hormonal" },
  { id: "b10", name: "ALT",                 value: 24,   unit: "U/L",   reference_min: null, reference_max: 35,   status: "normal", category: "Liver" },
];

export const MOCK_DETECTED_SIGNALS = MOCK_BIOMARKERS.filter(
  (b) => b.status === "high" || b.status === "low" || b.status === "critical"
);

// ── 8-week wearable trends ───────────────────────────────────────────────────
export const MOCK_TRENDS = {
  weeks:    ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
  hrv:      [44, 47, 46, 50, 52, 54, 53, 54],   // ms — improving
  sleep:    [62, 65, 67, 68, 70, 71, 71, 71],   // /100 — improving
  recovery: [64, 66, 68, 70, 71, 72, 72, 72],   // /100 — improving
};

// ── Supplements ──────────────────────────────────────────────────────────────
export interface MockSupplement {
  id: string;
  title: string;
  brand: string;
  icon: string;
  price: string;
  source: "iHerb" | "Amazon";
  why: string;
  tags: string[];
  category: string;
  link: string;
}

export const MOCK_SUPPLEMENTS: MockSupplement[] = [
  {
    id: "s1",
    title: "Nordic Naturals Omega-3",
    brand: "Nordic Naturals",
    icon: "🐟",
    price: "$42",
    source: "iHerb",
    why: "Omega-3 Index at 6.2% is below the 8–12% optimal. EPA+DHA at 3g/day reduces hsCRP ~0.4 mg/L per meta-analysis (n=2,400).",
    tags: ["hsCRP: 1.4↑", "Omega-3: 6.2%↓"],
    category: "Inflammation",
    link: "https://iherb.com",
  },
  {
    id: "s2",
    title: "Magnesium Glycinate 400mg",
    brand: "Thorne Research",
    icon: "🌙",
    price: "$36",
    source: "iHerb",
    why: "Sleep quality at 71/100 — still below the 80+ optimal. Glycinate form maximizes blood-brain barrier passage for NMDA-R modulation.",
    tags: ["Sleep: 71/100↑", "HRV: 54ms↑"],
    category: "Sleep",
    link: "https://iherb.com",
  },
  {
    id: "s3",
    title: "CoQ10 Ubiquinol 200mg",
    brand: "Jarrow Formulas",
    icon: "⚡",
    price: "$52",
    source: "iHerb",
    why: "CoQ10 plasma at 0.8 mg/L — below the 1.0 target. Ubiquinol (active form) supports mitochondrial Complex I/II for ATP synthesis.",
    tags: ["CoQ10: 0.8↓", "Recovery: 72/100"],
    category: "Metabolic",
    link: "https://iherb.com",
  },
  {
    id: "s4",
    title: "Berberine HCl 500mg",
    brand: "Thorne Research",
    icon: "🌿",
    price: "$44",
    source: "Amazon",
    why: "Fasting glucose at 92 mg/dL — above the 70–85 optimal. Berberine activates AMPK, improving insulin sensitivity by ~20% per RCT.",
    tags: ["Fasting Glucose: 92↑", "HbA1c: 5.3"],
    category: "Metabolic",
    link: "https://amazon.com",
  },
  {
    id: "s5",
    title: "Vitamin D3+K2 5000IU",
    brand: "Life Extension",
    icon: "☀️",
    price: "$24",
    source: "Amazon",
    why: "Vitamin D at 52 ng/mL is adequate. Optimizing to 60–80 ng/mL further reduces inflammatory signaling via VDR pathway.",
    tags: ["Vitamin D: 52ng/mL→", "hsCRP: 1.4↑"],
    category: "Inflammation",
    link: "https://amazon.com",
  },
  {
    id: "s6",
    title: "Ashwagandha KSM-66 600mg",
    brand: "Ixoreal Biomed",
    icon: "🧘",
    price: "$28",
    source: "iHerb",
    why: "Recovery score trending but plateaued at 72. KSM-66 reduces cortisol by ~28% and improves VO₂ max per double-blind RCT.",
    tags: ["Recovery: 72/100", "HRV: 54ms↑"],
    category: "Stress",
    link: "https://iherb.com",
  },
];

// ── Daily checklist ──────────────────────────────────────────────────────────
export const MOCK_CHECKLIST = [
  { id: "c1", title: "Take morning stack",  detail: "Omega-3, D3+K2, CoQ10 with food",  done: true  },
  { id: "c2", title: "Zone 2 cardio",       detail: "45 min at 130–145 BPM",             done: true  },
  { id: "c3", title: "Sleep by 22:30",      detail: "HRV recovery window",               done: false },
  { id: "c4", title: "Track readiness",     detail: "Log in wearable app",               done: false },
  { id: "c5", title: "Evening Magnesium",   detail: "400mg, 30 min before bed",          done: false },
];

// ── Bio age narrative ────────────────────────────────────────────────────���───
export const MOCK_NARRATIVE = {
  headline: "Your biology is 4 years ahead of your age.",
  topPullingDown: [
    "Elevated hsCRP (1.4 mg/L) — inflammatory load above optimal",
    "Low Omega-3 Index (6.2%) — insufficient EPA+DHA status",
    "Fasting glucose at upper range (92 mg/dL)",
  ],
  topDrivingDown: [
    "Testosterone in upper-optimal range (620 ng/dL)",
    "HRV baseline improving over 8 weeks (44 → 54 ms)",
    "Sleep quality trending upward (+9 points in 8 weeks)",
  ],
  sixMonthProjection:
    "Following the full protocol for 180 days is projected to reduce biological age by an additional 1.2–1.8 years.",
};
