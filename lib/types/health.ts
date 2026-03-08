/// lib/types/health.ts
import { z } from "zod";

// ============================================================
// NORMALIZED BIOMARKERS  (output of OCR + lab parser)
// ============================================================

export const BiomarkerStatusSchema = z.enum(["low", "normal", "high", "optimal", "critical"]);

export const NormalizedBiomarkersSchema = z.object({
  biomarkerId: z.string(),       // generated UUID
  name: z.string(),              // e.g. "Vitamin D", "TSH", "CRP"
  value: z.number(),
  unit: z.string(),
  referenceRange: z.object({
    low: z.number().nullable(),
    high: z.number().nullable(),
  }),
  status: BiomarkerStatusSchema,
  source: z.string(),            // 'lab' | 'blood_test' | 'dexa'
  date: z.string(),              // ISO date string YYYY-MM-DD
});

export type NormalizedBiomarkers = z.infer<typeof NormalizedBiomarkersSchema>;

// ============================================================
// NORMALIZED WEARABLE DATA  (daily snapshot from any device)
// ============================================================

export const NormalizedWearableDataSchema = z.object({
  hrv: z.number(),               // RMSSD in ms
  restingHR: z.number(),         // bpm
  sleepScore: z.number(),        // 0–100
  deepSleepMinutes: z.number(),
  remSleepMinutes: z.number(),
  recoveryScore: z.number(),     // 0–100
  strainScore: z.number(),       // 0–100 normalized (WHOOP raw is 0–21)
  readinessScore: z.number(),    // 0–100
  steps: z.number(),
  activeCalories: z.number(),
  date: z.string(),              // YYYY-MM-DD
  source: z.string(),            // 'whoop'|'oura'|'garmin'|'apple_health'
});

export type NormalizedWearableData = z.infer<typeof NormalizedWearableDataSchema>;

// ============================================================
// USER PROFILE  (from session + protocol settings)
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  chronologicalAge: number;
  targetAge: number;
  goals: string[];
  budget: "low" | "medium" | "high";
  preferences: {
    vegan?: boolean;
    caffeineFree?: boolean;
    noFishOil?: boolean;
    [key: string]: unknown;
  };
  plan: "free" | "pro" | "clinic";
}

// ============================================================
// PROTOCOL OUTPUT  (Claude's analysis result — new schema)
// ============================================================

export const RecommendationActionSchema = z.enum([
  "supplement",
  "lifestyle",
  "diagnostic",
  "nutrition",
]);

export const PillarStatusSchema = z.enum([
  "critical",
  "suboptimal",
  "good",
  "optimal",
]);

export const PillarRecommendationSchema = z.object({
  title: z.string(),
  explanation: z.string(),            // must cite specific biomarker/metric
  biomarkerLinks: z.array(z.string()), // e.g. ["HRV: 42ms (low)", "CRP: 3.2 mg/L (elevated)"]
  actionType: RecommendationActionSchema,
  priority: z.enum(["high", "medium", "low"]),
  productQuery: z.string().optional(), // iHerb/Amazon search query for supplements
});

export const ProtocolPillarSchema = z.object({
  name: z.string(),
  status: PillarStatusSchema,
  insight: z.string(),                // data-driven, cites specific metric
  recommendations: z.array(PillarRecommendationSchema),
});

export const ProtocolOutputSchema = z.object({
  summary: z.string(),               // 2–3 sentence personalized summary
  priorityScore: z.number().min(0).max(100),
  pillars: z.array(ProtocolPillarSchema),
});

export type PillarRecommendation = z.infer<typeof PillarRecommendationSchema>;
export type ProtocolPillar = z.infer<typeof ProtocolPillarSchema>;
export type ProtocolOutput = z.infer<typeof ProtocolOutputSchema>;

// ============================================================
// PRODUCT CATALOG  (iHerb / Amazon search result)
// ============================================================

export interface CatalogProduct {
  id: string;
  title: string;
  brand: string;
  price: string;          // formatted, e.g. "$24.99"
  imageUrl: string;
  affiliateUrl: string;
  source: "iherb" | "amazon";
}

// ============================================================
// INGEST API SHAPES
// ============================================================

export interface IngestResult {
  uploadId: string;
  normalizedBiomarkers: NormalizedBiomarkers[];
  normalizedWearable?: NormalizedWearableData;
  warnings: string[];
}

// ============================================================
// DATABASE ROW TYPES
// Each interface mirrors an actual Supabase table exactly.
// Column names match the SQL schema from migrations 001–018.
// ============================================================

// ── Auth (schema.sql + migration 004) ───────────────────────────────────────

