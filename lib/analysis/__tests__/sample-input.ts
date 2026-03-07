/// lib/analysis/__tests__/sample-input.ts
// Realistic AnalysisInput fixture for the biomarker analysis engine.
//
// Represents a 38-year-old male endurance/strength athlete with:
//   ★ ApoB 95 mg/dL          — slightly elevated; subclinical CVD risk
//   ★ Testosterone 420 ng/dL  — low-normal; SHBG driving down free fraction
//   ★ hs-CRP 1.8 mg/L         — low-grade chronic inflammation
//   ★ HRV 52 ms               — moderate for advanced athlete; recovery headroom
//   ★ Sleep score 71           — fair; chronically short and deep-sleep-deficient
//   ★ VO2 max 48 mL/kg/min    — good but below elite ceiling for age/load

import type { AnalysisInput, BiomarkerValue } from "@/lib/analysis/types";

const DATE = "2026-03-01";

// ── Helper ──────────────────────────────────────────────────────────────────

function bv(
  value:        number,
  unit:         string,
  status:       BiomarkerValue["status"],
  referenceMin: number | null,
  referenceMax: number | null,
): BiomarkerValue {
  return { value, unit, status, referenceMin, referenceMax, date: DATE };
}

// ── Fixture ─────────────────────────────────────────────────────────────────

