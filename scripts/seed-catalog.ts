/// scripts/seed-catalog.ts
// Seed 20 starter health products + matching dosing rules.
// Run: node --env-file=.env.local --import=tsx/esm scripts/seed-catalog.ts
// Or:  npx tsx --env-file .env.local scripts/seed-catalog.ts  (tsx >=4.x)

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Type helpers ──────────────────────────────────────────────────────────────

type ProductInsert = {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  brand?: string;
  form_name?: string;
  dose_per_serving_mg?: number;
  serving_unit?: string;
  standard_serving_count?: number;
  price_usd?: number;
  affiliate_url?: string;
  affiliate_platform?: string;
  evidence_grade?: string;
  drug_interactions?: string[];
  primary_nutrients?: Record<string, unknown>;
  has_cycling_requirement?: boolean;
  cycling_on_weeks?: number;
  cycling_off_weeks?: number;
  post_workout_adaptation_risk?: boolean;
  post_workout_risk_threshold_mg?: number;
  requires_rd_review?: boolean;
};

type DosingRuleInsert = {
  target_marker: string;
  severity: string;
  recommended_dose_mg: number;
  dose_unit?: string;
  timing_slot?: string;
  timing_notes?: string;
  slot_category?: string;
  max_daily_dose_mg?: number;
  quick_effect_weeks?: number;
  meaningful_effect_weeks?: number;
  full_effect_weeks?: number;
  what_to_expect?: string;
  early_indicators?: string[];
};

// ── 20 products across 10 categories ─────────────────────────────────────────

