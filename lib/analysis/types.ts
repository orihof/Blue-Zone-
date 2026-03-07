/// lib/analysis/types.ts
// Full type system for the Blue Zone biomarker analysis engine.
//
// BloodPanel fields map 1:1 to rows in the `biomarkers` table.
// Use biomarkersToBloodPanel() to hydrate, bloodPanelToLines() for AI prompts.
// FUNCTIONAL_MEDICINE_RANGES provides optimal (not just "normal") thresholds.

// ─────────────────────────────────────────────────────────────────────────────
// Primitive / shared
// ─────────────────────────────────────────────────────────────────────────────

export type BiomarkerStatus = "optimal" | "normal" | "low" | "high" | "critical";

export type Grade = "A" | "B" | "C" | "D" | "F";

export type Priority = 1 | 2 | 3;

/** A single biomarker reading — maps 1:1 to one row in `biomarkers`. */
export interface BiomarkerValue {
  value:        number;
  unit:         string;
  status:       BiomarkerStatus;
  referenceMin: number | null;
  referenceMax: number | null;
  date:         string | null;   // ISO date string (YYYY-MM-DD)
}

/** Raw row shape returned by Supabase from the `biomarkers` table. */
export interface BiomarkerRow {
  name:          string;
  value:         number;
  unit:          string | null;
  status:        string;
  reference_min: number | null;
  reference_max: number | null;
  date?:         string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// BloodPanel
// ─────────────────────────────────────────────────────────────────────────────

/** Structured representation of a blood panel. All fields optional. */
export interface BloodPanel {

  // ── Complete Blood Count (CBC) ──────────────────────────────────────────────
  /** g/dL */          hemoglobin?:             BiomarkerValue;
  /** % */             hematocrit?:             BiomarkerValue;
  /** M/µL */          rbc?:                    BiomarkerValue;
  /** K/µL */          wbc?:                    BiomarkerValue;
  /** K/µL */          platelets?:              BiomarkerValue;
  /** fL */            mcv?:                    BiomarkerValue;
  /** pg */            mch?:                    BiomarkerValue;
  /** g/dL */          mchc?:                   BiomarkerValue;
  /** % */             neutrophils?:            BiomarkerValue;
  /** % */             lymphocytes?:            BiomarkerValue;
  /** % */             monocytes?:              BiomarkerValue;
  /** % */             eosinophils?:            BiomarkerValue;
  /** % */             basophils?:              BiomarkerValue;

  // ── Metabolic / CMP ────────────────────────────────────────────────────────
  /** mg/dL */         glucose?:                BiomarkerValue;
  /** % */             hba1c?:                  BiomarkerValue;
  /** µIU/mL */        fastingInsulin?:         BiomarkerValue;
  /** calculated */    homaIr?:                 BiomarkerValue;
  /** mg/dL */         creatinine?:             BiomarkerValue;
  /** mg/dL */         bun?:                    BiomarkerValue;
  /**  */              bunCreatinineRatio?:     BiomarkerValue;
  /** mL/min/1.73m² */ egfr?:                   BiomarkerValue;
  /** mEq/L */         sodium?:                 BiomarkerValue;
  /** mEq/L */         potassium?:              BiomarkerValue;
  /** mEq/L */         chloride?:               BiomarkerValue;
  /** mEq/L */         bicarbonate?:            BiomarkerValue;
  /** mg/dL */         calcium?:                BiomarkerValue;
  /** g/dL */          albumin?:                BiomarkerValue;
  /** g/dL */          totalProtein?:           BiomarkerValue;
  /** U/L */           alt?:                    BiomarkerValue;
  /** U/L */           ast?:                    BiomarkerValue;
  /** U/L */           alp?:                    BiomarkerValue;
  /** U/L */           ggt?:                    BiomarkerValue;
  /** mg/dL */         totalBilirubin?:         BiomarkerValue;
  /** mg/dL */         directBilirubin?:        BiomarkerValue;
  /** U/L */           ldh?:                    BiomarkerValue;
  /** mg/dL */         uricAcid?:               BiomarkerValue;