export const sampleAdvancedMaleAthlete: AnalysisInput = {

  // ── Blood panel ──────────────────────────────────────────────────────────

  bloodPanel: {

    // CBC — within optimal range for an athletic male
    hemoglobin:   bv(15.2, "g/dL",  "optimal", 13.5,  17.5),
    hematocrit:   bv(44.5, "%",      "optimal", 41.0,  53.0),
    rbc:          bv(5.1,  "M/µL",  "optimal",  4.7,   6.1),
    wbc:          bv(5.8,  "K/µL",  "optimal",  4.5,  11.0),
    platelets:    bv(228,  "K/µL",  "optimal", 150,   400),
    mcv:          bv(88,   "fL",     "optimal",  80,   100),
    mch:          bv(29.5, "pg",     "optimal",  27,    33),
    neutrophils:  bv(58,   "%",      "optimal",  40,    70),
    lymphocytes:  bv(32,   "%",      "optimal",  20,    40),
    monocytes:    bv(7,    "%",      "optimal",   2,    10),

    // CMP — metabolically healthy; AST mildly elevated (post-exercise muscle)
    glucose:          bv(88,   "mg/dL",         "optimal",  70,  100),
    hba1c:            bv(5.3,  "%",              "optimal",   4.8,  5.6),
    fastingInsulin:   bv(7.0,  "µIU/mL",        "normal",    2,   25),
    creatinine:       bv(1.05, "mg/dL",          "optimal",   0.74, 1.35),
    bun:              bv(18,   "mg/dL",          "optimal",   7,   25),
    egfr:             bv(92,   "mL/min/1.73m²",  "optimal",  90,  null),
    sodium:           bv(140,  "mEq/L",          "optimal", 136,  145),
    potassium:        bv(4.2,  "mEq/L",          "optimal",   3.5,  5.1),
    chloride:         bv(102,  "mEq/L",          "optimal",  98,  107),
    bicarbonate:      bv(25,   "mEq/L",          "optimal",  22,   29),
    calcium:          bv(9.6,  "mg/dL",          "optimal",   8.5, 10.2),
    albumin:          bv(4.5,  "g/dL",           "optimal",   3.5,  5.0),
    totalProtein:     bv(7.4,  "g/dL",           "optimal",   6.3,  8.2),
    alt:              bv(28,   "U/L",            "optimal",   7,   56),
    ast:              bv(35,   "U/L",            "normal",   10,   40),   // mild elevation from training
    ggt:              bv(22,   "U/L",            "optimal",   8,   61),
    uricAcid:         bv(5.8,  "mg/dL",          "normal",    3.4,  7.2),

    // Lipid panel — LDL borderline; ApoB elevated; HDL and TG healthy
    totalCholesterol:  bv(195, "mg/dL", "normal",  null, 200),
    ldl:               bv(118, "mg/dL", "normal",  null, 130),
    hdl:               bv(58,  "mg/dL", "optimal",   40, null),
    triglycerides:     bv(95,  "mg/dL", "optimal", null, 150),
    vldl:              bv(19,  "mg/dL", "normal",  null,  30),
    nonHdlCholesterol: bv(137, "mg/dL", "normal",  null, 160),
    apoB:              bv(95,  "mg/dL", "high",    null,  90),    // ★ elevated; optimal <80 mg/dL
    apoA1:             bv(155, "mg/dL", "optimal",  120, null),

    // Thyroid — TSH slightly above functional optimum; conversion adequate
    tsh:    bv(2.1, "mIU/L", "normal",  0.4, 4.0),    // functional optimum 1.0–2.0
    freeT3: bv(3.4, "pg/mL", "optimal", 2.3, 4.2),
    freeT4: bv(1.2, "ng/dL", "optimal", 0.8, 1.8),

    // Hormones — testosterone low-normal; SHBG upper-normal suppresses free fraction
    testosteroneTotal: bv(420,  "ng/dL",  "normal", 300, 1000),  // ★ low-normal (optimal 550–900)
    testosteroneFree:  bv(12.5, "pg/mL",  "normal",   9,   30),  // depressed by SHBG
    shbg:              bv(38,   "nmol/L", "normal",  10,   57),   // upper-normal → binds T
    lh:                bv(4.2,  "mIU/mL", "optimal",  1.7,  8.6),
    fsh:               bv(3.8,  "mIU/mL", "optimal",  1.5, 12.4),
    prolactin:         bv(8.5,  "ng/mL",  "optimal",  2.0, 18.0),
    dheaS:             bv(285,  "µg/dL",  "normal",  80,  560),   // mid-range; declining with age
    estradiol:         bv(24,   "pg/mL",  "optimal",  8,   35),   // balanced
    igf1:              bv(185,  "ng/mL",  "optimal", 100,  300),
    cortisol:          bv(14,   "µg/dL",  "optimal",  6.2, 19.4),

    // Inflammation & CVD risk — CRP elevated; homocysteine above functional optimum
    hsCrp:        bv(1.8,  "mg/L",   "high",    null,  3.0),  // ★ elevated; optimal <0.5
    homocysteine: bv(9.5,  "µmol/L", "high",    null, 15.0),  // optimal <9; methylation suboptimal
    fibrinogen:   bv(295,  "mg/dL",  "normal",  200,  400),

    // Nutrients — vitamin D suboptimal; omega-3 index below optimal
    vitaminD:    bv(42,  "ng/mL", "normal",   30, null),  // functional optimum 50–80
    vitaminB12:  bv(520, "pg/mL", "optimal", 200,  900),
    folate:      bv(14,  "ng/mL", "optimal",   5, null),
    ferritin:    bv(68,  "ng/mL", "normal",   12,  300),  // adequate; optimal for endurance is 80+
    magnesium:   bv(2.1, "mg/dL", "normal",   1.7,  2.4),
    zinc:        bv(88,  "µg/dL", "optimal",  60,  120),
    omega3Index: bv(5.8, "%",     "low",       8,  null),  // ★ suboptimal; optimal >8%
  },

  // ── Wearable snapshot ─────────────────────────────────────────────────────

  wearable: {
    source:            "oura",
    date:              DATE,

    // HRV & cardiac
    hrv:               52,    // ★ ms RMSSD — moderate for advanced athlete; room to grow
    restingHr:         52,    // bpm — solid aerobic adaptation
    heartRateAvg:      62,    // bpm during waking hours
    heartRateMax:      172,   // bpm — last session peak
    hrvRmssd:          52,    // ms — mirrors hrv field

    // Sleep — fair score driven by insufficient duration and low deep sleep
    sleepScore:        71,    // ★ 0–100 — fair; target is 85+
    sleepTotalMinutes: 385,   // 6 h 25 min — chronically below 7 h optimum
    deepSleepMin:      56,    // min — below 90 min target for recovery
    remSleepMin:       74,    // min — slightly low
    sleepRemMinutes:   74,
    sleepLightMinutes: 255,

    // Recovery & readiness
    recoveryScore:     68,    // 0–100 — fair; high training load suppressing score
    readinessScore:    70,    // 0–100 — fair
    strainScore:       15.2,  // 0–21 Whoop-scale — high training load

    // Activity
    steps:             9_800,
    activeCalories:    680,

    // Performance & oxygenation
    vo2Max:            48,    // ★ mL/kg/min — good; elite M athletes at this age are 55+
    stressScore:       38,    // 0–100 — moderate; HRV suppressor
    spo2:              97,    // % — normal
  },

  // ── User profile ──────────────────────────────────────────────────────────

  profile: {
    age:               38,
    biologicalSex:     "male",
    heightCm:          180,
    weightKg:          82,
    activityLevel:     "very_active",
    athleteArchetype:  "endurance/strength hybrid",
    healthGoals:       ["longevity", "performance", "hormonal_health"],
    conditions:        [],
    currentMedications: "",
    currentSupplements:
      "whey protein 30 g/day, creatine monohydrate 5 g/day, magnesium glycinate 400 mg/night",
    userTier:          "advanced",
  },

};