const PRODUCTS: ProductInsert[] = [
  // ── iron_group ──────────────────────────────────────────────────────────────
  {
    name: "Ferrous Bisglycinate 36mg",
    category: "iron_group",
    subcategory: "chelated_iron",
    description:
      "Highly bioavailable chelated iron. Gentler on the GI tract than ferrous sulfate. " +
      "Ideal for correcting iron-deficiency anaemia.",
    brand: "Thorne Research",
    form_name: "capsule",
    dose_per_serving_mg: 36,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 28.0,
    affiliate_url: "https://www.iherb.com/pr/thorne-ferrasorb/41843",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Levothyroxine",
      "Quinolone antibiotics",
      "Antacids",
      "Proton pump inhibitors",
    ],
    primary_nutrients: { iron_mg: 36 },
  },
  {
    name: "Iron + Vitamin C Complex",
    category: "iron_group",
    subcategory: "iron_complex",
    description:
      "Iron (25mg) paired with 100mg Vitamin C to enhance non-haeme iron absorption by up to 3×. " +
      "Best for vegetarians and vegans.",
    brand: "Pure Encapsulations",
    form_name: "capsule",
    dose_per_serving_mg: 25,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 32.0,
    affiliate_url: "https://www.iherb.com/pr/pure-encapsulations-iron-c/35481",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Levothyroxine",
      "Antacids",
      "Calcium supplements",
    ],
    primary_nutrients: { iron_mg: 25, vitamin_c_mg: 100 },
  },

  // ── magnesium_group ─────────────────────────────────────────────────────────
  {
    name: "Magnesium Glycinate 400mg",
    category: "magnesium_group",
    subcategory: "chelated_magnesium",
    description:
      "Best-absorbed magnesium form. Promotes sleep quality, muscle relaxation, and reduces anxiety. " +
      "Gentle on digestion — rarely causes loose stools.",
    brand: "Doctor's Best",
    form_name: "tablet",
    dose_per_serving_mg: 200,
    serving_unit: "tablet",
    standard_serving_count: 120,
    price_usd: 22.0,
    affiliate_url:
      "https://www.iherb.com/pr/doctors-best-high-absorption-magnesium/36081",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Bisphosphonates",
      "Gabapentin",
      "Diuretics",
    ],
    primary_nutrients: { magnesium_mg: 200 },
  },
  {
    name: "Magnesium Malate 1000mg",
    category: "magnesium_group",
    subcategory: "malate_magnesium",
    description:
      "Magnesium bound to malic acid — supports ATP energy production. " +
      "Preferred for daytime use; reduces muscle soreness and exercise-related fatigue.",
    brand: "Source Naturals",
    form_name: "tablet",
    dose_per_serving_mg: 150,
    serving_unit: "tablet",
    standard_serving_count: 90,
    price_usd: 18.0,
    affiliate_url:
      "https://www.iherb.com/pr/source-naturals-magnesium-malate/8076",
    affiliate_platform: "iherb",
    evidence_grade: "B",
    drug_interactions: ["Diuretics"],
    primary_nutrients: { magnesium_mg: 150, malic_acid_mg: 650 },
  },

  // ── vit_d_group ─────────────────────────────────────────────────────────────
  {
    name: "Vitamin D3 5000 IU",
    category: "vit_d_group",
    subcategory: "d3_solo",
    description:
      "Therapeutic-dose D3 for correcting deficiency (<20 ng/mL). " +
      "Pair with vitamin K2 for cardiovascular safety at prolonged high doses.",
    brand: "NatureWise",
    form_name: "softgel",
    dose_per_serving_mg: 5000, // stored as IU — dose_unit in dosing_rules clarifies
    serving_unit: "softgel",
    standard_serving_count: 360,
    price_usd: 16.0,
    affiliate_url: "https://www.amazon.com/dp/B00GB85JR4",
    affiliate_platform: "amazon",
    evidence_grade: "A",
    drug_interactions: [
      "Thiazide diuretics (hypercalcaemia risk)",
      "Digoxin",
    ],
    primary_nutrients: { vitamin_d3_iu: 5000 },
  },
  {
    name: "Vitamin D3 2000 IU + K2 100mcg",
    category: "vit_d_group",
    subcategory: "d3_k2_combo",
    description:
      "D3 with MK-7 K2. K2 directs calcium into bones rather than arteries — " +
      "essential when supplementing D3 long-term.",
    brand: "Jarrow Formulas",
    form_name: "softgel",
    dose_per_serving_mg: 2000,
    serving_unit: "softgel",
    standard_serving_count: 60,
    price_usd: 24.0,
    affiliate_url:
      "https://www.iherb.com/pr/jarrow-formulas-vitamin-d3-k2/59081",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Warfarin (K2 interaction — monitor INR)",
      "Thiazide diuretics",
    ],
    primary_nutrients: { vitamin_d3_iu: 2000, vitamin_k2_mcg: 100 },
  },

  // ── omega3_group ────────────────────────────────────────────────────────────
  {
    name: "Fish Oil 1200mg EPA/DHA",
    category: "omega3_group",
    subcategory: "fish_oil",
    description:
      "High-concentration triglyceride-form fish oil. EPA reduces inflammation; " +
      "DHA supports brain and cardiovascular health. Third-party tested for purity.",
    brand: "Nordic Naturals",
    form_name: "softgel",
    dose_per_serving_mg: 1200,
    serving_unit: "softgel",
    standard_serving_count: 90,
    price_usd: 38.0,
    affiliate_url:
      "https://www.iherb.com/pr/nordic-naturals-ultimate-omega/27459",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Warfarin",
      "Aspirin",
      "Blood thinners",
      "NSAIDs",
    ],
    primary_nutrients: { epa_mg: 690, dha_mg: 480 },
    post_workout_adaptation_risk: true,
    post_workout_risk_threshold_mg: 3000,
  },
  {
    name: "Algae Omega DHA/EPA 500mg",
    category: "omega3_group",
    subcategory: "algae_omega",
    description:
      "Vegan DHA/EPA from microalgae. No fishy burps. " +
      "Ideal for plant-based users or those with fish allergies.",
    brand: "iwi life",
    form_name: "softgel",
    dose_per_serving_mg: 500,
    serving_unit: "softgel",
    standard_serving_count: 60,
    price_usd: 30.0,
    affiliate_url: "https://www.amazon.com/dp/B07BB34VJW",
    affiliate_platform: "amazon",
    evidence_grade: "B",
    drug_interactions: ["Warfarin", "Blood thinners"],
    primary_nutrients: { dha_mg: 300, epa_mg: 150 },
  },

  // ── zinc_group ──────────────────────────────────────────────────────────────
  {
    name: "Zinc Picolinate 25mg",
    category: "zinc_group",
    subcategory: "chelated_zinc",
    description:
      "Picolinate chelate is one of the best-absorbed zinc forms. " +
      "Supports immune function, testosterone, wound healing, and skin health.",
    brand: "Thorne Research",
    form_name: "capsule",
    dose_per_serving_mg: 25,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 20.0,
    affiliate_url:
      "https://www.iherb.com/pr/thorne-research-zinc-picolinate/27699",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Copper depletion (long-term use)",
      "Quinolone antibiotics",
      "Iron supplements",
    ],
    primary_nutrients: { zinc_mg: 25 },
  },
  {
    name: "Zinc + Copper 15mg/2mg",
    category: "zinc_group",
    subcategory: "zinc_copper_balanced",
    description:
      "Balanced zinc-to-copper ratio (7.5:1) prevents copper deficiency " +
      "that occurs with prolonged zinc supplementation alone.",
    brand: "Pure Encapsulations",
    form_name: "capsule",
    dose_per_serving_mg: 15,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 18.0,
    affiliate_url:
      "https://www.iherb.com/pr/pure-encapsulations-zinc-copper/41571",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: ["Quinolone antibiotics", "Iron supplements"],
    primary_nutrients: { zinc_mg: 15, copper_mg: 2 },
  },

  // ── b12_group ───────────────────────────────────────────────────────────────
  {
    name: "Methylcobalamin B12 1000mcg",
    category: "b12_group",
    subcategory: "methylcobalamin",
    description:
      "Active methyl-form B12. Bypasses conversion step impaired in MTHFR variants. " +
      "Sublingual lozenge for maximal absorption.",
    brand: "Jarrow Formulas",
    form_name: "lozenge",
    dose_per_serving_mg: 1,  // 1000 mcg = 1 mg
    serving_unit: "lozenge",
    standard_serving_count: 100,
    price_usd: 14.0,
    affiliate_url:
      "https://www.iherb.com/pr/jarrow-formulas-methyl-b-12/384",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Metformin (reduces B12 absorption)",
      "Proton pump inhibitors",
    ],
    primary_nutrients: { vitamin_b12_mcg: 1000 },
  },
  {
    name: "Activated B-Complex",
    category: "b12_group",
    subcategory: "b_complex",
    description:
      "Full-spectrum activated B vitamins: methylcobalamin (B12), methylfolate (B9), " +
      "P-5-P (B6), riboflavin-5'-phosphate (B2). Supports homocysteine clearance.",
    brand: "Thorne Research",
    form_name: "capsule",
    dose_per_serving_mg: 400,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 26.0,
    affiliate_url:
      "https://www.iherb.com/pr/thorne-research-b-complex-12/11088",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Metformin",
      "Proton pump inhibitors",
      "Methotrexate",
    ],
    primary_nutrients: {
      vitamin_b12_mcg: 400,
      folate_mcg: 680,
      vitamin_b6_mg: 20,
      riboflavin_mg: 16,
    },
  },

  // ── ashwagandha ─────────────────────────────────────────────────────────────
  {
    name: "KSM-66 Ashwagandha 600mg",
    category: "ashwagandha",
    subcategory: "ksm66",
    description:
      "Full-spectrum root extract with the broadest clinical evidence base. " +
      "Reduces cortisol, improves sleep latency, and supports testosterone in males.",
    brand: "NOW Foods",
    form_name: "capsule",
    dose_per_serving_mg: 600,
    serving_unit: "capsule",
    standard_serving_count: 90,
    price_usd: 22.0,
    affiliate_url:
      "https://www.iherb.com/pr/now-foods-ashwagandha-600-mg/89614",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Thyroid medications",
      "Immunosuppressants",
      "Sedatives",
    ],
    primary_nutrients: {
      withanolides_pct: 5,
      ashwagandha_root_mg: 600,
    },
    has_cycling_requirement: true,
    cycling_on_weeks: 8,
    cycling_off_weeks: 4,
  },
  {
    name: "Sensoril Ashwagandha 125mg",
    category: "ashwagandha",
    subcategory: "sensoril",
    description:
      "Whole-plant extract (root + leaf) standardised to 10% withanolides. " +
      "Lower dose than KSM-66 but highly potent for anxiolytic and adaptogenic effects.",
    brand: "Jarrow Formulas",
    form_name: "capsule",
    dose_per_serving_mg: 125,
    serving_unit: "capsule",
    standard_serving_count: 60,
    price_usd: 18.0,
    affiliate_url:
      "https://www.iherb.com/pr/jarrow-formulas-sensoril-ashwagandha/6948",
    affiliate_platform: "iherb",
    evidence_grade: "B",
    drug_interactions: ["Thyroid medications", "Sedatives"],
    primary_nutrients: { withanolides_pct: 10, ashwagandha_mg: 125 },
    has_cycling_requirement: true,
    cycling_on_weeks: 12,
    cycling_off_weeks: 4,
  },

  // ── creatine ────────────────────────────────────────────────────────────────
  {
    name: "Creatine Monohydrate 5g",
    category: "creatine",
    subcategory: "monohydrate",
    description:
      "Gold-standard creatine with 40+ years of clinical evidence. " +
      "Increases muscle phosphocreatine, improves high-intensity output, and supports cognition.",
    brand: "Optimum Nutrition",
    form_name: "powder",
    dose_per_serving_mg: 5000,
    serving_unit: "scoop",
    standard_serving_count: 60,
    price_usd: 28.0,
    affiliate_url: "https://www.amazon.com/dp/B002DYIZEO",
    affiliate_platform: "amazon",
    evidence_grade: "A",
    drug_interactions: ["NSAIDs (renal stress at very high doses)"],
    primary_nutrients: { creatine_monohydrate_g: 5 },
  },
  {
    name: "Creatine HCl 750mg",
    category: "creatine",
    subcategory: "creatine_hcl",
    description:
      "Hydrochloride salt form — ~6× smaller dose than monohydrate with equivalent efficacy. " +
      "Preferred by users who experience GI discomfort with monohydrate.",
    brand: "Kaged Muscle",
    form_name: "capsule",
    dose_per_serving_mg: 750,
    serving_unit: "capsule",
    standard_serving_count: 75,
    price_usd: 32.0,
    affiliate_url:
      "https://www.iherb.com/pr/kaged-muscle-creatine-hcl/73413",
    affiliate_platform: "iherb",
    evidence_grade: "B",
    drug_interactions: [],
    primary_nutrients: { creatine_hcl_mg: 750 },
  },

  // ── coq10_group ─────────────────────────────────────────────────────────────
  {
    name: "Ubiquinol CoQ10 200mg",
    category: "coq10_group",
    subcategory: "ubiquinol",
    description:
      "Active reduced form of CoQ10 with 8× higher bioavailability than ubiquinone. " +
      "Critical for mitochondrial energy; often depleted by statin medications.",
    brand: "Qunol",
    form_name: "softgel",
    dose_per_serving_mg: 200,
    serving_unit: "softgel",
    standard_serving_count: 60,
    price_usd: 38.0,
    affiliate_url: "https://www.amazon.com/dp/B01KUHP5IK",
    affiliate_platform: "amazon",
    evidence_grade: "A",
    drug_interactions: ["Warfarin (modest anticoagulant interaction)"],
    primary_nutrients: { ubiquinol_mg: 200 },
  },
  {
    name: "CoQ10 + PQQ 200mg/10mg",
    category: "coq10_group",
    subcategory: "coq10_pqq",
    description:
      "Mitochondrial stack: ubiquinone CoQ10 + PQQ (pyrroloquinoline quinone). " +
      "PQQ stimulates mitochondrial biogenesis; CoQ10 optimises existing mitochondria.",
    brand: "Doctor's Best",
    form_name: "softgel",
    dose_per_serving_mg: 200,
    serving_unit: "softgel",
    standard_serving_count: 30,
    price_usd: 42.0,
    affiliate_url:
      "https://www.iherb.com/pr/doctors-best-coq10-with-bioperine-pqq/90428",
    affiliate_platform: "iherb",
    evidence_grade: "B",
    drug_interactions: ["Warfarin"],
    primary_nutrients: { coq10_mg: 200, pqq_mg: 10 },
  },

  // ── calcium_group ───────────────────────────────────────────────────────────
  {
    name: "Calcium Citrate 500mg",
    category: "calcium_group",
    subcategory: "calcium_citrate",
    description:
      "Citrate form absorbs well without stomach acid — ideal for older adults and PPI users. " +
      "Split into 2× 500mg doses for best absorption (body absorbs ≤500mg at once).",
    brand: "Solgar",
    form_name: "tablet",
    dose_per_serving_mg: 500,
    serving_unit: "tablet",
    standard_serving_count: 60,
    price_usd: 22.0,
    affiliate_url:
      "https://www.iherb.com/pr/solgar-calcium-citrate/5093",
    affiliate_platform: "iherb",
    evidence_grade: "A",
    drug_interactions: [
      "Iron absorption (take 2h apart)",
      "Levothyroxine",
      "Quinolone antibiotics",
      "Bisphosphonates",
    ],
    primary_nutrients: { calcium_mg: 500 },
  },
  {
    name: "Calcium + D3 + Magnesium Complex",
    category: "calcium_group",
    subcategory: "calcium_complex",
    description:
      "Triple mineral complex for bone density. D3 (800 IU) enhances calcium absorption; " +
      "magnesium (150mg) supports calcium metabolism and reduces constipation risk.",
    brand: "Nature Made",
    form_name: "softgel",
    dose_per_serving_mg: 400,
    serving_unit: "softgel",
    standard_serving_count: 90,
    price_usd: 18.0,
    affiliate_url: "https://www.amazon.com/dp/B0019LRP0A",
    affiliate_platform: "amazon",
    evidence_grade: "A",
    drug_interactions: [
      "Iron supplements",
      "Levothyroxine",
      "Bisphosphonates",
    ],
    primary_nutrients: {
      calcium_mg: 400,
      vitamin_d3_iu: 800,
      magnesium_mg: 150,
    },
  },
];

