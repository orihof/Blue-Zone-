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
    whyItMatters: "Core indicator of metabolic health and insulin response. Elevated levels affect energy, recovery, and inflammation.",
    aliases:      ["glucose", "blood glucose", "fasting blood sugar", "fbg"],
  },
  {
    id:           "fasting_insulin",
    name:         "Fasting Insulin",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Reveals insulin resistance years before glucose becomes abnormal. Critical for metabolic protocol calibration.",
    aliases:      ["insulin", "serum insulin", "fasting insulin level"],
  },
  {
    id:           "hba1c",
    name:         "HbA1c",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "3-month average blood sugar. Indicates how well your body has managed glucose over time.",
    aliases:      ["hemoglobin a1c", "glycated hemoglobin", "a1c", "hgba1c"],
  },
  {
    id:           "triglycerides",
    name:         "Triglycerides",
    category:     "metabolic",
    tier:         "essential",
    whyItMatters: "Elevated triglycerides indicate poor carbohydrate metabolism and increase cardiovascular risk.",
    aliases:      ["trig", "trigs", "triglyceride"],
  },

  // ── CARDIOVASCULAR RISK ───────────────────────────────────────────
  {
    id:           "ldl",
    name:         "LDL Cholesterol",
    category:     "cardiovascular",
    tier:         "essential",
    whyItMatters: "Standard cardiovascular risk marker. Used to calibrate CoQ10 and omega-3 recommendations.",
    aliases:      ["ldl-c", "ldl cholesterol", "low density lipoprotein", "ldl"],
  },
  {
    id:           "hdl",
    name:         "HDL Cholesterol",
    category:     "cardiovascular",
    tier:         "essential",
    whyItMatters: "Protective cholesterol. Low HDL combined with high triglycerides signals metabolic syndrome.",
    aliases:      ["hdl-c", "hdl cholesterol", "high density lipoprotein", "hdl"],
  },
  {
    id:           "apob",
    name:         "ApoB",
    category:     "cardiovascular",
    tier:         "recommended",
    whyItMatters: "More accurate than LDL-C alone for predicting cardiovascular risk. Counts every atherogenic particle.",
    aliases:      ["apolipoprotein b", "apo b", "apob-100"],
  },
  {
    id:           "homocysteine",
    name:         "Homocysteine",
    category:     "cardiovascular",
    tier:         "recommended",
    whyItMatters: "Elevated homocysteine is an independent cardiovascular risk factor and signals B-vitamin deficiency.",
    aliases:      ["total homocysteine", "plasma homocysteine"],
  },

  // ── INFLAMMATION ──────────────────────────────────────────────────
  {
    id:           "hs_crp",
    name:         "hs-CRP",
    category:     "inflammation",
    tier:         "essential",
    whyItMatters: "High-sensitivity inflammation marker. Elevated hs-CRP drives supplement choices for anti-inflammatory protocol.",
    aliases:      ["high sensitivity crp", "hscrp", "c-reactive protein", "crp", "hs-crp"],
  },

  // ── HORMONAL HEALTH ───────────────────────────────────────────────
  {
    id:           "total_testosterone",
    name:         "Total Testosterone",
    category:     "hormonal",
    tier:         "essential",
    whyItMatters: "Foundational hormone for muscle preservation, recovery, libido, and mood in athletes.",
    aliases:      ["testosterone total", "testosterone", "serum testosterone"],
  },
  {
    id:           "free_testosterone",
    name:         "Free Testosterone",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Only free testosterone is biologically active. Total T can be normal while free T is low.",
    aliases:      ["free t", "free testosterone level", "bioavailable testosterone"],
  },
  {
    id:           "shbg",
    name:         "SHBG",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Sex hormone binding globulin determines how much testosterone is available to tissues.",
    aliases:      ["sex hormone binding globulin", "sex hormone-binding globulin", "shbg"],
  },
  {
    id:           "cortisol",
    name:         "Cortisol (AM)",
    category:     "hormonal",
    tier:         "recommended",
    whyItMatters: "Morning cortisol reveals HPA axis function. Critical for athletes in heavy training blocks.",
    aliases:      ["cortisol", "serum cortisol", "morning cortisol", "cortisol am"],
  },
  {
    id:           "dhea_s",
    name:         "DHEA-S",
    category:     "hormonal",
    tier:         "advanced",
    whyItMatters: "Adrenal reserve marker. Declines with age and chronic stress. Relevant for longevity protocols.",
    aliases:      ["dhea sulfate", "dehydroepiandrosterone sulfate", "dheas", "dhea-s"],
  },

  // ── MICRONUTRIENTS ────────────────────────────────────────────────
  {
    id:           "vitamin_d",
    name:         "Vitamin D (25-OH)",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Deficiency affects bone density, immune function, testosterone production, and mood.",
    aliases:      ["25-oh vitamin d", "25 hydroxyvitamin d", "vitamin d3", "25(oh)d", "vitamin d"],
  },
  {
    id:           "b12",
    name:         "Vitamin B12",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Essential for nerve function, red blood cell production, and energy metabolism.",
    aliases:      ["b12", "cobalamin", "vitamin b-12", "cyanocobalamin", "vitamin b12"],
  },
  {
    id:           "ferritin",
    name:         "Ferritin",
    category:     "micronutrients",
    tier:         "essential",
    whyItMatters: "Iron storage marker. Low ferritin causes fatigue, poor VO2max, and impaired recovery even when hemoglobin is normal.",
    aliases:      ["serum ferritin", "ferritin level", "ferritin"],
  },
  {
    id:           "magnesium",
    name:         "Magnesium (RBC)",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "RBC magnesium is more accurate than serum. Deficiency impairs sleep, muscle recovery, and glucose metabolism.",
    aliases:      ["rbc magnesium", "red blood cell magnesium", "intracellular magnesium", "magnesium"],
  },
  {
    id:           "zinc",
    name:         "Zinc",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "Depleted by exercise and sweat. Affects testosterone synthesis, immune function, and tissue repair.",
    aliases:      ["serum zinc", "plasma zinc", "zinc level", "zinc"],
  },
  {
    id:           "folate",
    name:         "Folate",
    category:     "micronutrients",
    tier:         "recommended",
    whyItMatters: "B9 is essential for DNA synthesis and pairs with B12 for methylation support.",
    aliases:      ["folic acid", "serum folate", "b9", "folate"],
  },

  // ── THYROID ───────────────────────────────────────────────────────
  {
    id:           "tsh",
    name:         "TSH",
    category:     "thyroid",
    tier:         "essential",
    whyItMatters: "Thyroid function affects metabolism, energy, body composition, and recovery capacity.",
    aliases:      ["thyroid stimulating hormone", "thyrotropin", "tsh"],
  },
  {
    id:           "free_t3",
    name:         "Free T3",
    category:     "thyroid",
    tier:         "recommended",
    whyItMatters: "Active thyroid hormone. TSH alone can miss subclinical thyroid dysfunction.",
    aliases:      ["ft3", "triiodothyronine free", "free triiodothyronine", "free t3"],
  },

  // ── KIDNEY & LIVER ────────────────────────────────────────────────
  {
    id:           "alt",
    name:         "ALT",
    category:     "kidney_liver",
    tier:         "essential",
    whyItMatters: "Liver enzyme. Elevated ALT can signal overtraining stress, NAFLD, or supplement toxicity.",
    aliases:      ["alanine aminotransferase", "sgpt", "alanine transaminase", "alt"],
  },
  {
    id:           "creatinine",
    name:         "Creatinine",
    category:     "kidney_liver",
    tier:         "essential",
    whyItMatters: "Kidney function marker. Important for athletes on creatine supplementation.",
    aliases:      ["serum creatinine", "creatinine level", "creatinine"],
  },
  {
    id:           "egfr",
    name:         "eGFR",
    category:     "kidney_liver",
    tier:         "recommended",
    whyItMatters: "Estimated glomerular filtration rate — overall kidney health score.",
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