export interface NextAuthUserRow {
  id:                       string;
  email:                    string;
  email_verified:           string | null;
  image:                    string | null;
  name:                     string | null;
  plan:                     "free" | "pro" | "clinic";
  plan_expires_at:          string | null;
  onboarding_goals:         string[] | null;       // migration 004
  onboarding_wearable_done: boolean | null;        // migration 004
  created_at:               string;
  updated_at:               string;
}

// ── schema.sql legacy tables ─────────────────────────────────────────────────

export interface UploadRow {
  id:           string;
  user_id:      string;
  file_name:    string;
  file_size:    number | null;
  mime_type:    string | null;
  storage_path: string;
  parse_status: "pending" | "processing" | "done" | "error";
  parsed_data:  unknown | null;
  warnings:     string[] | null;
  created_at:   string;
}

export interface HealthSnapshotRow {
  id:          string;
  user_id:     string;
  source:      string;
  raw_data:    unknown | null;
  parsed_data: unknown | null;
  created_at:  string;
}

export interface BiomarkerRow {
  id:            string;
  user_id:       string;
  upload_id:     string | null;
  name:          string;
  value:         number;
  unit:          string;
  reference_min: number | null;
  reference_max: number | null;
  status:        "normal" | "low" | "high" | "critical";
  source:        string;
  date:          string;
  created_at:    string;
}

export interface ProtocolRow {
  id:                     string;
  user_id:                string;
  selected_age:           number | null;
  goals:                  string[] | null;
  budget:                 string | null;
  preferences:            unknown | null;
  payload:                unknown | null;
  status:                 "processing" | "ready" | "failed" | null;   // migration 002
  mode:                   "personal" | "demo" | null;                   // migration 002
  version:                number | null;                                 // migration 002
  trigger_reason:         string | null;                                 // migration 002
  share_token:            string | null;                                 // migration 002
  share_token_expires_at: string | null;                                 // migration 002
  error_message:          string | null;                                 // migration 002
  created_at:             string;
  updated_at:             string | null;                                 // migration 002
}

export interface BookmarkRow {
  id:          string;
  user_id:     string;
  item_id:     string;
  category:    string;
  protocol_id: string | null;
  created_at:  string;
}

export interface CheckinResponseRow {
  id:          string;
  user_id:     string;
  week_number: number | null;
  responses:   unknown;
  created_at:  string;
}

// ── migration 001: Ingestion pipeline ────────────────────────────────────────

export interface RateLimitBucketRow {
  id:            string;
  user_id:       string;
  endpoint:      string;
  window_start:  string;
  request_count: number;
}

export interface HealthUploadRow {
  id:           string;
  user_id:      string;
  source:       string;           // pdf | whoop | oura | garmin | apple_health
  storage_path: string;
  parsed_data:  unknown | null;
  warnings:     string[] | null;
  status:       "pending" | "processing" | "done" | "error";
  created_at:   string;
}

export interface WearableSnapshotRow {
  id:                  string;
  user_id:             string;
  source:              string;
  date:                string;           // YYYY-MM-DD
  hrv:                 number | null;
  resting_hr:          number | null;
  sleep_score:         number | null;
  deep_sleep_min:      number | null;
  rem_sleep_min:       number | null;
  recovery_score:      number | null;
  strain_score:        number | null;
  readiness_score:     number | null;
  steps:               number | null;
  active_calories:     number | null;
  raw_data:            unknown | null;
  // migration 013: Terra wearable columns
  heart_rate_resting:  number | null;
  heart_rate_avg:      number | null;
  heart_rate_max:      number | null;
  hrv_rmssd:           number | null;
  sleep_total_minutes: number | null;
  sleep_rem_minutes:   number | null;
  sleep_deep_minutes:  number | null;
  sleep_light_minutes: number | null;
  vo2_max:             number | null;
  stress_score:        number | null;
  spo2:                number | null;
  raw_payload:         unknown | null;
  recorded_at:         string | null;
  created_at:          string;
}

export interface ProtocolOutputRow {
  id:             string;
  user_id:        string;
  model:          string;
  raw_response:   string | null;
  parsed_output:  unknown | null;
  priority_score: number | null;
  input_tokens:   number | null;
  output_tokens:  number | null;
  created_at:     string;
}

// ── migration 003: Wearable connections ──────────────────────────────────────

export interface WearableConnectionRow {
  id:               string;
  user_id:          string;
  provider:         string;
  provider_user_id: string | null;
  access_token:     string | null;
  refresh_token:    string | null;
  expires_at:       string | null;
  scope:            string | null;
  connected_at:     string;
  updated_at:       string;
}

// ── migration 005 + 006: Sports protocols ────────────────────────────────────