  // ── Lipid Panel ────────────────────────────────────────────────────────────
  /** mg/dL */         totalCholesterol?:       BiomarkerValue;
  /** mg/dL */         ldl?:                    BiomarkerValue;
  /** mg/dL */         hdl?:                    BiomarkerValue;
  /** mg/dL */         triglycerides?:          BiomarkerValue;
  /** mg/dL */         vldl?:                   BiomarkerValue;
  /** mg/dL */         nonHdlCholesterol?:      BiomarkerValue;
  /** mg/dL */         apoB?:                   BiomarkerValue;
  /** mg/dL */         apoA1?:                  BiomarkerValue;
  /** nmol/L */        lpA?:                    BiomarkerValue;

  // ── Thyroid ────────────────────────────────────────────────────────────────
  /** mIU/L */         tsh?:                    BiomarkerValue;
  /** pg/mL */         freeT3?:                 BiomarkerValue;
  /** ng/dL */         freeT4?:                 BiomarkerValue;
  /** ng/dL */         totalT3?:                BiomarkerValue;
  /** µg/dL */         totalT4?:                BiomarkerValue;
  /** IU/mL */         tpoAntibodies?:          BiomarkerValue;
  /** IU/mL */         thyroglobulinAb?:        BiomarkerValue;

  // ── Hormones ───────────────────────────────────────────────────────────────
  /** ng/dL */         testosteroneTotal?:      BiomarkerValue;
  /** pg/mL */         testosteroneFree?:       BiomarkerValue;
  /** nmol/L */        shbg?:                   BiomarkerValue;
  /** mIU/mL */        lh?:                     BiomarkerValue;
  /** mIU/mL */        fsh?:                    BiomarkerValue;
  /** ng/mL */         prolactin?:              BiomarkerValue;
  /** µg/dL */         dheaS?:                  BiomarkerValue;
  /** pg/mL */         estradiol?:              BiomarkerValue;
  /** ng/mL */         progesterone?:           BiomarkerValue;
  /** pg/mL */         dht?:                    BiomarkerValue;
  /** ng/mL */         igf1?:                   BiomarkerValue;
  /** µg/dL */         cortisol?:               BiomarkerValue;
  /** ng/mL */         amh?:                    BiomarkerValue;
  /** pg/mL */         insulinLikePeptide3?:    BiomarkerValue;

  // ── Inflammation & Cardiovascular Risk ─────────────────────────────────────
  /** mg/L */          hsCrp?:                  BiomarkerValue;
  /** pg/mL */         il6?:                    BiomarkerValue;
  /** mg/dL */         fibrinogen?:             BiomarkerValue;
  /** µmol/L */        homocysteine?:           BiomarkerValue;
  /** mm/hr */         esr?:                    BiomarkerValue;
  /** pmol/L */        mpo?:                    BiomarkerValue;
  /** U/L */           oxLdl?:                  BiomarkerValue;
  /** µM */            tmao?:                   BiomarkerValue;

  // ── Nutrients & Vitamins ───────────────────────────────────────────────────
  /** ng/mL */         vitaminD?:               BiomarkerValue;
  /** pg/mL */         vitaminB12?:             BiomarkerValue;
  /** nmol/L */        vitaminB6?:              BiomarkerValue;
  /** ng/mL */         folate?:                 BiomarkerValue;
  /** ng/mL */         ferritin?:               BiomarkerValue;
  /** µg/dL */         iron?:                   BiomarkerValue;
  /** µg/dL */         tibc?:                   BiomarkerValue;
  /** % */             transferrinSaturation?:  BiomarkerValue;
  /** mg/dL */         magnesium?:              BiomarkerValue;
  /** µg/dL */         zinc?:                   BiomarkerValue;
  /** µg/dL */         copper?:                 BiomarkerValue;
  /** µg/L */          selenium?:               BiomarkerValue;
  /** % */             omega3Index?:            BiomarkerValue;
  /** µg/mL */         coq10?:                  BiomarkerValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// WearableSnapshot
// ─────────────────────────────────────────────────────────────────────────────

/** Maps to a row in `wearable_snapshots`. All fields optional. */
export interface WearableSnapshot {
  source?:              string;    // 'whoop' | 'oura' | 'garmin' | 'apple_health'
  date?:                string;    // ISO date string

  // Core metrics
  /** ms (RMSSD) */    hrv?:               number;
  /** bpm */           restingHr?:         number;
  /** 0–100 */         sleepScore?:        number;
  /** minutes */       deepSleepMin?:      number;
  /** minutes */       remSleepMin?:       number;
  /** 0–100 */         recoveryScore?:     number;
  /** 0–21 or 0–100 */ strainScore?:       number;
  /** 0–100 */         readinessScore?:    number;
  steps?:               number;
  activeCalories?:      number;