// ── Dosing rules keyed by product name ───────────────────────────────────────
// At least Deficient + Suboptimal per product.

const DOSING_RULES: Record<string, DosingRuleInsert[]> = {
  "Ferrous Bisglycinate 36mg": [
    {
      target_marker: "Ferritin",
      severity: "Deficient",
      recommended_dose_mg: 36,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes:
        "Take on an empty stomach or 2h after a meal. Avoid calcium, antacids, or coffee within 2h.",
      slot_category: "supplement",
      max_daily_dose_mg: 72,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 16,
      what_to_expect:
        "Energy and exercise tolerance improve as ferritin rises. Noticeable fatigue reduction within 6–8 weeks.",
      early_indicators: [
        "Less afternoon fatigue",
        "Improved HRV",
        "Fewer headaches",
      ],
    },
    {
      target_marker: "Ferritin",
      severity: "Suboptimal",
      recommended_dose_mg: 18,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Half-dose protocol for mild insufficiency (ferritin 20–40 ng/mL).",
      slot_category: "supplement",
      max_daily_dose_mg: 36,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 20,
      what_to_expect: "Gradual improvement in energy and iron stores over 3–5 months.",
      early_indicators: ["Reduced hair shedding", "Better exercise recovery"],
    },
  ],

  "Iron + Vitamin C Complex": [
    {
      target_marker: "Hemoglobin",
      severity: "Deficient",
      recommended_dose_mg: 25,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes:
        "Take on an empty stomach. Vitamin C included maximises absorption — no separate C needed.",
      slot_category: "supplement",
      max_daily_dose_mg: 50,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 16,
      what_to_expect:
        "Haemoglobin normalisation typically requires 8–12 weeks. Expect improved oxygen delivery and less breathlessness.",
      early_indicators: [
        "Less shortness of breath on exertion",
        "Improved pallor",
        "Better cold tolerance",
      ],
    },
    {
      target_marker: "Hemoglobin",
      severity: "Suboptimal",
      recommended_dose_mg: 25,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes: "Can be taken with a light meal to reduce GI discomfort.",
      slot_category: "supplement",
      max_daily_dose_mg: 25,
      quick_effect_weeks: 6,
      meaningful_effect_weeks: 14,
      full_effect_weeks: 24,
      what_to_expect: "Mild haemoglobin correction over 3–6 months.",
      early_indicators: ["Improved exercise capacity", "Better nail strength"],
    },
  ],

  "Magnesium Glycinate 400mg": [
    {
      target_marker: "Magnesium",
      severity: "Deficient",
      recommended_dose_mg: 400,
      dose_unit: "mg",
      timing_slot: "pre_sleep",
      timing_notes:
        "Take 30–60 min before bed. Split into 2× 200mg if GI-sensitive.",
      slot_category: "supplement",
      max_daily_dose_mg: 600,
      quick_effect_weeks: 1,
      meaningful_effect_weeks: 4,
      full_effect_weeks: 8,
      what_to_expect:
        "Improved sleep onset, reduced muscle cramps, better stress tolerance within 2–4 weeks.",
      early_indicators: [
        "Fewer night-time muscle cramps",
        "Easier to fall asleep",
        "Reduced anxiety",
      ],
    },
    {
      target_marker: "Magnesium",
      severity: "Suboptimal",
      recommended_dose_mg: 200,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Evening dose supports circadian magnesium rhythm.",
      slot_category: "supplement",
      max_daily_dose_mg: 400,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 10,
      what_to_expect:
        "Improved sleep quality scores and reduced anxiety within 4–6 weeks.",
      early_indicators: ["Lower resting heart rate", "Improved HRV trend"],
    },
  ],

  "Magnesium Malate 1000mg": [
    {
      target_marker: "Magnesium",
      severity: "Deficient",
      recommended_dose_mg: 500,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes:
        "Malate form is energising — take in the morning rather than at night.",
      slot_category: "supplement",
      max_daily_dose_mg: 800,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 10,
      what_to_expect:
        "Improved daytime energy and reduced muscle fatigue, especially post-exercise.",
      early_indicators: ["Less daytime fatigue", "Improved exercise recovery"],
    },
    {
      target_marker: "Magnesium",
      severity: "Suboptimal",
      recommended_dose_mg: 250,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes: "Take with breakfast.",
      slot_category: "supplement",
      max_daily_dose_mg: 500,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 12,
      what_to_expect: "Mild energy support and reduced post-exercise soreness.",
      early_indicators: ["Improved muscle recovery time"],
    },
  ],

  "Vitamin D3 5000 IU": [
    {
      target_marker: "Vitamin_D_25OH",
      severity: "Deficient",
      recommended_dose_mg: 5000,
      dose_unit: "IU",
      timing_slot: "morning",
      timing_notes:
        "Take with a fatty meal (eggs, avocado, nuts) — D3 is fat-soluble.",
      slot_category: "supplement",
      max_daily_dose_mg: 10000,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 16,
      what_to_expect:
        "25-OH-D levels rise ~1–2 ng/mL/week. Energy, mood, and immune function improve.",
      early_indicators: ["Improved mood", "Better sleep quality", "Fewer infections"],
    },
    {
      target_marker: "Vitamin_D_25OH",
      severity: "Suboptimal",
      recommended_dose_mg: 2000,
      dose_unit: "IU",
      timing_slot: "morning",
      timing_notes: "Maintenance dose for insufficiency (20–30 ng/mL range).",
      slot_category: "supplement",
      max_daily_dose_mg: 4000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 20,
      what_to_expect:
        "Gradual rise to optimal range (40–60 ng/mL) over 3–5 months.",
      early_indicators: [
        "Improved immune response",
        "Reduced seasonal low mood",
      ],
    },
  ],

  "Vitamin D3 2000 IU + K2 100mcg": [
    {
      target_marker: "Vitamin_D_25OH",
      severity: "Suboptimal",
      recommended_dose_mg: 2000,
      dose_unit: "IU",
      timing_slot: "morning",
      timing_notes: "Take with the largest meal of the day for best fat-soluble absorption.",
      slot_category: "supplement",
      max_daily_dose_mg: 4000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 24,
      what_to_expect:
        "D3 corrects insufficiency; K2 ensures calcium is deposited in bones, not arteries.",
      early_indicators: [
        "Improved mood stability",
        "Better bone density trend",
      ],
    },
    {
      target_marker: "Calcium",
      severity: "Suboptimal",
      recommended_dose_mg: 2000,
      dose_unit: "IU",
      timing_slot: "morning",
      timing_notes:
        "D3 is essential for intestinal calcium absorption — improves uptake by 30–40%.",
      slot_category: "supplement",
      max_daily_dose_mg: 4000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 16,
      full_effect_weeks: 26,
      what_to_expect:
        "Improved calcium retention and bone mineralisation when combined with adequate dietary calcium.",
      early_indicators: ["Reduced muscle cramps", "Improved bone density markers"],
    },
  ],

  "Fish Oil 1200mg EPA/DHA": [
    {
      target_marker: "Triglycerides",
      severity: "Deficient", // i.e. elevated TG
      recommended_dose_mg: 4000,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes:
        "Split across 2 meals (2g + 2g) to improve absorption and reduce fishy reflux.",
      slot_category: "supplement",
      max_daily_dose_mg: 5000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 12,
      what_to_expect:
        "High-dose EPA/DHA reduces triglycerides 20–30%. LDL-particle size may also improve.",
      early_indicators: ["Better post-meal blood glucose", "Reduced inflammation markers"],
    },
    {
      target_marker: "CRP",
      severity: "Suboptimal",
      recommended_dose_mg: 2400,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes: "Take with main meal. Combined EPA+DHA ≥2g/day for anti-inflammatory effect.",
      slot_category: "supplement",
      max_daily_dose_mg: 4000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 20,
      what_to_expect:
        "CRP and IL-6 reductions of 10–20% at consistent high-dose intake.",
      early_indicators: [
        "Reduced morning joint stiffness",
        "Better recovery from exercise",
      ],
    },
  ],

  "Algae Omega DHA/EPA 500mg": [
    {
      target_marker: "Triglycerides",
      severity: "Suboptimal",
      recommended_dose_mg: 1000,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes: "2 softgels with a fatty meal for best absorption.",
      slot_category: "supplement",
      max_daily_dose_mg: 2000,
      quick_effect_weeks: 6,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 20,
      what_to_expect:
        "Moderate triglyceride reduction (10–20%). Comparable to fish oil at equivalent EPA+DHA doses.",
      early_indicators: [
        "Improved blood viscosity markers",
        "Reduced inflammatory markers",
      ],
    },
    {
      target_marker: "CRP",
      severity: "Suboptimal",
      recommended_dose_mg: 500,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes: "Effective anti-inflammatory option for vegans/vegetarians.",
      slot_category: "supplement",
      max_daily_dose_mg: 1500,
      quick_effect_weeks: 8,
      meaningful_effect_weeks: 16,
      full_effect_weeks: 24,
      what_to_expect:
        "Anti-inflammatory effect comparable to fish oil at equivalent EPA+DHA doses.",
      early_indicators: ["Reduced joint discomfort", "Better skin hydration"],
    },
  ],

  "Zinc Picolinate 25mg": [
    {
      target_marker: "Zinc",
      severity: "Deficient",
      recommended_dose_mg: 25,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Take with a small meal to prevent nausea. Avoid within 2h of iron.",
      slot_category: "supplement",
      max_daily_dose_mg: 40,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 12,
      what_to_expect:
        "Immune function, taste/smell, wound healing improve. Testosterone may rise in deficient males.",
      early_indicators: [
        "Improved taste perception",
        "Faster wound healing",
        "Fewer white spots on nails",
      ],
    },
    {
      target_marker: "Zinc",
      severity: "Suboptimal",
      recommended_dose_mg: 15,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Half-dose for mild insufficiency.",
      slot_category: "supplement",
      max_daily_dose_mg: 25,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 14,
      what_to_expect:
        "Gradual normalisation of immune response and skin health.",
      early_indicators: ["Reduced frequency of colds", "Better skin clarity"],
    },
  ],

  "Zinc + Copper 15mg/2mg": [
    {
      target_marker: "Zinc",
      severity: "Deficient",
      recommended_dose_mg: 15,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Balanced formula prevents copper deficiency. Take with food.",
      slot_category: "supplement",
      max_daily_dose_mg: 30,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 14,
      what_to_expect:
        "Immune and hormonal normalisation while maintaining copper balance.",
      early_indicators: ["Improved immune response", "Stable energy levels"],
    },
    {
      target_marker: "Zinc",
      severity: "Suboptimal",
      recommended_dose_mg: 15,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes: "Can be taken morning or evening with food.",
      slot_category: "supplement",
      max_daily_dose_mg: 15,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 10,
      full_effect_weeks: 16,
      what_to_expect:
        "Maintenance of healthy zinc status without copper depletion risk.",
      early_indicators: ["Steady immune function", "Normal hair growth rate"],
    },
  ],

  "Methylcobalamin B12 1000mcg": [
    {
      target_marker: "B12_Cobalamin",
      severity: "Deficient",
      recommended_dose_mg: 1000, // mcg stored in recommended_dose_mg; dose_unit clarifies
      dose_unit: "mcg",
      timing_slot: "morning",
      timing_notes:
        "Allow lozenge to dissolve under tongue (sublingual) for direct mucosal absorption.",
      slot_category: "supplement",
      max_daily_dose_mg: 2000,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 16,
      what_to_expect:
        "Energy, cognition, and nerve function improve. Neurological symptoms (tingling) may resolve within 3 months.",
      early_indicators: ["Improved memory", "Less brain fog", "Better mood"],
    },
    {
      target_marker: "B12_Cobalamin",
      severity: "Suboptimal",
      recommended_dose_mg: 500,
      dose_unit: "mcg",
      timing_slot: "morning",
      timing_notes: "Sublingual for best absorption; oral capsule is a viable alternative.",
      slot_category: "supplement",
      max_daily_dose_mg: 1000,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 20,
      what_to_expect:
        "Gradual improvement in energy, RBC morphology, and homocysteine levels.",
      early_indicators: ["Improved focus", "Reduced fatigue"],
    },
  ],

  "Activated B-Complex": [
    {
      target_marker: "B12_Cobalamin",
      severity: "Suboptimal",
      recommended_dose_mg: 400,
      dose_unit: "mcg",
      timing_slot: "morning",
      timing_notes:
        "Take with breakfast to avoid B-vitamin–related energy disruption at night.",
      slot_category: "supplement",
      max_daily_dose_mg: 800,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 14,
      what_to_expect:
        "Full-spectrum B support normalises energy metabolism, homocysteine, and methylation.",
      early_indicators: [
        "Improved energy by mid-morning",
        "Better stress tolerance",
      ],
    },
    {
      target_marker: "Homocysteine",
      severity: "Deficient", // i.e. elevated homocysteine
      recommended_dose_mg: 400,
      dose_unit: "mcg",
      timing_slot: "morning",
      timing_notes:
        "B12 + methylfolate + B6 combination specifically targets homocysteine clearance.",
      slot_category: "supplement",
      max_daily_dose_mg: 800,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 16,
      what_to_expect:
        "Homocysteine reduction of 25–50% at adequate doses. Cardiovascular risk marker improves.",
      early_indicators: [
        "Improved methylation markers",
        "Better cardiovascular panel at retest",
      ],
    },
  ],

  "KSM-66 Ashwagandha 600mg": [
    {
      target_marker: "Cortisol",
      severity: "Deficient", // i.e. elevated cortisol
      recommended_dose_mg: 600,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes:
        "Evening dosing aligns with natural cortisol decline. Take with food.",
      slot_category: "supplement",
      max_daily_dose_mg: 600,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 10,
      what_to_expect:
        "Morning cortisol falls 15–28%. Sleep latency improves. Anxiety and perceived stress decrease.",
      early_indicators: [
        "Better sleep onset",
        "Reduced anxiety",
        "Improved HRV",
      ],
    },
    {
      target_marker: "Cortisol",
      severity: "Suboptimal",
      recommended_dose_mg: 300,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Lower maintenance dose for mild HPA axis dysregulation.",
      slot_category: "supplement",
      max_daily_dose_mg: 600,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 12,
      what_to_expect:
        "Gentle stress resilience improvement. Testosterone maintenance in athletes.",
      early_indicators: ["Improved recovery scores", "Better mood stability"],
    },
  ],

  "Sensoril Ashwagandha 125mg": [
    {
      target_marker: "Cortisol",
      severity: "Deficient",
      recommended_dose_mg: 250,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "2 capsules in the evening. 10% withanolide Sensoril extract.",
      slot_category: "supplement",
      max_daily_dose_mg: 500,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 12,
      what_to_expect:
        "Cortisol reduction and improved sleep quality. Cardiorespiratory fitness benefits at sustained dosing.",
      early_indicators: [
        "Improved sleep quality score",
        "Reduced perceived stress",
      ],
    },
    {
      target_marker: "Stress_Score",
      severity: "Suboptimal",
      recommended_dose_mg: 125,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Single capsule for mild stress or maintenance.",
      slot_category: "supplement",
      max_daily_dose_mg: 250,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 10,
      full_effect_weeks: 16,
      what_to_expect:
        "Mild anxiolytic effect and improved resilience to occupational stress.",
      early_indicators: [
        "Lower resting heart rate",
        "Better mood ratings",
      ],
    },
  ],

  "Creatine Monohydrate 5g": [
    {
      target_marker: "Physical_Performance",
      severity: "Deficient",
      recommended_dose_mg: 5000,
      dose_unit: "mg",
      timing_slot: "post_workout",
      timing_notes:
        "Post-workout with carbohydrate + protein maximises muscle uptake. On rest days, take any time.",
      slot_category: "supplement",
      max_daily_dose_mg: 20000, // loading phase max
      quick_effect_weeks: 1,
      meaningful_effect_weeks: 4,
      full_effect_weeks: 8,
      what_to_expect:
        "1–5% improvement in high-intensity output. Increased muscle fullness. Cognitive benefits in sleep-deprived states.",
      early_indicators: [
        "Extra reps at same RPE",
        "Faster recovery between sets",
        "Improved sprint time",
      ],
    },
    {
      target_marker: "Physical_Performance",
      severity: "Suboptimal",
      recommended_dose_mg: 3000,
      dose_unit: "mg",
      timing_slot: "post_workout",
      timing_notes: "Maintenance dose after saturation. Consistent daily use is key.",
      slot_category: "supplement",
      max_daily_dose_mg: 5000,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 10,
      what_to_expect:
        "Maintenance of elevated muscle phosphocreatine and sustained performance benefits.",
      early_indicators: [
        "Stable gym performance",
        "Maintained muscle fullness",
      ],
    },
  ],

  "Creatine HCl 750mg": [
    {
      target_marker: "Physical_Performance",
      severity: "Deficient",
      recommended_dose_mg: 1500,
      dose_unit: "mg",
      timing_slot: "pre_workout",
      timing_notes: "2 capsules (1.5g) pre-workout. Smaller doses vs monohydrate — less water retention.",
      slot_category: "supplement",
      max_daily_dose_mg: 3000,
      quick_effect_weeks: 1,
      meaningful_effect_weeks: 4,
      full_effect_weeks: 8,
      what_to_expect:
        "Similar performance outcomes to monohydrate with reduced bloating. Improved power output.",
      early_indicators: [
        "Better pump during training",
        "Reduced GI discomfort vs monohydrate",
      ],
    },
    {
      target_marker: "Physical_Performance",
      severity: "Suboptimal",
      recommended_dose_mg: 750,
      dose_unit: "mg",
      timing_slot: "pre_workout",
      timing_notes: "Single capsule maintenance dose.",
      slot_category: "supplement",
      max_daily_dose_mg: 1500,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 12,
      what_to_expect: "Maintenance performance support and mild cognitive benefit.",
      early_indicators: ["Consistent energy during training"],
    },
  ],

  "Ubiquinol CoQ10 200mg": [
    {
      target_marker: "CoQ10_Serum",
      severity: "Deficient",
      recommended_dose_mg: 200,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes:
        "Take with a fatty meal — ubiquinol is fat-soluble. Critical for statin users.",
      slot_category: "supplement",
      max_daily_dose_mg: 400,
      quick_effect_weeks: 2,
      meaningful_effect_weeks: 6,
      full_effect_weeks: 12,
      what_to_expect:
        "Reduced statin-induced muscle pain. Improved mitochondrial energy output and cardiovascular biomarkers.",
      early_indicators: [
        "Reduced muscle soreness",
        "Improved stamina",
        "Better morning energy",
      ],
    },
    {
      target_marker: "CoQ10_Serum",
      severity: "Suboptimal",
      recommended_dose_mg: 100,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes: "Maintenance dose for age-related decline or sub-therapeutic levels.",
      slot_category: "supplement",
      max_daily_dose_mg: 200,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 10,
      full_effect_weeks: 16,
      what_to_expect:
        "Gradual improvement in cellular energy and mitochondrial efficiency.",
      early_indicators: [
        "Improved exercise endurance",
        "Reduced post-exercise fatigue",
      ],
    },
  ],

  "CoQ10 + PQQ 200mg/10mg": [
    {
      target_marker: "CoQ10_Serum",
      severity: "Suboptimal",
      recommended_dose_mg: 200,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes:
        "Take with fatty meal. PQQ requires consistent daily dosing for mitochondrial biogenesis.",
      slot_category: "supplement",
      max_daily_dose_mg: 400,
      quick_effect_weeks: 3,
      meaningful_effect_weeks: 8,
      full_effect_weeks: 14,
      what_to_expect:
        "Mitochondrial biogenesis starts at 4–8 weeks. Stack targets both existing mitochondria (CoQ10) and new formation (PQQ).",
      early_indicators: [
        "Improved mental clarity",
        "Better exercise endurance",
        "Enhanced recovery",
      ],
    },
    {
      target_marker: "Mitochondrial_Function",
      severity: "Suboptimal",
      recommended_dose_mg: 200,
      dose_unit: "mg",
      timing_slot: "morning",
      timing_notes: "Pair with NAD+ precursors for a comprehensive mitochondrial protocol.",
      slot_category: "supplement",
      max_daily_dose_mg: 400,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 10,
      full_effect_weeks: 18,
      what_to_expect:
        "Comprehensive mitochondrial support — most pronounced in individuals over 40.",
      early_indicators: [
        "Better cognitive performance",
        "Improved resilience to fatigue",
      ],
    },
  ],

  "Calcium Citrate 500mg": [
    {
      target_marker: "Calcium",
      severity: "Deficient",
      recommended_dose_mg: 1000,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes:
        "Split into 2× 500mg with separate meals. Take 2h apart from iron and levothyroxine.",
      slot_category: "supplement",
      max_daily_dose_mg: 1500,
      quick_effect_weeks: 4,
      meaningful_effect_weeks: 12,
      full_effect_weeks: 52, // bone density requires months to years
      what_to_expect:
        "Bone mineral density improvement over 6–12 months. Reduced fracture risk with consistent supplementation.",
      early_indicators: [
        "Reduced muscle cramps",
        "Better dental health markers",
      ],
    },
    {
      target_marker: "Calcium",
      severity: "Suboptimal",
      recommended_dose_mg: 500,
      dose_unit: "mg",
      timing_slot: "with_meal",
      timing_notes: "Single daily dose with dinner.",
      slot_category: "supplement",
      max_daily_dose_mg: 1000,
      quick_effect_weeks: 8,
      meaningful_effect_weeks: 24,
      full_effect_weeks: 52,
      what_to_expect:
        "Maintenance of bone density and prevention of further depletion.",
      early_indicators: ["Normal neuromuscular function", "Reduced leg cramps"],
    },
  ],

  "Calcium + D3 + Magnesium Complex": [
    {
      target_marker: "Calcium",
      severity: "Deficient",
      recommended_dose_mg: 800,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes:
        "2 softgels with dinner. Magnesium in formula aids relaxation and calcium metabolism.",
      slot_category: "supplement",
      max_daily_dose_mg: 1200,
      quick_effect_weeks: 6,
      meaningful_effect_weeks: 16,
      full_effect_weeks: 52,
      what_to_expect:
        "Three-way synergy: D3 increases absorption, K2-equivalent directs calcium to bone, magnesium activates D3.",
      early_indicators: [
        "Reduced muscle cramps",
        "Better sleep quality (magnesium effect)",
      ],
    },
    {
      target_marker: "Calcium",
      severity: "Suboptimal",
      recommended_dose_mg: 400,
      dose_unit: "mg",
      timing_slot: "evening",
      timing_notes: "Single softgel with evening meal.",
      slot_category: "supplement",
      max_daily_dose_mg: 800,
      quick_effect_weeks: 8,
      meaningful_effect_weeks: 20,
      full_effect_weeks: 52,
      what_to_expect:
        "Gradual bone density support with added sleep and energy benefits from magnesium and D3.",
      early_indicators: [
        "Improved sleep scores",
        "Normal PTH trend on retest",
      ],
    },
  ],
};

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  console.log("Seeding supplement catalog...\n");

  // 1. Insert products, collect IDs
  const insertedIds: Record<string, string> = {};

  for (const product of PRODUCTS) {
    const { data: existing } = await supabase
      .from("health_products")
      .select("id")
      .eq("name", product.name)
      .maybeSingle();

    if (existing) {
      insertedIds[product.name] = (existing as { id: string }).id;
      console.log(`  skip  ${product.name}`);
      continue;
    }

    const { data, error } = await supabase
      .from("health_products")
      .insert(product)
      .select("id")
      .single();

    if (error) {
      console.error(`  FAIL  ${product.name}: ${error.message}`);
    } else {
      insertedIds[product.name] = (data as { id: string }).id;
      console.log(`  ok    ${product.name}`);
    }
  }

  const productCount = Object.keys(insertedIds).length;
  console.log(`\nProducts: ${productCount}/${PRODUCTS.length} ready\n`);

  // 2. Insert dosing rules
  let rulesInserted = 0;
  let rulesSkipped = 0;
  let rulesFailed = 0;

  for (const [productName, rules] of Object.entries(DOSING_RULES)) {
    const productId = insertedIds[productName];
    if (!productId) {
      console.warn(`  warn  No product ID for "${productName}" — skipping rules`);
      continue;
    }

    for (const rule of rules) {
      const { data: existing } = await supabase
        .from("dosing_rules")
        .select("id")
        .eq("product_id", productId)
        .eq("target_marker", rule.target_marker)
        .eq("severity", rule.severity)
        .maybeSingle();

      if (existing) {
        rulesSkipped++;
        continue;
      }

      const { error } = await supabase
        .from("dosing_rules")
        .insert({ product_id: productId, ...rule });

      if (error) {
        console.error(
          `  FAIL  rule [${productName} / ${rule.target_marker} / ${rule.severity}]: ${error.message}`,
        );
        rulesFailed++;
      } else {
        rulesInserted++;
      }
    }
  }

  console.log(
    `Dosing rules: ${rulesInserted} inserted, ${rulesSkipped} skipped, ${rulesFailed} failed\n`,
  );
  console.log("Seed complete.");
}

seed().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