export interface SportsProtocolRow {
  id:                   string;
  user_id:              string;
  competition_type:     string;
  event_date:           string | null;
  weeks_to_event:       number | null;
  age:                  number;
  gender:               string;
  experience_level:     string | null;
  current_injuries:     string | null;
  known_conditions:     string[] | null;
  medications:          string | null;
  stimulant_tolerance:  string;
  budget_value:         number;
  budget_tier:          number;
  race_distance:        string | null;    // migration 006
  status:               "processing" | "ready" | "failed";
  payload:              unknown | null;
  error_message:        string | null;
  protocol_generated_at: string | null;
  created_at:           string;
  updated_at:           string;
}

// ── migration 007: Goal protocols ────────────────────────────────────────────

export interface GoalProtocolRow {
  id:                   string;
  user_id:              string;
  category:             string;
  age:                  number;
  gender:               string;
  known_conditions:     string[] | null;
  medications:          string | null;
  stimulant_tolerance:  string;
  budget_value:         number;
  budget_tier:          number;
  category_data:        unknown | null;
  status:               "processing" | "ready" | "failed";
  payload:              unknown | null;
  error_message:        string | null;
  protocol_generated_at: string | null;
  created_at:           string;
  updated_at:           string;
}

// ── migration 008: Supplement adoptions ──────────────────────────────────────

export interface UserSupplementAdoptionRow {
  id:              string;
  user_id:         string;
  supplement_name: string;
  protocol_type:   string;
  adopted_at:      string;
}

// ── migration 009 + 011 + 012 + 013 + 014 + 016 + 017 + 018: Profiles ───────

export interface ProfileRow {
  // migration 009
  id:                          string;   // PK + FK → nextauth_users(id)
  name:                        string | null;
  primary_goal:                string | null;
  onboarding_step:             string;
  created_at:                  string;
  updated_at:                  string;
  // migration 011
  avatar_url:                  string | null;
  tagline:                     string | null;
  location:                    string | null;
  prs:                         Record<string, unknown> | null;
  profile_nudge_dismissed:     boolean;
  // migration 012: biological age
  biological_age:              number | null;
  biological_age_delta:        number | null;
  bio_age_percentile:          number | null;
  bio_age_calculated_at:       string | null;
  bio_age_confidence:          string | null;
  bio_age_revealed:            boolean | null;
  bio_age_drivers:             unknown[] | null;
  // migration 013: Terra
  terra_user_id:               string | null;
  // migration 014: biomarker engine
  biological_sex:              "male" | "female" | "other" | null;
  height_cm:                   number | null;
  weight_kg:                   number | null;
  activity_level:              "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
  athlete_archetype:           "endurance" | "strength" | "team_sport" | "recreational" | null;
  health_goals:                string[] | null;
  current_medications:         string | null;
  current_supplements:         string | null;
  conditions:                  string[] | null;
  user_tier:                   "free" | "pro" | "clinic";
  // migration 016: freshness
  baseline_established_at:     string | null;
  last_wearable_upload_at:     string | null;
  // migration 017: secondary goal
  secondary_goal:              string | null;
  secondary_goal_set_at:       string | null;
  onboarding_completed_at:     string | null;
  // migration 018: v8 clinical
  protocol_gated_reason:       string | null;
  protocol_gated_at:           string | null;
  protocol_gate_acknowledged:  boolean;
  pregnancy_status:            "not_pregnant" | "trying_to_conceive" | "first_trimester" |
                               "second_trimester" | "third_trimester" | "postpartum_0_3mo" |
                               "postpartum_3_6mo" | "breastfeeding" | null;
  pregnancy_status_updated_at: string | null;
  auto_detected_training_phase: string | null;
  auto_phase_confidence:        number | null;
  auto_phase_computed_at:       string | null;
  auto_phase_override_until:    string | null;
}

// ─��� migration 010: Referral + training partners ───────────────────────────────

export interface ReferralLinkRow {
  id:          string;
  user_id:     string;
  code:        string;
  clicks:      number;
  conversions: number;
  created_at:  string;
}

export interface ReferralConversionRow {
  id:           string;
  referrer_id:  string;
  referee_id:   string;
  converted_at: string;
}

export interface TrainingPartnerRow {
  id:              string;
  user_id:         string;
  partner_user_id: string | null;
  invite_token:    string;
  partner_name:    string | null;
  partner_email:   string | null;
  status:          "pending" | "active" | "declined";
  created_at:      string;
  accepted_at:     string | null;
}

// ── migration 014 + 015: Analysis reports + API usage ────────────────────────