  // Terra / extended metrics
  /** bpm */           heartRateAvg?:      number;
  /** bpm */           heartRateMax?:      number;
  /** ms */            hrvRmssd?:          number;
  /** minutes */       sleepTotalMinutes?: number;
  /** minutes */       sleepRemMinutes?:   number;
  /** minutes */       sleepDeepMinutes?:  number;
  /** minutes */       sleepLightMinutes?: number;
  /** mL/kg/min */     vo2Max?:            number;
  /** 0–100 */         stressScore?:       number;
  /** % */             spo2?:              number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UserProfile
// ─────────────────────────────────────────────────────────────────────────────

export type UserTier = "basic" | "advanced";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

/** Maps to a row in `profiles`. */
export interface UserProfile {
  age?:                 number;
  biologicalSex?:       "male" | "female" | "other";
  heightCm?:            number;
  weightKg?:            number;
  activityLevel?:       ActivityLevel;
  athleteArchetype?:    string;
  healthGoals?:         string[];
  conditions?:          string[];
  currentMedications?:  string;
  currentSupplements?:  string;
  biologicalAge?:       number;
  /** Controls which recommendations and diagnostics are surfaced. */
  userTier:             UserTier;
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisInput
// ─────────────────────────────────────────────────────────────────────────────

/** Everything fed into the analysis engine for one user session. */
export interface AnalysisInput {
  bloodPanel: BloodPanel;
  wearable?:  WearableSnapshot | null;
  profile:    UserProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// DomainScore
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisDomain =
  | "metabolic"
  | "cardiovascular"
  | "hormonal"
  | "inflammatory"
  | "nutritional"
  | "recovery"
  | "cognitive";

/** Health score for a single clinical domain. */
export interface DomainScore {
  domain:      AnalysisDomain;
  /** 0–100 optimization score (100 = fully optimized, not just "in range"). */
  score:       number;
  grade:       Grade;
  summary:     string;
  /** Names of the biomarkers that most influenced this score. */
  keyMarkers:  string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding
// ─────────────────────────────────────────────────────────────────────────────

/** A single noteworthy biomarker observation. */
export interface Finding {
  marker:               string;
  value:                number;
  unit:                 string;
  status:               BiomarkerStatus;
  /** Functional medicine optimal minimum (may differ from lab reference). */
  optimalMin?:          number;
  /** Functional medicine optimal maximum (may differ from lab reference). */
  optimalMax?:          number;
  interpretation:       string;
  clinicalSignificance: "low" | "moderate" | "high" | "critical";
  relatedDomains:       AnalysisDomain[];
  /** Whether a concrete intervention exists for this finding. */
  actionable:           boolean;
  /** Confidence score [0, 1] added by validateAndEnrich based on corroboration count. */
  confidence?:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CrossDomainSignal
// ─────────────────────────────────────────────────────────────────────────────

/** A pattern that spans multiple domains — more clinically significant than
 *  any single finding in isolation. */
export interface CrossDomainSignal {
  /** Human-readable signal name, e.g. "Metabolic-Inflammatory Axis Dysfunction". */
  signal:       string;
  domains:      AnalysisDomain[];
  /** Biomarker names that collectively form this signal. */
  markers:      string[];
  explanation:  string;
  priority:     "low" | "medium" | "high";
}

// ─────────────────────────────────────────────────────────────────────────────
// Protocol sub-interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplementRecommendation {
  name:               string;
  dose:               string;
  timing:             string;
  /** Preferred form, e.g. "magnesium glycinate", "methylcobalamin". */
  form?:              string;
  rationale:          string;
  targetMarkers:      string[];
  duration?:          string;
  contraindications?: string[];
  /** Minimum user tier required to surface this recommendation. */
  tierRequired:       UserTier;
  priority:           Priority;
}

export interface NutritionRecommendation {
  intervention:  string;
  description:   string;
  targetMarkers: string[];
  rationale:     string;
  priority:      Priority;
}

export interface TrainingRecommendation {
  /** e.g. "Zone 2 cardio", "Heavy compound resistance training". */
  type:          string;
  frequency:     string;
  duration:      string;
  intensity:     string;
  rationale:     string;
  targetMarkers: string[];
  priority:      Priority;
}

export interface SleepRecommendation {
  intervention:  string;
  description:   string;
  rationale:     string;
  targetMarkers: string[];
  priority:      Priority;
}

export interface DiagnosticRecommendation {
  test:          string;
  rationale:     string;
  urgency:       "routine" | "soon" | "urgent";
  targetMarkers: string[];
  /** Minimum user tier required to surface this recommendation. */
  tierRequired:  UserTier;
}

// ─────────────────────────────────────────────────────────────────────────────
// Protocol
// ─────────────────────────────────────────────────────────────────────────────

/** Full personalised action plan produced by the analysis engine. */
export interface Protocol {
  supplements:  SupplementRecommendation[];
  nutrition:    NutritionRecommendation[];
  training:     TrainingRecommendation[];
  sleep:        SleepRecommendation[];
  diagnostics:  DiagnosticRecommendation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CriticalFlag
// ─────────────────────────────────────────────────────────────────────────────

/** A value that may require prompt medical attention. */
export interface CriticalFlag {
  marker:   string;
  value:    string;
  concern:  string;
  action:   string;
  urgency:  "discuss_at_next_visit" | "schedule_soon" | "seek_care_today";
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisOutput
// ─────────────────────────────────────────────────────────────────────────────

/** The complete output of one biomarker analysis run. Stored as JSONB in
 *  `analysis_reports.payload`. */
export interface AnalysisOutput {
  /** 0–100 composite health optimization score. */
  overallScore:       number;
  overallGrade:       Grade;
  summary:            string;
  domainScores:       DomainScore[];
  keyFindings:        Finding[];
  crossDomainSignals: CrossDomainSignal[];
  protocol:           Protocol;
  criticalFlags:      CriticalFlag[];
  /** Suggested retesting interval, e.g. "3 months", "6 months". */
  retestIn:           string;
  generatedAt:        string;   // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL_MEDICINE_RANGES
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionalRange {
  /** Optimal minimum (functional medicine threshold, tighter than lab ref). */
  min:  number | null;
  /** Optimal maximum. */
  max:  number | null;
  unit: string;
  /** Clinical context note. */
  note: string;
}

/**
 * Functional medicine optimal ranges for every BloodPanel field.
 * These are tighter than standard lab reference ranges and reflect
 * health optimisation rather than disease detection.
 * Sources: Institute for Functional Medicine, Optimal DX, LabCorp/Quest
 * functional reference intervals.
 */
export const FUNCTIONAL_MEDICINE_RANGES: Partial<Record<keyof BloodPanel, FunctionalRange>> = {

  // ── CBC ──────────────────────────────────────────────────────────────────
  hemoglobin:           { min: 13.5, max: 17.0, unit: "g/dL",   note: "Men 14–17; Women 13–15.5 — adjust for altitude" },
  hematocrit:           { min: 38,   max: 50,   unit: "%",       note: "Men 40–50; Women 37–47" },
  rbc:                  { min: 4.0,  max: 5.5,  unit: "M/µL",   note: "Chronic low suggests iron, B12, or folate deficiency" },
  wbc:                  { min: 5.0,  max: 7.5,  unit: "K/µL",   note: "Functional optimum narrower than lab ref (4.5–11)" },
  platelets:            { min: 200,  max: 350,  unit: "K/µL",   note: "High end may indicate chronic inflammation" },
  mcv:                  { min: 82,   max: 92,   unit: "fL",      note: "Low = iron deficiency; high = B12/folate deficiency" },
  mch:                  { min: 28,   max: 32,   unit: "pg",      note: "Tracks with MCV" },
  mchc:                 { min: 33,   max: 36,   unit: "g/dL",   note: "Low indicates iron-deficiency anaemia" },
  neutrophils:          { min: 50,   max: 65,   unit: "%",       note: "Elevated may indicate infection or chronic stress" },
  lymphocytes:          { min: 25,   max: 40,   unit: "%",       note: "Low lymphocytes can indicate immune suppression" },

  // ── Metabolic ────────────────────────────────────────────────────────────
  glucose:              { min: 70,   max: 86,   unit: "mg/dL",  note: "Functional optimum 70–86; >100 = pre-diabetes risk" },
  hba1c:                { min: 4.5,  max: 5.3,  unit: "%",      note: "Functional optimal <5.3%; >5.7% = pre-diabetes (ADA)" },
  fastingInsulin:       { min: 2,    max: 5,    unit: "µIU/mL", note: "Even 'normal' levels 10–25 indicate early IR" },
  homaIr:               { min: 0.5,  max: 1.0,  unit: "",       note: "HOMA-IR >1.0 suggests early insulin resistance" },
  creatinine:           { min: 0.8,  max: 1.1,  unit: "mg/dL",  note: "Men 0.8–1.1; Women 0.6–0.9; low can mask poor muscle mass" },
  egfr:                 { min: 90,   max: null, unit: "mL/min", note: "Functional: >90; lab normal >60 — decline warrants attention" },
  albumin:              { min: 4.0,  max: 5.0,  unit: "g/dL",  note: "Low albumin is a sensitive marker of nutritional decline" },
  alt:                  { min: 10,   max: 26,   unit: "U/L",    note: "Lab ref ≤56 hides fatty liver; functional <26" },
  ast:                  { min: 10,   max: 26,   unit: "U/L",    note: "AST/ALT >1 suggests alcohol or muscle damage" },
  ggt:                  { min: null, max: 25,   unit: "U/L",    note: "Sensitive marker of liver stress and oxidative burden" },
  totalBilirubin:       { min: 0.4,  max: 0.9,  unit: "mg/dL",  note: "Mildly elevated bilirubin is antioxidant; very high = cholestasis" },
  uricAcid:             { min: 3.0,  max: 5.5,  unit: "mg/dL",  note: "Men <6.0; Women <5.0; elevated = gout risk + metabolic syndrome" },

  // ── Lipids ───────────────────────────────────────────────────────────────
  totalCholesterol:     { min: 160,  max: 200,  unit: "mg/dL",  note: "<160 associated with increased all-cause mortality" },
  ldl:                  { min: null, max: 99,   unit: "mg/dL",  note: "ApoB is a better risk marker; LDL particle size matters" },
  hdl:                  { min: 60,   max: null, unit: "mg/dL",  note: "Men >55; Women >65 for optimal cardio-protection" },
  triglycerides:        { min: null, max: 80,   unit: "mg/dL",  note: "Lab ref <150 hides metabolic dysfunction; functional <80" },
  apoB:                 { min: null, max: 70,   unit: "mg/dL",  note: "Best single marker of atherosclerotic risk; optimal <70" },
  lpA:                  { min: null, max: 30,   unit: "nmol/L", note: "Genetic; >75 nmol/L significantly elevates CV risk" },

  // ── Thyroid ──────────────────────────────────────────────────────────────
  tsh:                  { min: 0.5,  max: 2.0,  unit: "mIU/L",  note: "Lab ref 0.4–4.5 is too wide; functional 0.5–2.0" },
  freeT3:               { min: 3.0,  max: 4.0,  unit: "pg/mL",  note: "Active form; low despite normal TSH = poor conversion" },
  freeT4:               { min: 1.1,  max: 1.6,  unit: "ng/dL",  note: "Should be in the upper half of the reference range" },

  // ── Hormones ─────────────────────────────────────────────────────────────
  testosteroneTotal:    { min: 600,  max: 900,  unit: "ng/dL",  note: "Lab 'normal' 300+ misses significant functional decline" },
  testosteroneFree:     { min: 15,   max: 25,   unit: "pg/mL",  note: "Biologically active fraction; often low even with normal total T" },
  shbg:                 { min: 15,   max: 40,   unit: "nmol/L", note: "High SHBG lowers free T; low SHBG + high T = metabolic risk" },
  cortisol:             { min: 10,   max: 18,   unit: "µg/dL",  note: "AM draw; chronic low = adrenal fatigue; high = HPA dysregulation" },
  dheaS:                { min: 150,  max: 400,  unit: "µg/dL",  note: "Declines with age; low correlates with fatigue and immune decline" },
  estradiol:            { min: 20,   max: 30,   unit: "pg/mL",  note: "Men: 20–30 optimal; women range varies by cycle phase" },
  igf1:                 { min: 150,  max: 250,  unit: "ng/mL",  note: "Reflects GH status; declines with age; low = recovery impairment" },
  prolactin:            { min: null, max: 12,   unit: "ng/mL",  note: "Elevated prolactin suppresses testosterone and libido" },

  // ── Inflammation ─────────────────────────────────────────────────────────
  hsCrp:                { min: null, max: 0.5,  unit: "mg/L",   note: "Lab ref <3.0 is permissive; functional optimal <0.5" },
  homocysteine:         { min: null, max: 7.0,  unit: "µmol/L", note: "Lab ref <15 misses CV and cognitive risk; optimal <7" },
  fibrinogen:           { min: 150,  max: 300,  unit: "mg/dL",  note: "Acute-phase protein; elevated = chronic inflammation or clot risk" },
  esr:                  { min: null, max: 10,   unit: "mm/hr",  note: "Non-specific but sensitive marker of systemic inflammation" },

  // ── Nutrients ────────────────────────────────────────────────────────────
  vitaminD:             { min: 50,   max: 80,   unit: "ng/mL",  note: "Lab ref 30–100 is insufficient; functional 50–80 optimal" },
  vitaminB12:           { min: 500,  max: 900,  unit: "pg/mL",  note: "Lab ref >200 misses functional deficiency; optimal >500" },
  folate:               { min: 15,   max: null, unit: "ng/mL",  note: "Critical for methylation; lab ref >5.4 is too low" },
  ferritin:             { min: 70,   max: 150,  unit: "ng/mL",  note: "Endurance/strength athletes: optimal ≥80 ng/mL for iron-dependent performance; athlete floor 70; sedentary adults min 50; Women 50–100; low ferritin ≠ anaemia but impairs training adaptation and VO2 max" },
  magnesium:            { min: 2.0,  max: 2.4,  unit: "mg/dL",  note: "Serum is a poor measure; RBC magnesium preferred if available" },
  zinc:                 { min: 80,   max: 120,  unit: "µg/dL",  note: "Low zinc impairs immunity, testosterone, wound healing" },
  omega3Index:          { min: 8,    max: null, unit: "%",       note: "Functional optimal >8%; <4% = high cardiovascular risk" },
};

// ─────────────────────────────────────────────────────────────────────────────
// MARKER_NAMES — DB name → BloodPanel field mapping
// ─────────────────────────────────────────────────────────────────────────────

/** Maps BloodPanel field names → possible name strings in the `biomarkers` table.
 *  First entry in each array is the canonical/preferred name. */
export const MARKER_NAMES: Record<keyof BloodPanel, string[]> = {
  hemoglobin:              ["Hemoglobin", "Hgb", "Haemoglobin"],
  hematocrit:              ["Hematocrit", "Hct", "Packed Cell Volume", "PCV"],
  rbc:                     ["RBC", "Red Blood Cell Count", "Erythrocytes", "Red Blood Cells"],
  wbc:                     ["WBC", "White Blood Cell Count", "Leukocytes", "White Blood Cells"],
  platelets:               ["Platelets", "Platelet Count", "Thrombocytes", "PLT"],
  mcv:                     ["MCV", "Mean Corpuscular Volume"],
  mch:                     ["MCH", "Mean Corpuscular Hemoglobin"],
  mchc:                    ["MCHC", "Mean Corpuscular Hemoglobin Concentration"],
  neutrophils:             ["Neutrophils", "Neutrophil %", "Segs", "PMN"],
  lymphocytes:             ["Lymphocytes", "Lymphocyte %"],
  monocytes:               ["Monocytes", "Monocyte %"],
  eosinophils:             ["Eosinophils", "Eosinophil %"],
  basophils:               ["Basophils", "Basophil %"],
  glucose:                 ["Glucose", "Fasting Glucose", "Blood Glucose", "Plasma Glucose"],
  hba1c:                   ["HbA1c", "Hemoglobin A1c", "A1C", "Glycated Hemoglobin", "HBA1C"],
  fastingInsulin:          ["Fasting Insulin", "Insulin", "Insulin (fasting)"],
  homaIr:                  ["HOMA-IR", "HOMA IR", "Insulin Resistance Index"],
  creatinine:              ["Creatinine", "Serum Creatinine"],
  bun:                     ["BUN", "Blood Urea Nitrogen", "Urea Nitrogen"],
  bunCreatinineRatio:      ["BUN/Creatinine Ratio", "BUN:Creatinine", "BUN/Creatinine"],
  egfr:                    ["eGFR", "GFR", "Estimated GFR", "Glomerular Filtration Rate"],
  sodium:                  ["Sodium", "Na", "Serum Sodium"],
  potassium:               ["Potassium", "K", "Serum Potassium"],
  chloride:                ["Chloride", "Cl", "Serum Chloride"],
  bicarbonate:             ["Bicarbonate", "CO2", "Carbon Dioxide", "HCO3"],
  calcium:                 ["Calcium", "Ca", "Serum Calcium"],
  albumin:                 ["Albumin", "Serum Albumin"],
  totalProtein:            ["Total Protein", "Protein, Total", "Serum Protein"],
  alt:                     ["ALT", "SGPT", "Alanine Aminotransferase", "Alanine Transaminase"],
  ast:                     ["AST", "SGOT", "Aspartate Aminotransferase", "Aspartate Transaminase"],
  alp:                     ["ALP", "Alkaline Phosphatase", "Alk Phos"],
  ggt:                     ["GGT", "Gamma-Glutamyl Transferase", "Gamma GT", "GGTP"],
  totalBilirubin:          ["Total Bilirubin", "Bilirubin, Total", "T. Bilirubin"],
  directBilirubin:         ["Direct Bilirubin", "Bilirubin, Direct", "D. Bilirubin"],
  ldh:                     ["LDH", "Lactate Dehydrogenase", "Lactic Dehydrogenase"],
  uricAcid:                ["Uric Acid", "Urate", "Serum Uric Acid"],
  totalCholesterol:        ["Total Cholesterol", "Cholesterol", "Cholesterol, Total"],
  ldl:                     ["LDL", "LDL Cholesterol", "LDL-C", "Low-Density Lipoprotein"],
  hdl:                     ["HDL", "HDL Cholesterol", "HDL-C", "High-Density Lipoprotein"],
  triglycerides:           ["Triglycerides", "Triglyceride", "TG", "Triacylglycerols"],
  vldl:                    ["VLDL", "VLDL Cholesterol", "VLDL-C"],
  nonHdlCholesterol:       ["Non-HDL Cholesterol", "Non-HDL-C", "Non HDL Cholesterol"],
  apoB:                    ["ApoB", "Apolipoprotein B", "Apo B"],
  apoA1:                   ["ApoA1", "Apolipoprotein A1", "Apo A-I", "Apo A1"],
  lpA:                     ["Lp(a)", "Lipoprotein(a)", "Lipoprotein a"],
  tsh:                     ["TSH", "Thyroid Stimulating Hormone", "Thyrotropin"],
  freeT3:                  ["Free T3", "FT3", "Triiodothyronine, Free", "Free Triiodothyronine"],
  freeT4:                  ["Free T4", "FT4", "Thyroxine, Free", "Free Thyroxine"],
  totalT3:                 ["Total T3", "T3", "Triiodothyronine", "Triiodothyronine, Total"],
  totalT4:                 ["Total T4", "T4", "Thyroxine", "Thyroxine, Total"],
  tpoAntibodies:           ["TPO Antibodies", "Anti-TPO", "Thyroid Peroxidase Antibodies", "TPO Ab"],
  thyroglobulinAb:         ["Thyroglobulin Antibodies", "Anti-Thyroglobulin", "TgAb"],
  testosteroneTotal:       ["Testosterone", "Total Testosterone", "Testosterone, Total", "Testosterone (Total)"],
  testosteroneFree:        ["Free Testosterone", "Testosterone, Free", "Testosterone (Free)"],
  shbg:                    ["SHBG", "Sex Hormone Binding Globulin", "Sex Hormone-Binding Globulin"],
  lh:                      ["LH", "Luteinizing Hormone", "Lutropin"],
  fsh:                     ["FSH", "Follicle Stimulating Hormone", "Follitropin"],
  prolactin:               ["Prolactin", "PRL"],
  dheaS:                   ["DHEA-S", "DHEAS", "Dehydroepiandrosterone Sulfate", "DHEA Sulfate"],
  estradiol:               ["Estradiol", "E2", "Oestradiol"],
  progesterone:            ["Progesterone"],
  dht:                     ["DHT", "Dihydrotestosterone"],
  igf1:                    ["IGF-1", "Insulin-like Growth Factor 1", "Somatomedin C"],
  cortisol:                ["Cortisol", "Serum Cortisol", "Cortisol (AM)", "Cortisol AM"],
  amh:                     ["AMH", "Anti-Mullerian Hormone", "Anti-Müllerian Hormone"],
  insulinLikePeptide3:     ["INSL3", "Insulin-like Peptide 3"],
  hsCrp:                   ["hs-CRP", "hsCRP", "High-Sensitivity CRP", "C-Reactive Protein (hs)", "CRP", "C-Reactive Protein"],
  il6:                     ["IL-6", "Interleukin-6", "Interleukin 6"],
  fibrinogen:              ["Fibrinogen", "Fibrinogen Activity"],
  homocysteine:            ["Homocysteine", "Total Homocysteine"],
  esr:                     ["ESR", "Erythrocyte Sedimentation Rate", "Sed Rate"],
  mpo:                     ["MPO", "Myeloperoxidase"],
  oxLdl:                   ["oxLDL", "Oxidized LDL"],
  tmao:                    ["TMAO", "Trimethylamine N-oxide"],
  vitaminD:                ["Vitamin D", "25-OH Vitamin D", "25-Hydroxyvitamin D", "Vitamin D, 25-OH", "25(OH)D"],
  vitaminB12:              ["Vitamin B12", "B12", "Cobalamin", "Cyanocobalamin"],
  vitaminB6:               ["Vitamin B6", "B6", "Pyridoxine"],
  folate:                  ["Folate", "Folic Acid", "Serum Folate", "Vitamin B9"],
  ferritin:                ["Ferritin", "Serum Ferritin"],
  iron:                    ["Iron", "Serum Iron", "Fe"],
  tibc:                    ["TIBC", "Total Iron Binding Capacity", "Iron Binding Capacity"],
  transferrinSaturation:   ["Transferrin Saturation", "Iron Saturation", "% Saturation"],
  magnesium:               ["Magnesium", "Mg", "Serum Magnesium"],
  zinc:                    ["Zinc", "Zn", "Serum Zinc"],
  copper:                  ["Copper", "Cu", "Serum Copper"],
  selenium:                ["Selenium", "Se"],
  omega3Index:             ["Omega-3 Index", "Omega 3 Index"],
  coq10:                   ["CoQ10", "Coenzyme Q10", "Ubiquinol", "CoQ-10"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an array of `biomarkers` table rows into a structured BloodPanel.
 * Matching is case-insensitive against MARKER_NAMES aliases.
 * The last (most recent) row wins if duplicate names appear.
 */
export function biomarkersToBloodPanel(rows: BiomarkerRow[]): BloodPanel {
  const byName = new Map<string, BiomarkerRow>();
  for (const row of rows) {
    byName.set(row.name.toLowerCase(), row);
  }

  const panel: BloodPanel = {};

  for (const [field, aliases] of Object.entries(MARKER_NAMES) as [keyof BloodPanel, string[]][]) {
    for (const alias of aliases) {
      const row = byName.get(alias.toLowerCase());
      if (row) {
        panel[field] = {
          value:        row.value,
          unit:         row.unit ?? "",
          status:       (row.status as BiomarkerStatus) ?? "normal",
          referenceMin: row.reference_min,
          referenceMax: row.reference_max,
          date:         row.date ?? null,
        };
        break;
      }
    }
  }

  return panel;
}

/**
 * Returns populated BloodPanel fields as formatted strings for AI prompts.
 * Includes functional medicine range where available.
 */
export function bloodPanelToLines(panel: BloodPanel): string[] {
  return (Object.entries(panel) as [keyof BloodPanel, BiomarkerValue][]).map(
    ([field, bv]) => {
      const canonicalName  = MARKER_NAMES[field]?.[0] ?? field;
      const labRef = bv.referenceMin != null && bv.referenceMax != null
        ? ` (lab ref ${bv.referenceMin}–${bv.referenceMax} ${bv.unit})`
        : "";
      const funcRange = FUNCTIONAL_MEDICINE_RANGES[field];
      const funcRef = funcRange
        ? ` [optimal: ${funcRange.min ?? "—"}–${funcRange.max ?? "—"} ${funcRange.unit}]`
        : "";
      return `${canonicalName}: ${bv.value} ${bv.unit}${labRef}${funcRef} → ${bv.status}`;
    },
  );
}
