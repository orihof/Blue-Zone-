/// lib/blood-test/biomarker-registry.ts

export interface BiomarkerDefinition {
  id:           string;
  name:         string;
  category:     BiomarkerCategory;
  tier:         "essential" | "recommended" | "advanced";
  whyItMatters: string;
  aliases:      string[];   // alternative names the parser might find in lab reports
}

export type BiomarkerCategory =
  | "metabolic"
  | "cardiovascular"
  | "hormonal"
  | "micronutrients"
  | "inflammation"
  | "thyroid"
  | "kidney_liver";

export const BIOMARKER_REGISTRY: BiomarkerDefinition[] = [

  // ── METABOLIC HEALTH ──────────────────────────────────────────────
  {
    id:           "fasting_glucose",
    name:         "Fasting Glucose",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Cannot calibrate your metabolic age score or insulin response baseline without this marker.",
    aliases:      ["glucose", "blood glucose", "fasting blood sugar", "fbg"],
  },
  {
    id:           "fasting_insulin",
    name:         "Fasting Insulin",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Without this, insulin resistance stays invisible — your protocol treats symptoms, not the root metabolic issue.",
    aliases:      ["insulin", "serum insulin", "fasting insulin level"],
  },
  {
    id:           "hba1c",
    name:         "HbA1c",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Without 90-day glucose history, your protocol cannot distinguish chronic metabolic dysfunction from a one-time blood sugar spike.",
    aliases:      ["hemoglobin a1c", "glycated hemoglobin", "a1c", "hgba1c"],
  },
  {
    id:           "triglycerides",
    name:         "Triglycerides",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Cannot accurately assess cardiovascular risk or calibrate omega-3 dosing without a triglyceride baseline.",
    aliases:      ["trig", "trigs", "triglyceride"],
  },

  // ── CARDIOVASCULAR RISK ───────────────────────────────────────────
  {
    id:           "ldl",
    name:         "LDL Cholesterol",
    category:     "cardiovascular",
    tier:         "essential",
    whyItMatters: "Cannot calibrate your CoQ10, omega-3, or cardiovascular supplement doses without an LDL baseline.",
    aliases:      ["ldl-c", "ldl cholesterol", "low density lipoprotein", "ldl"],
  },
  {
    id:           "hdl",
    name:         "HDL Cholesterol",
    category:     "cardiovascular",
    tier:         "essential",
    whyItMatters: "Without this, your protocol cannot detect the metabolic syndrome pattern that drives cardiovascular and longevity risk.",
    aliases:      ["hdl-c", "hdl cholesterol", "high density lipoprotein", "hdl"],
  },
  {
    id:           "apob",
    name:         "ApoB",
    category:     "cardiovascular",
    tier:         "recommended",
    whyItMatters: "Without ApoB, LDL alone misses the atherogenic particle count — your cardiovascular risk assessment is incomplete.",
    aliases:      ["apolipoprotein b", "apo b", "apob-100"],
  },
  {
    id:           "homocysteine",
    name:         "Homocysteine",
    category:     "cardiovascular",
    tier:         "recommended",
    whyItMatters: "Cannot identify B-vitamin deficiency or cardiovascular risk without this independent inflammation marker.",
    aliases:      ["total homocysteine", "plasma homocysteine"],
  },

  // ── INFLAMMATION ──────────────────────────────────────────────────
  {
    id:           "hs_crp",
    name:         "hs-CRP",
    category:     "inflammation",
    tier:         "essential",
    whyItMatters: "Without hs-CRP, your protocol cannot identify or target the inflammation driving your recovery and longevity risk.",
    aliases:      ["high sensitivity crp", "hscrp", "c-reactive protein", "crp", "hs-crp"],
  },

  // ── HORMONAL HEALTH ───────────────────────────────────────────────
  {
    id:           "total_testosterone",
    name:         "Total Testosterone",
    category:     "hormonal",
    tier:         "essential",
    whyItMatters: "Without this, recovery load recommendations are generic — your protocol cannot adapt to your hormonal baseline.",
    aliases:      ["testosterone total", "testosterone", "serum testosterone"],
  },
  {
    id:           "free_testosterone",
    name:         "Free Testosterone",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Total testosterone alone misses bioavailability. Without free T, hormonal recommendations are calibrated to the wrong number.",
    aliases:      ["free t", "free testosterone level", "bioavailable testosterone"],
  },
  {
    id:           "shbg",
    name:         "SHBG",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Without SHBG, the protocol cannot determine how much testosterone is biologically active vs. bound and unavailable.",
    aliases:      ["sex hormone binding globulin", "sex hormone-binding globulin", "shbg"],
  },
  {
    id:           "cortisol",
    name:         "Cortisol (AM)",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Without morning cortisol, your HRV data has no hormonal context — training load decisions cannot account for HPA axis state.",
    aliases:      ["cortisol", "serum cortisol", "morning cortisol", "cortisol am"],
  },
  {
    id:           "dhea_s",
    name:         "DHEA-S",
    category:     "hormonal",
    tier:         "advanced",
    whyItMatters: "Cannot assess adrenal reserve or age-related hormonal decline trajectory without this marker.",
    aliases:      ["dhea sulfate", "dehydroepiandrosterone sulfate", "dheas", "dhea-s"],
  },

  // ── MICRONUTRIENTS ────────────────────────────────────────────────
  {
    id:           "vitamin_d",
    name:         "Vitamin D (25-OH)",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Without this, your immune, mood, and testosterone protocols are dosed in the dark — deficiency is common and impacts all three.",
    aliases:      ["25-oh vitamin d", "25 hydroxyvitamin d", "vitamin d3", "25(oh)d", "vitamin d"],
  },
  {
    id:           "b12",
    name:         "Vitamin B12",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Without B12, nerve function and energy system markers cannot be optimised — deficiency mimics overtraining syndrome.",
    aliases:      ["b12", "cobalamin", "vitamin b-12", "cyanocobalamin", "vitamin b12"],
  },
  {
    id:           "ferritin",
    name:         "Ferritin",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Cannot detect iron deficiency that tanks VO2max and recovery even when hemoglobin appears normal — ferritin is the earlier signal.",
    aliases:      ["serum ferritin", "ferritin level", "ferritin"],
  },
  {
    id:           "magnesium",
    name:         "Magnesium (RBC)",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "Without RBC magnesium, sleep and muscle recovery supplement dosing are based on assumptions, not your actual intracellular status.",
    aliases:      ["rbc magnesium", "red blood cell magnesium", "intracellular magnesium", "magnesium"],
  },
  {
    id:           "zinc",
    name:         "Zinc",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "Without this, testosterone synthesis and tissue repair protocols are calibrated without the most exercise-depleted mineral.",
    aliases:      ["serum zinc", "plasma zinc", "zinc level", "zinc"],
  },
  {
    id:           "folate",
    name:         "Folate",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "Cannot optimise methylation support or pair B12 supplementation correctly without a folate baseline.",
    aliases:      ["folic acid", "serum folate", "b9", "folate"],
  },

  // ── THYROID ───────────────────────────────────────────────────────
  {
    id:           "tsh",
    name:         "TSH",
    category:     "thyroid",
    tier:         "essential",
    whyItMatters: "Without thyroid function data, your metabolism, energy, and body composition targets are set against an unknown baseline — the protocol cannot adapt.",
    aliases:      ["thyroid stimulating hormone", "thyrotropin", "tsh"],
  },
  {
    id:           "free_t3",
    name:         "Free T3",
    category:     "thyroid",
    tier:         "recommended",
    whyItMatters: "TSH alone misses active thyroid hormone availability. Without Free T3, subclinical dysfunction stays invisible.",
    aliases:      ["ft3", "triiodothyronine free", "free triiodothyronine", "free t3"],
  },

  // ── KIDNEY & LIVER ────────────────────────────────────────────────
  {
    id:           "alt",
    name:         "ALT",
    category:     "kidney_liver",
    tier:         "essential",
    whyItMatters: "Cannot determine safe supplement dosing thresholds without knowing whether your liver is under stress from training or current supplementation.",
    aliases:      ["alanine aminotransferase", "sgpt", "alanine transaminase", "alt"],
  },
  {
    id:           "creatinine",
    name:         "Creatinine",
    category:     "kidney_liver",
    tier:         "essential",
    whyItMatters: "Without kidney function data, creatine and protein protocol dosing cannot be confirmed safe for your organs.",
    aliases:      ["serum creatinine", "creatinine level", "creatinine"],
  },
  {
    id:           "egfr",
    name:         "eGFR",
    category:     "kidney_liver",
    tier:         "recommended",
    whyItMatters: "Without overall kidney health status, the protocol cannot ensure supplement loads are safely filtered.",
    aliases:      ["estimated gfr", "glomerular filtration rate", "egfr"],
  },
];

// ── CATEGORY METADATA ─────────────────────────────────────────────────────────

export const CATEGORY_META: Record<BiomarkerCategory, {
  label:       string;
  icon:        string;
  color:       string;
  description: string;
}> = {
  metabolic:      { label: "Metabolic Health",   icon: "⚡", color: "teal",   description: "How your body processes fuel and manages blood sugar" },
  cardiovascular: { label: "Cardiovascular Risk", icon: "❤️", color: "red",    description: "Heart health markers that affect endurance and longevity" },
  hormonal:       { label: "Hormonal Health",     icon: "🔬", color: "violet", description: "Hormones that drive recovery, muscle, and performance" },
  micronutrients: { label: "Micronutrients",      icon: "💊", color: "amber",  description: "Vitamins and minerals that fuel cellular function" },
  inflammation:   { label: "Inflammation",        icon: "🛡️", color: "orange", description: "Systemic inflammation markers tied to injury and recovery" },
  thyroid:        { label: "Thyroid Function",    icon: "⚙️", color: "blue",   description: "Metabolic rate regulation and energy production" },
  kidney_liver:   { label: "Kidney & Liver",      icon: "🫀", color: "green",  description: "Organ health markers relevant for supplement safety" },
};