export interface AnalysisReportRow {
  id:             string;
  user_id:        string;
  report_type:    string;
  input_snapshot: unknown | null;
  payload:        unknown | null;
  model:          string | null;
  input_tokens:   number | null;
  output_tokens:  number | null;
  status:         "processing" | "ready" | "failed";
  error_message:  string | null;
  generated_at:   string | null;
  created_at:     string;
}

export interface ApiUsageRow {
  id:                    string;
  user_id:               string;
  endpoint:              string;
  report_id:             string | null;
  model:                 string;
  input_tokens:          number;
  output_tokens:         number;
  cost_usd:              number | null;    // generated column
  duration_ms:           number | null;
  // migration 015: per-stage detail
  stage_2_input_tokens:  number | null;
  stage_2_output_tokens: number | null;
  stage_3_input_tokens:  number | null;
  stage_3_output_tokens: number | null;
  depth_level:           string | null;
  data_completeness:     number | null;
  created_at:            string;
}

// ── migration 016: Wearable upload events ────────────────────────────────────

export interface WearableUploadEventRow {
  id:              string;
  user_id:         string;
  device_type:     "apple_health" | "samsung_health";
  scenario:        "onboarding_baseline" | "quarterly_refresh" | "user_triggered_event";
  trigger_reason:  string | null;
  is_first_upload: boolean;
  uploaded_at:     string;
}

// ── migration 018: Consent & Research ────────────────────────────────────────

export interface ConsentRecordRow {
  id:                   string;
  user_id:              string;
  tier1_service:        boolean;
  tier2_research:       boolean;
  tier2_research_types: string[];
  tier3_commercial:     boolean;
  tier3_partners:       Array<{ partnerId: string; partnerName: string; consentedAt: string }>;
  consent_version:      string;
  policy_version:       string;
  terms_version:        string;
  consent_method:       string;
  ip_address:           string | null;
  user_agent:           string | null;
  is_current:           boolean;
  created_at:           string;
}

export interface ConsentAuditLogRow {
  id:             string;
  user_id:        string | null;
  consent_id:     string | null;
  action:         string | null;
  event_type:     string | null;
  triggered_by:   string | null;
  previous_state: unknown | null;
  new_state:      unknown | null;
  changed_by:     string | null;
  created_at:     string;
}

export interface ConsentVersionHistoryRow {
  id:                 string;
  policy_version:     string;
  terms_version:      string;
  consent_version:    string;
  summary_of_changes: string | null;
  effective_at:       string;
  created_at:         string;
}

export interface ResearchCohortRow {
  id:             string;
  name:           string;
  description:    string | null;
  criteria:       Record<string, unknown>;
  irb_status:     string | null;
  is_active:      boolean;
  enrolled_users: number;
  created_at:     string;
  updated_at:     string;
}

export interface CohortEnrollmentRow {
  id:          string;
  cohort_id:   string;
  user_id:     string;
  status:      "active" | "withdrawn" | "excluded";
  enrolled_at: string;
  updated_at:  string;
}

export interface DeidentifiedBiomarkerResearchRow {
  id:               string;
  user_id:          string;
  cohort_id:        string | null;
  age_bucket:       string | null;
  biological_sex:   string | null;
  biomarker_name:   string;
  value_numeric:    number | null;
  unit:             string | null;
  biomarker_status: string | null;
  data_month:       string | null;
  source:           string | null;
  created_at:       string;
}

// ============================================================
// v8 SCHEMA TYPES
// ============================================================

// ── Section A — Critical Value Detection ─────────────────────────────────────

export interface CriticalValueThreshold {
  id:                      string;
  marker_name:             string;
  critical_high:           number | null;
  critical_low:            number | null;
  critical_high_condition: string | null;
  critical_low_condition:  string | null;
  immediate_action_text:   string;
  practitioner_alert_text: string | null;
  unit:                    string;
  source:                  string | null;
  // migration 020: athlete-specific thresholds
  athlete_critical_low:    number | null;
  athlete_optimal_low:     number | null;
  athlete_optimal_high:    number | null;
  athlete_critical_high:   number | null;
  sex_adjusted:            boolean | null;
  athlete_note:            string | null;
}

export interface CriticalValueEvent {
  id:                   string;
  user_id:              string;
  marker_name:          string;
  observed_value:       number;
  threshold_triggered:  "critical_high" | "critical_low";
  threshold_value:      number;
  biomarker_result_id:  string | null;
  alerted_at:           string;
  user_acknowledged_at: string | null;
  practitioner_alerted: boolean;
  protocol_gated:       boolean;
  resolved_at:          string | null;
  notes:                string | null;
}

// ── Section B — Pregnancy Safety Mode ────────────────────────────────────────

