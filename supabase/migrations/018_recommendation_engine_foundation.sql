-- ============================================================
-- Migration 018: Supplement Recommendation Engine Foundation
-- ============================================================
-- All FKs reference nextauth_users(id) — never auth.users(id).
-- All statements use IF NOT EXISTS — safe to re-run.
-- Run in Supabase SQL Editor after migrations 001–017.
-- ============================================================

-- ── health_products: supplement catalog ────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_products (
  id                              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                            TEXT        NOT NULL,
  category                        TEXT        NOT NULL,
  subcategory                     TEXT,
  description                     TEXT,
  brand                           TEXT,
  form_name                       TEXT,                          -- e.g. "capsule", "powder", "softgel"
  dose_per_serving_mg             NUMERIC,
  serving_unit                    TEXT,                          -- e.g. "capsule", "scoop", "tablet"
  standard_serving_count          INTEGER,
  price_usd                       NUMERIC(8,2),
  affiliate_url                   TEXT,
  affiliate_platform              TEXT,                          -- e.g. "iherb", "amazon"
  evidence_grade                  TEXT,                          -- A | B | C | D
  drug_interactions               TEXT[]      NOT NULL DEFAULT '{}',
  primary_nutrients               JSONB       NOT NULL DEFAULT '{}',
  has_cycling_requirement         BOOLEAN     NOT NULL DEFAULT false,
  cycling_on_weeks                INTEGER,
  cycling_off_weeks               INTEGER,
  post_workout_adaptation_risk    BOOLEAN     NOT NULL DEFAULT false,
  post_workout_risk_threshold_mg  NUMERIC,
  requires_rd_review              BOOLEAN     NOT NULL DEFAULT false,
  is_active                       BOOLEAN     NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_products_category_idx
  ON health_products(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS health_products_evidence_grade_idx
  ON health_products(evidence_grade);

-- ── user_health_context: central per-user configuration ───────────────────

CREATE TABLE IF NOT EXISTS user_health_context (
  id                              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                         UUID        NOT NULL UNIQUE REFERENCES nextauth_users(id) ON DELETE CASCADE,
  training_phase                  TEXT,
  training_phase_updated_at       TIMESTAMPTZ,
  athlete_archetype               TEXT,
  sport                           TEXT,
  budget_monthly_usd              NUMERIC(8,2),
  timezone                        TEXT,
  biological_sex                  TEXT,
  hormonal_status                 TEXT,
  cycle_tracking_enabled          BOOLEAN     NOT NULL DEFAULT false,
  average_cycle_length_days       INTEGER,
  pregnancy_status                TEXT,
  pregnancy_status_updated_at     TIMESTAMPTZ,
  chronotype                      TEXT,                          -- morning | evening | intermediate
  ramp_started_at                 TIMESTAMPTZ,
  ramp_current_week               INTEGER,
  ramp_completed                  BOOLEAN     NOT NULL DEFAULT false,
  in_travel_mode                  BOOLEAN     NOT NULL DEFAULT false,
  travel_destination_timezone     TEXT,
  travel_origin_timezone          TEXT,
  travel_mode_ends_at             TIMESTAMPTZ,
  protocol_gated_reason           TEXT,
  protocol_gated_at               TIMESTAMPTZ,
  protocol_gate_acknowledged      BOOLEAN     NOT NULL DEFAULT false,
  medication_last_updated         TIMESTAMPTZ,
  auto_detected_training_phase    TEXT,
  auto_phase_confidence           NUMERIC(4,3),
  auto_phase_computed_at          TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);

-- ── dosing_rules: dose recommendations per product × biomarker × severity ─

CREATE TABLE IF NOT EXISTS dosing_rules (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id            UUID        NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  target_marker         TEXT        NOT NULL,
  severity              TEXT        NOT NULL,                    -- low | high | critical | suboptimal
  recommended_dose_mg   NUMERIC     NOT NULL,
  dose_unit             TEXT        NOT NULL DEFAULT 'mg',
  timing_slot           TEXT,                                    -- morning | afternoon | evening | with_meal | pre_workout
  timing_notes          TEXT,
  slot_category         TEXT,                                    -- supplement | food | activity
  max_daily_dose_mg     NUMERIC,
  quick_effect_weeks    INTEGER,
  meaningful_effect_weeks INTEGER,
  full_effect_weeks     INTEGER,
  what_to_expect        TEXT,
  early_indicators      TEXT[]      NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dosing_rules_product_id_idx
  ON dosing_rules(product_id);
CREATE INDEX IF NOT EXISTS dosing_rules_target_marker_idx
  ON dosing_rules(target_marker, severity);

-- ── protocol_snapshots: versioned recommendation outputs ──────────────────

CREATE TABLE IF NOT EXISTS protocol_snapshots (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_ids             UUID[]      NOT NULL DEFAULT '{}',
  slot_assignments        JSONB       NOT NULL DEFAULT '{}',
  daily_schedule          JSONB       NOT NULL DEFAULT '{}',
  total_monthly_cost_usd  NUMERIC(8,2),
  biological_age_score    NUMERIC(4,1),
  morning_readiness_score NUMERIC(5,2),
  generated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_reason          TEXT,
  engine_version          TEXT,
  is_active               BOOLEAN     NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS protocol_snapshots_user_id_idx
  ON protocol_snapshots(user_id);
CREATE INDEX IF NOT EXISTS protocol_snapshots_active_idx
  ON protocol_snapshots(user_id) WHERE is_active = true;

-- ── product_performance_signals: adaptive per-user × product weights ───────

CREATE TABLE IF NOT EXISTS product_performance_signals (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id            UUID        NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  ctr_modifier          NUMERIC(5,3) NOT NULL DEFAULT 1.0,
  adherence_modifier    NUMERIC(5,3) NOT NULL DEFAULT 1.0,
  outcome_modifier      NUMERIC(5,3) NOT NULL DEFAULT 1.0,
  adverse_event_penalty NUMERIC(5,3) NOT NULL DEFAULT 0.0,
  requires_rd_review    BOOLEAN     NOT NULL DEFAULT false,
  last_updated          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS product_performance_signals_user_id_idx
  ON product_performance_signals(user_id);

-- ── supplement_adherence_log: daily check-in per product ─────────────────

CREATE TABLE IF NOT EXISTS supplement_adherence_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id    UUID        NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  snapshot_id   UUID        REFERENCES protocol_snapshots(id) ON DELETE SET NULL,
  taken_at      TIMESTAMPTZ NOT NULL,
  taken         BOOLEAN     NOT NULL,
  dose_taken_mg NUMERIC,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplement_adherence_log_user_id_idx
  ON supplement_adherence_log(user_id);
CREATE INDEX IF NOT EXISTS supplement_adherence_log_user_date_idx
  ON supplement_adherence_log(user_id, taken_at);

-- ── notification_log: all push notifications sent ─────────────────────────

CREATE TABLE IF NOT EXISTS notification_log (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  trigger_type       TEXT        NOT NULL,
  payload            JSONB       NOT NULL DEFAULT '{}',
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  suppression_reason TEXT,
  urgency            INTEGER     NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS notification_log_user_id_idx
  ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS notification_log_sent_at_idx
  ON notification_log(sent_at);

-- ── practitioner_access: connected RDs and practitioners ──────────────────

CREATE TABLE IF NOT EXISTS practitioner_access (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  practitioner_email  TEXT        NOT NULL,
  practitioner_name   TEXT,
  access_level        TEXT        NOT NULL DEFAULT 'read'
                        CHECK (access_level IN ('read', 'comment', 'full')),
  connected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  UNIQUE (user_id, practitioner_email)
);
CREATE INDEX IF NOT EXISTS practitioner_access_user_id_idx
  ON practitioner_access(user_id) WHERE is_active = true;