export type PregnancyStatus =
  | "not_pregnant"
  | "trying_to_conceive"
  | "first_trimester"
  | "second_trimester"
  | "third_trimester"
  | "postpartum_0_3mo"
  | "postpartum_3_6mo"
  | "breastfeeding";

export type RuleType = "hard_block" | "dose_limit" | "require_md_approval" | "monitor";
export type EvidenceLevel = "established" | "probable" | "limited" | "theoretical";

export interface PregnancySafetyRule {
  id:                   string;
  product_category:     string;
  applicable_statuses:  PregnancyStatus[];
  rule_type:            RuleType;
  dose_limit_mg:        number | null;
  block_reason:         string;
  user_facing_message:  string;
  clinical_note:        string | null;
  evidence_level:       EvidenceLevel;
  trimester_specific:   boolean;
  source:               string | null;
  reviewed_by:          string | null;
  is_active:            boolean;
  // migration 021: MD-audited dose thresholds
  max_dose_value:       number | null;
  max_dose_unit:        string | null;
  recommended_dose:     number | null;
  trimester_dose_varies: boolean | null;
  athlete_note:         string | null;
}

// ── Section C — Inter-Nutrient Competition ────────────────────────────────────

export type CompetitionType =
  | "transporter_competition"
  | "binding_inhibition"
  | "metabolic_depletion"
  | "receptor_competition";

export interface NutrientCompetitionRule {
  id:                         string;
  nutrient_a:                 string;
  nutrient_b:                 string;
  competition_type:           CompetitionType | null;
  competition_threshold_a_mg: number | null;
  competition_threshold_b_mg: number | null;
  absorption_impact_pct:      number | null;
  affected_nutrient:          string;
  mitigation_strategy:        string;
  clinical_note:              string | null;
  source:                     string | null;
  is_active:                  boolean;
}

// ── Section D — Adverse Event Reporting ──────────────────────────────────────

export type AdverseEventSeverity = "mild" | "moderate" | "significant";

export type AdverseEventAction =
  | "nothing"
  | "reduced_dose"
  | "stopped_product"
  | "saw_doctor"
  | "switched_form";

export interface AdverseEventReport {
  id:                   string;
  user_id:              string;
  product_id:           string | null;
  protocol_snapshot_id: string | null;
  event_type:           string[];
  severity:             AdverseEventSeverity;
  onset_days:           number | null;
  duration_days:        number | null;
  notes:                string | null;
  action_taken:         AdverseEventAction;
  reported_at:          string;
  resolved_at:          string | null;
  reviewed_by_rd:       boolean;
  rd_notes:             string | null;
}

export interface AdverseEventAggregate {
  id:                           string;
  product_id:                   string;
  total_reports:                number;
  reports_last_90d:             number;
  significant_reports_last_90d: number;
  top_event_types:              Record<string, number> | null;
  adverse_rate_pct:             number | null;
  dose_review_flagged:          boolean;
  flagged_at:                   string | null;
  last_computed_at:             string;
}

export interface AdverseEventPrompt {
  id:             string;
  user_id:        string;
  product_id:     string | null;
  prompt_trigger: string;
  prompted_at:    string;
  responded_at:   string | null;
  response:       string | null;
}

// ── Section E — Personal Biomarker Baselines ─────────────────────────────────

export interface PersonalBiomarkerBaseline {
  user_id:               string;
  marker_name:           string;
  personal_mean:         number;
  personal_std_dev:      number | null;
  personal_optimal_low:  number | null;
  personal_optimal_high: number | null;
  data_points:           number;
  confidence:            number;  // 0.0–1.0; tiers: 1pt=0.0, 2=0.3, 3=0.6, 4=0.75, 5+=0.9
  first_sample_date:     string | null;
  last_sample_date:      string | null;
  last_computed_at:      string;
}

export interface PersonalBaselineHistoryRow {
  id:                  string;
  user_id:             string;
  marker_name:         string;
  value_at:            number;
  measured_date:       string;
  biomarker_result_id: string | null;
  created_at:          string;
}

// ── Section F — Predictive Training Phase ────────────────────────────────────

export interface TrainingPhaseDetection {
  id:                string;
  user_id:           string;
  detected_phase:    string;
  confidence:        number;
  detection_signals: Record<string, unknown> | null;
  detected_at:       string;
  user_confirmed:    boolean | null;
}

// ── Section G — Protocol PDF Export ──────────────────────────────────────────

export type PdfExportType = "doctor_visit" | "specialist" | "full_clinical" | "summary";

export interface ProtocolPdfExport {
  id:                         string;
  user_id:                    string;
  snapshot_id:                string | null;
  pdf_url:                    string | null;
  export_type:                PdfExportType;
  include_biomarkers:         boolean;
  include_drug_interactions:  boolean;
  include_practitioner_notes: boolean;
  include_evidence_grades:    boolean;
  generated_at:               string;
  expires_at:                 string | null;
  download_count:             number;
}

// ── Section H — Longitudinal Outcome Arc ─────────────────────────────────────

export type MilestoneType =
  | "biomarker_normalized"
  | "biomarker_improved"
  | "biological_age_improved"
  | "adherence_streak"
  | "race_pr"
  | "protocol_milestone"
  | "deficiency_cleared";

export interface OutcomeMilestone {
  id:                           string;
  user_id:                      string;
  milestone_type:               MilestoneType;
  milestone_value:              string | null;
  previous_value:               string | null;
  marker_name:                  string | null;
  products_active_at_milestone: string[];
  achieved_at:                  string;
  narrative_text:               string | null;
  is_shared:                    boolean;
}

export interface OutcomeSummary {
  user_id:               string;
  period_start:          string;
  period_end:            string;
  total_adherence_days:  number;
  longest_streak_days:   number;
  biomarkers_normalized: number;
  bio_age_change_years:  number | null;
  readiness_avg_start:   number | null;
  readiness_avg_end:     number | null;
  top_milestones:        unknown | null;
  summary_narrative:     string | null;
  computed_at:           string;
}

// ============================================================
// RECOMMENDATION ENGINE ROW TYPES  (migration 018)
// ============================================================

// ── health_products: supplement catalog ───────────────────────────────────

export interface HealthProductRow {
  id:                             string;
  name:                           string;
  category:                       string;
  subcategory:                    string | null;
  description:                    string | null;
  brand:                          string | null;
  form_name:                      string | null;
  dose_per_serving_mg:            number | null;
  serving_unit:                   string | null;
  standard_serving_count:         number | null;
  price_usd:                      number | null;
  affiliate_url:                  string | null;
  affiliate_platform:             string | null;
  evidence_grade:                 string | null;          // "A" | "B" | "C" | "D"
  drug_interactions:              string[];
  primary_nutrients:              Record<string, unknown>;
  has_cycling_requirement:        boolean;
  cycling_on_weeks:               number | null;
  cycling_off_weeks:              number | null;
  post_workout_adaptation_risk:   boolean;
  post_workout_risk_threshold_mg: number | null;
  requires_rd_review:             boolean;
  is_active:                      boolean;
  created_at:                     string;
}

// ── user_health_context: central per-user configuration ───────────────────

export interface UserHealthContextRow {
  id:                          string;
  user_id:                     string;
  training_phase:              string | null;
  training_phase_updated_at:   string | null;
  athlete_archetype:           string | null;
  sport:                       string | null;
  budget_monthly_usd:          number | null;
  timezone:                    string | null;
  biological_sex:              string | null;
  hormonal_status:             string | null;
  cycle_tracking_enabled:      boolean;
  average_cycle_length_days:   number | null;
  pregnancy_status:            string | null;
  pregnancy_status_updated_at: string | null;
  chronotype:                  string | null;
  ramp_started_at:             string | null;
  ramp_current_week:           number | null;
  ramp_completed:              boolean;
  in_travel_mode:              boolean;
  travel_destination_timezone: string | null;
  travel_origin_timezone:      string | null;
  travel_mode_ends_at:         string | null;
  protocol_gated_reason:       string | null;
  protocol_gated_at:           string | null;
  protocol_gate_acknowledged:  boolean;
  medication_last_updated:     string | null;
  auto_detected_training_phase: string | null;
  auto_phase_confidence:       number | null;
  auto_phase_computed_at:      string | null;
  created_at:                  string;
  updated_at:                  string;
}

// ── dosing_rules: dose per product × biomarker × severity ─────────────────

export interface DosingRuleRow {
  id:                      string;
  product_id:              string;
  target_marker:           string;
  severity:                string;
  recommended_dose_mg:     number;
  dose_unit:               string;
  timing_slot:             string | null;
  timing_notes:            string | null;
  slot_category:           string | null;
  max_daily_dose_mg:       number | null;
  quick_effect_weeks:      number | null;
  meaningful_effect_weeks: number | null;
  full_effect_weeks:       number | null;
  what_to_expect:          string | null;
  early_indicators:        string[];
  created_at:              string;
}

// ── protocol_snapshots: versioned recommendation outputs ──────────────────

export interface ProtocolSnapshotRow {
  id:                      string;
  user_id:                 string;
  product_ids:             string[];
  slot_assignments:        Record<string, unknown>;
  daily_schedule:          Record<string, unknown>;
  total_monthly_cost_usd:  number | null;
  biological_age_score:    number | null;
  morning_readiness_score: number | null;
  generated_at:            string;
  trigger_reason:          string | null;
  engine_version:          string | null;
  is_active:               boolean;
}

// ── product_performance_signals: adaptive learning weights ────────────────

export interface ProductPerformanceSignalRow {
  id:                    string;
  user_id:               string;
  product_id:            string;
  ctr_modifier:          number;
  adherence_modifier:    number;
  outcome_modifier:      number;
  adverse_event_penalty: number;
  requires_rd_review:    boolean;
  last_updated:          string;
}

// ── supplement_adherence_log: daily check-in per product ──────────────────

export interface SupplementAdherenceLogRow {
  id:            string;
  user_id:       string;
  product_id:    string;
  snapshot_id:   string | null;
  taken_at:      string;
  taken:         boolean;
  dose_taken_mg: number | null;
  notes:         string | null;
  created_at:    string;
}

// ── notification_log: push notifications sent ─────────────────────────────

export interface NotificationLogRow {
  id:                 string;
  user_id:            string;
  trigger_type:       string;
  payload:            Record<string, unknown>;
  sent_at:            string;
  suppression_reason: string | null;
  urgency:            number;
}

// ── practitioner_access: connected RDs and practitioners ──────────────────

export interface PractitionerAccessRow {
  id:                 string;
  user_id:            string;
  practitioner_email: string;
  practitioner_name:  string | null;
  access_level:       "read" | "comment" | "full";
  connected_at:       string;
  is_active:          boolean;
}

// ============================================================
// V7 FEATURE ROW TYPES  (migration 019)
// ============================================================

// ── product_forms: supplement delivery forms + bioavailability ─────────────

export interface ProductFormRow {
  id:                   string;
  form_name:            string;
  category:             string;
  bioavailability_rank: number | null;
  absorption_notes:     string | null;
  recommended_with:     string | null;
  is_active:            boolean;
}

// ── user_medications: current and historical medications ──────────────────

export interface UserMedicationRow {
  id:                    string;
  user_id:               string;
  medication_name:       string;
  dose_mg:               number | null;
  frequency:             string | null;
  started_at:            string | null;
  ended_at:              string | null;
  prescribing_condition: string | null;
  is_current:            boolean;
  created_at:            string;
  updated_at:            string;
}

// ── drug_interaction_rules: supplement × drug interaction reference ────────

export interface DrugInteractionRuleRow {
  id:                      string;
  supplement_name:         string;
  drug_name:               string;
  interaction_severity:    "mild" | "moderate" | "severe" | "contraindicated" | "beneficial";
  interaction_type:        string | null;
  mechanism:               string | null;
  clinical_note:           string | null;
  recommendation:          string | null;
  timing_separation_hours: number | null;
  source:                  string | null;
  is_active:               boolean;
}

// ── menstrual_cycle_tracking: logged cycle data per user ──────────────────

export interface MenstrualCycleTrackingRow {
  id:                       string;
  user_id:                  string;
  cycle_start_date:         string;
  cycle_length_days:        number | null;
  period_length_days:       number | null;
  luteal_phase_length_days: number | null;
  symptoms:                 Record<string, unknown>;
  notes:                    string | null;
  created_at:               string;
}

// ── cycle_phase_modifiers: supplement adjustments by menstrual phase ────────

export interface CyclePhaseModifierRow {
  id:                     string;
  cycle_phase:            "menstrual" | "follicular" | "ovulatory" | "luteal";
  supplement_category:    string;
  modifier_type:          "increase" | "decrease" | "add" | "remove" | "maintain";
  modifier_reason:        string;
  recommended_adjustment: string | null;
  is_active:              boolean;
}

// ── notification_preferences: per-user notification settings ─────────────

export interface NotificationPreferencesRow {
  id:                             string;
  user_id:                        string;
  morning_reminder_enabled:       boolean;
  morning_reminder_time:          string;
  evening_reminder_enabled:       boolean;
  evening_reminder_time:          string;
  low_supply_alert_enabled:       boolean;
  low_supply_threshold_days:      number;
  new_research_enabled:           boolean;
  adverse_event_followup_enabled: boolean;
  weekly_summary_enabled:         boolean;
  push_notifications_enabled:     boolean;
  email_notifications_enabled:    boolean;
  created_at:                     string;
  updated_at:                     string;
}

// ── protocol_ramp_plans: gradual dose introduction plans ─────────────────

export interface ProtocolRampPlanRow {
  id:           string;
  user_id:      string;
  snapshot_id:  string | null;
  total_weeks:  number;
  current_week: number;
  started_at:   string | null;
  completed_at: string | null;
  is_active:    boolean;
  created_at:   string;
}

// ── protocol_ramp_steps: per-product weekly dose fractions ────────────────

export interface ProtocolRampStepRow {
  id:             string;
  ramp_plan_id:   string;
  product_id:     string;
  week_number:    number;
  dose_fraction:  number;
  actual_dose_mg: number | null;
  rationale:      string | null;
  completed:      boolean;
  created_at:     string;
}

// ── supplement_cycles: on/off cycling schedules per user × product ─────────

export interface SupplementCycleRow {
  id:               string;
  user_id:          string;
  product_id:       string;
  cycle_start_date: string;
  on_weeks:         number;
  off_weeks:        number;
  current_phase:    "on" | "off";
  phase_started_at: string;
  next_phase_at:    string;
  is_active:        boolean;
  created_at:       string;
}

// ── cumulative_dose_safety: fat-soluble / accumulating supplement risk ──────

export interface CumulativeDoseSafetyRow {
  id:                   string;
  product_id:           string;
  marker_name:          string;
  accumulation_type:    "fat_soluble" | "water_soluble" | "mineral" | "herbal";
  half_life_days:       number | null;
  toxicity_onset_weeks: number | null;
  washout_weeks:        number | null;
  early_toxicity_signs: string[];
  is_active:            boolean;
}

// ── nutrient_upper_limits: tolerable upper intake levels ──────────────────

export interface NutrientUpperLimitRow {
  id:            string;
  nutrient_name: string;
  ul_mg:         number;
  ul_unit:       string;
  population:    string;
  rationale:     string | null;
  source:        string | null;
  is_active:     boolean;
}

// ── user_supply_tracking: days-of-supply per product per user ─────────────

export interface UserSupplyTrackingRow {
  id:                       string;
  user_id:                  string;
  product_id:               string;
  units_remaining:          number;
  servings_per_unit:        number;
  servings_remaining:       number;
  daily_servings:           number;
  estimated_days_remaining: number | null;
  last_restocked_at:        string | null;
  next_restock_reminder_at: string | null;
  created_at:               string;
  updated_at:               string;
}

// ── symptom_reports: user-reported symptoms ──────────────────────────────

export interface SymptomReportRow {
  id:                string;
  user_id:           string;
  reported_at:       string;
  symptoms:          string[];
  severity:          number | null;
  notes:             string | null;
  suspected_trigger: string | null;
  created_at:        string;
}

// ── symptom_marker_map: symptoms → likely biomarker signals ───────────────

export interface SymptomMarkerMapRow {
  id:             string;
  symptom:        string;
  likely_markers: string[];
  direction:      "low" | "high" | "either";
  priority:       number;
  notes:          string | null;
  is_active:      boolean;
}

// ── protocol_simulations: user-generated what-if stacks ──────────────────

export interface ProtocolSimulationRow {
  id:                     string;
  user_id:                string;
  simulated_products:     unknown[];
  total_monthly_cost_usd: number | null;
  interaction_warnings:   unknown[];
  upper_limit_warnings:   unknown[];
  timing_conflicts:       unknown[];
  created_at:             string;
}

// ── protocol_share_cards: shareable protocol links ────────────────────────

export interface ProtocolShareCardRow {
  id:                 string;
  user_id:            string;
  snapshot_id:        string | null;
  share_token:        string;
  card_type:          "public" | "practitioner";
  expires_at:         string | null;
  view_count:         number;
  include_biomarkers: boolean;
  include_cost:       boolean;
  created_at:         string;
}

// ── chronotype_timing_offsets: wall-clock times per chronotype × slot ──────

export interface ChronotypeTimingOffsetRow {
  id:                           string;
  chronotype:                   "morning" | "intermediate" | "evening";
  timing_slot:                  string;
  clock_time:                   string;
  offset_from_standard_minutes: number;
  notes:                        string | null;
  is_active:                    boolean;
}

// ── user_protocol_timelines: audit trail of protocol events ──────────────

export interface UserProtocolTimelineRow {
  id:          string;
  user_id:     string;
  event_type:  string;
  event_data:  Record<string, unknown>;
  snapshot_id: string | null;
  product_id:  string | null;
  occurred_at: string;
  created_at:  string;
}

// ── travel_events: logged travel for supplement timing adjustment ──────────

export interface TravelEventRow {
  id:                   string;
  user_id:              string;
  destination_timezone: string;
  origin_timezone:      string;
  departure_date:       string;
  return_date:          string | null;
  flight_direction:     "eastward" | "westward" | "na" | null;
  adjustment_strategy:  string | null;
  is_active:            boolean;
  created_at:           string;
}
