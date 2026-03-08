-- ============================================================
-- Migration 019: V7 + V8 Feature Tables
-- ============================================================
-- Builds on migration 018 (recommendation engine foundation).
-- All FKs reference nextauth_users(id) — never auth.users(id).
-- All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Safe to run even if individual tables were partially created.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- SECTION 1: V7 FEATURE TABLES
-- ═══════════════════════════════════════════════════════════

-- ── product_forms: supplement delivery forms + bioavailability ─────────────
-- Created before health_products ALTER so product_form_id FK resolves.

CREATE TABLE IF NOT EXISTS product_forms (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  form_name            TEXT    NOT NULL UNIQUE,
  category             TEXT    NOT NULL,
  bioavailability_rank INTEGER,                           -- 1 = best in category
  absorption_notes     TEXT,
  recommended_with     TEXT,                              -- food | fat | empty_stomach | water
  is_active            BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO product_forms (form_name, category, bioavailability_rank, absorption_notes, recommended_with)
VALUES
  ('iron_bisglycinate',       'iron',   1,
   'Chelated amino-acid form with minimal GI side effects. Absorption not food-dependent.',
   'food'),
  ('ferrous_sulfate',         'iron',   3,
   'Classic iron salt. Highly effective but can cause nausea, constipation. GI effects are dose-dependent.',
   'empty_stomach'),
  ('magnesium_glycinate',     'magnesium', 1,
   'Amino-acid chelate. Highest bioavailability, calming effect, minimal laxative effect.',
   'food'),
  ('magnesium_oxide',         'magnesium', 4,
   'Poorly absorbed (~4%). Used mainly for constipation relief, not magnesium repletion.',
   'food'),
  ('methylcobalamin',         'b12',    1,
   'Active, bioidentical methyl form. No conversion required. Preferred for MTHFR variants.',
   'sublingual'),
  ('cyanocobalamin',          'b12',    2,
   'Synthetic form requiring conversion to active methylcobalamin. Cost-effective and stable.',
   'food'),
  ('zinc_bisglycinate',       'zinc',   1,
   'Amino-acid chelate. Higher absorption and lower GI upset than zinc sulfate or oxide.',
   'food'),
  ('omega3_triglyceride_form','omega3', 1,
   'Natural triglyceride (rTG) form. 70% higher bioavailability than ethyl ester form.',
   'fat')
ON CONFLICT (form_name) DO NOTHING;

-- ── user_medications: current and historical medications ──────────────────

CREATE TABLE IF NOT EXISTS user_medications (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  medication_name       TEXT        NOT NULL,
  dose_mg               NUMERIC,
  frequency             TEXT,                             -- daily | twice_daily | as_needed | weekly
  started_at            DATE,
  ended_at              DATE,
  prescribing_condition TEXT,
  is_current            BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_medications_user_id_idx
  ON user_medications(user_id) WHERE is_current = true;

-- ── drug_interaction_rules: supplement × drug interaction reference data ───

CREATE TABLE IF NOT EXISTS drug_interaction_rules (
  id                       UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_name          TEXT    NOT NULL,
  drug_name                TEXT    NOT NULL,
  interaction_severity     TEXT    NOT NULL
                             CHECK (interaction_severity IN ('mild','moderate','severe','contraindicated','beneficial')),
  interaction_type         TEXT,                          -- absorption | metabolism | additive | antagonist | depletion
  mechanism                TEXT,
  clinical_note            TEXT,
  recommendation           TEXT,
  timing_separation_hours  INTEGER,
  source                   TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (supplement_name, drug_name)
);
CREATE INDEX IF NOT EXISTS drug_interaction_supplement_idx
  ON drug_interaction_rules(supplement_name) WHERE is_active = true;

INSERT INTO drug_interaction_rules
  (supplement_name, drug_name, interaction_severity, interaction_type, mechanism, clinical_note, recommendation, timing_separation_hours, source)
VALUES
  ('omega3', 'warfarin',
   'moderate', 'additive',
   'EPA and DHA inhibit platelet aggregation and may increase anticoagulant effect of warfarin.',
   'Clinical significance is low at <3g/day EPA+DHA, but INR should be monitored at initiation.',
   'Monitor INR at baseline and 4 weeks after starting. Inform prescriber.',
   NULL, 'EFSA 2012; Buckley 2004'),

  ('iron', 'tetracycline',
   'severe', 'absorption',
   'Iron chelates tetracycline antibiotics, reducing antibiotic serum concentration by up to 50%.',
   'Clinically significant. Can lead to treatment failure of the antibiotic.',
   'Take iron at least 2 hours before or 3 hours after tetracycline.',
   3, 'Neuvonen 1970; BNF'),

  ('st_johns_wort', 'ssri_class',
   'contraindicated', 'additive',
   'Both St. John''s Wort and SSRIs increase serotonergic activity. Combined use can cause serotonin syndrome.',
   'Serotonin syndrome can be life-threatening. Do not use concurrently.',
   'Do not combine. Discontinue St. John''s Wort if starting SSRI therapy.',
   NULL, 'Breckenridge 2002; FDA Safety Communication'),

  ('calcium', 'levothyroxine',
   'moderate', 'absorption',
   'Calcium binds to levothyroxine in the GI tract, reducing thyroid hormone absorption.',
   'Significant effect even at normal dietary calcium levels. Requires timing separation.',
   'Take levothyroxine at least 4 hours away from calcium supplements.',
   4, 'Singh 2001; ATA Guidelines'),

  ('iron', 'levothyroxine',
   'moderate', 'absorption',
   'Iron forms an insoluble complex with levothyroxine, reducing its bioavailability.',
   'Well-documented interaction — one of the most common causes of inadequate TSH control.',
   'Take levothyroxine at least 4 hours away from iron supplements.',
   4, 'Campbell 1992; Endocrine Society Guidelines'),

  ('vitamin_b12', 'metformin',
   'moderate', 'depletion',
   'Metformin reduces ileal absorption of B12 by competing with intrinsic factor in a calcium-dependent mechanism.',
   'B12 deficiency occurs in ~30% of long-term metformin users. Annual B12 monitoring recommended.',
   'Supplement B12 proactively if on metformin >1 year. Monitor serum B12 annually.',
   NULL, 'Liu 2019; ADA Guidelines'),

  ('biotin', 'levothyroxine',
   'moderate', 'metabolism',
   'Biotin at supplement doses (>5mg/day) interferes with biotin-based immunoassays used for TSH, T4, and T3 testing.',
   'Does not affect actual thyroid function — only laboratory measurement. Can cause falsely low TSH and falsely normal T4.',
   'Stop biotin supplementation 48–72 hours before any thyroid function test.',
   NULL, 'FDA Safety Communication 2017; Piketty 2017'),

  ('coq10', 'statin_class',
   'beneficial', 'depletion',
   'Statins inhibit HMG-CoA reductase, which also reduces endogenous CoQ10 synthesis by 40–50%.',
   'CoQ10 depletion may contribute to statin-induced myopathy (muscle pain/weakness). Supplementation may reduce myalgia.',
   'Consider CoQ10 200mg/day (ubiquinol form) if experiencing statin-induced muscle symptoms.',
   NULL, 'Littarru 2007; Banach 2015')
ON CONFLICT (supplement_name, drug_name) DO NOTHING;

-- ── menstrual_cycle_tracking: logged cycle data per user ──────────────────

CREATE TABLE IF NOT EXISTS menstrual_cycle_tracking (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  cycle_start_date        DATE        NOT NULL,
  cycle_length_days       INTEGER,
  period_length_days      INTEGER,
  luteal_phase_length_days INTEGER,
  symptoms                JSONB       NOT NULL DEFAULT '{}',
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, cycle_start_date)
);
CREATE INDEX IF NOT EXISTS menstrual_cycle_user_idx
  ON menstrual_cycle_tracking(user_id);

-- ── cycle_phase_modifiers: supplement adjustments by menstrual phase ───────

CREATE TABLE IF NOT EXISTS cycle_phase_modifiers (
  id                      UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_phase             TEXT    NOT NULL
                            CHECK (cycle_phase IN ('menstrual','follicular','ovulatory','luteal')),
  supplement_category     TEXT    NOT NULL,
  modifier_type           TEXT    NOT NULL
                            CHECK (modifier_type IN ('increase','decrease','add','remove','maintain')),
  modifier_reason         TEXT    NOT NULL,
  recommended_adjustment  TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (cycle_phase, supplement_category)
);

INSERT INTO cycle_phase_modifiers
  (cycle_phase, supplement_category, modifier_type, modifier_reason, recommended_adjustment)
VALUES
  ('menstrual', 'iron_group', 'increase',
   'Menstrual blood loss acutely raises iron needs. Ferritin can fall significantly during heavy periods.',
   'Increase iron intake by 50% during menstruation days if tolerated; pair with Vitamin C.'),
  ('luteal', 'magnesium_group', 'increase',
   'Progesterone promotes renal magnesium excretion. PMS symptoms (cramps, mood) are linked to magnesium deficit.',
   'Increase magnesium glycinate by 200mg in the 7–10 days before expected period.'),
  ('follicular', 'omega3_group', 'maintain',
   'Oestrogen rising in follicular phase supports natural anti-inflammatory state. Maintain baseline omega-3.',
   'Continue standard omega-3 dose. No adjustment needed.'),
  ('ovulatory', 'zinc_group', 'maintain',
   'Zinc plays a role in follicle maturation and supports egg quality around ovulation.',
   'Maintain zinc dose. Avoid acute zinc deficiency in the periovulatory window.'),
  ('luteal', 'b6_group', 'add',
   'Pyridoxal-5-phosphate (P-5-P) supports progesterone synthesis and reduces PMS-related mood symptoms.',
   'Add 25–50mg P-5-P (active B6) during the luteal phase if PMS mood symptoms are present.'),
  ('menstrual', 'calcium_group', 'increase',
   'Clinical trials show calcium supplementation reduces dysmenorrhoea severity and mood-related PMS symptoms.',
   'Increase calcium by 200–300mg in the 3 days before and during menstruation.')
ON CONFLICT (cycle_phase, supplement_category) DO NOTHING;

-- ── notification_preferences: per-user notification settings ──────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                         UUID        NOT NULL UNIQUE REFERENCES nextauth_users(id) ON DELETE CASCADE,
  morning_reminder_enabled        BOOLEAN     NOT NULL DEFAULT true,
  morning_reminder_time           TIME        NOT NULL DEFAULT '08:00',
  evening_reminder_enabled        BOOLEAN     NOT NULL DEFAULT true,
  evening_reminder_time           TIME        NOT NULL DEFAULT '20:00',
  low_supply_alert_enabled        BOOLEAN     NOT NULL DEFAULT true,
  low_supply_threshold_days       INTEGER     NOT NULL DEFAULT 7,
  new_research_enabled            BOOLEAN     NOT NULL DEFAULT false,
  adverse_event_followup_enabled  BOOLEAN     NOT NULL DEFAULT true,
  weekly_summary_enabled          BOOLEAN     NOT NULL DEFAULT true,
  push_notifications_enabled      BOOLEAN     NOT NULL DEFAULT false,
  email_notifications_enabled     BOOLEAN     NOT NULL DEFAULT true,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now()
);

-- ── protocol_ramp_plans: gradual dose introduction plans ──────────────────

CREATE TABLE IF NOT EXISTS protocol_ramp_plans (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  snapshot_id  UUID        REFERENCES protocol_snapshots(id) ON DELETE SET NULL,
  total_weeks  INTEGER     NOT NULL DEFAULT 4,
  current_week INTEGER     NOT NULL DEFAULT 1,
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS protocol_ramp_plans_user_idx
  ON protocol_ramp_plans(user_id) WHERE is_active = true;

-- ── protocol_ramp_steps: per-product weekly dose fractions ────────────────

CREATE TABLE IF NOT EXISTS protocol_ramp_steps (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ramp_plan_id  UUID        NOT NULL REFERENCES protocol_ramp_plans(id) ON DELETE CASCADE,
  product_id    UUID        NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  week_number   INTEGER     NOT NULL,
  dose_fraction NUMERIC(3,2) NOT NULL,                   -- 0.25 | 0.50 | 0.75 | 1.00
  actual_dose_mg NUMERIC,
  rationale     TEXT,
  completed     BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ramp_plan_id, product_id, week_number)
);

-- ── supplement_cycles: on/off cycling schedules per user × product ─────────

CREATE TABLE IF NOT EXISTS supplement_cycles (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID    NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id       UUID    NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  cycle_start_date DATE    NOT NULL,
  on_weeks         INTEGER NOT NULL,
  off_weeks        INTEGER NOT NULL,
  current_phase    TEXT    NOT NULL DEFAULT 'on' CHECK (current_phase IN ('on','off')),
  phase_started_at DATE    NOT NULL,
  next_phase_at    DATE    NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS supplement_cycles_user_idx
  ON supplement_cycles(user_id) WHERE is_active = true;

-- ── cumulative_dose_safety: fat-soluble / accumulating supplement risk data ─

CREATE TABLE IF NOT EXISTS cumulative_dose_safety (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id           UUID    NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  marker_name          TEXT    NOT NULL,
  accumulation_type    TEXT    NOT NULL
                         CHECK (accumulation_type IN ('fat_soluble','water_soluble','mineral','herbal')),
  half_life_days       NUMERIC,
  toxicity_onset_weeks INTEGER,
  washout_weeks        INTEGER,
  early_toxicity_signs TEXT[]  NOT NULL DEFAULT '{}',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (product_id, marker_name)
);

-- ── nutrient_upper_limits: evidence-based tolerable upper intake levels ────

CREATE TABLE IF NOT EXISTS nutrient_upper_limits (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nutrient_name  TEXT    NOT NULL UNIQUE,
  ul_mg          NUMERIC NOT NULL,
  ul_unit        TEXT    NOT NULL DEFAULT 'mg',
  population     TEXT    NOT NULL DEFAULT 'adult',       -- adult | pregnant | elderly
  rationale      TEXT,
  source         TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO nutrient_upper_limits (nutrient_name, ul_mg, ul_unit, population, rationale, source)
VALUES
  ('Iron',       45,    'mg',  'adult',
   'UL set to prevent GI distress and oxidative stress. Blood donors may safely exceed temporarily.',
   'NIH ODS; Institute of Medicine 2001'),
  ('Zinc',       40,    'mg',  'adult',
   'Chronic excess causes copper deficiency and impairs immune function.',
   'NIH ODS; IOM DRI 2001'),
  ('Vitamin_D',  4000,  'IU',  'adult',
   'UL based on hypercalcaemia risk. Many experts consider up to 10,000 IU safe short-term with monitoring.',
   'Institute of Medicine 2010'),
  ('Selenium',   400,   'mcg', 'adult',
   'Selenosis (hair/nail loss, GI symptoms) begins above 400mcg/day.',
   'NIH ODS; EFSA 2014'),
  ('Vitamin_A',  10000, 'IU',  'adult',
   'Preformed vitamin A (retinol) is teratogenic above 10,000 IU/day in pregnancy.',
   'NIH ODS; IOM DRI 2001'),
  ('Magnesium',  350,   'mg',  'adult',
   'UL applies to supplemental magnesium only (not food). Excess causes osmotic diarrhoea.',
   'NIH ODS; IOM DRI 1997'),
  ('Calcium',    2500,  'mg',  'adult',
   'Chronic excess increases risk of kidney stones and may accelerate vascular calcification.',
   'NIH ODS; IOM DRI 2011')
ON CONFLICT (nutrient_name) DO NOTHING;

-- ── user_supply_tracking: days-of-supply per product per user ─────────────

CREATE TABLE IF NOT EXISTS user_supply_tracking (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id               UUID        NOT NULL REFERENCES health_products(id) ON DELETE CASCADE,
  units_remaining          INTEGER     NOT NULL DEFAULT 1,
  servings_per_unit        INTEGER     NOT NULL DEFAULT 1,
  servings_remaining       INTEGER     NOT NULL,
  daily_servings           NUMERIC     NOT NULL DEFAULT 1,
  estimated_days_remaining INTEGER,                       -- updated by app logic
  last_restocked_at        TIMESTAMPTZ,
  next_restock_reminder_at TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS user_supply_tracking_user_idx
  ON user_supply_tracking(user_id);

-- ── symptom_reports: user-reported symptoms ────────────────────────────────

CREATE TABLE IF NOT EXISTS symptom_reports (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  reported_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  symptoms          TEXT[]      NOT NULL DEFAULT '{}',
  severity          INTEGER     CHECK (severity BETWEEN 1 AND 10),
  notes             TEXT,
  suspected_trigger TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS symptom_reports_user_idx
  ON symptom_reports(user_id);

-- ── symptom_marker_map: symptoms → likely biomarker signals ───────────────

CREATE TABLE IF NOT EXISTS symptom_marker_map (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  symptom        TEXT    NOT NULL UNIQUE,
  likely_markers TEXT[]  NOT NULL DEFAULT '{}',
  direction      TEXT    NOT NULL CHECK (direction IN ('low','high','either')),
  priority       INTEGER NOT NULL DEFAULT 1,
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO symptom_marker_map (symptom, likely_markers, direction, priority, notes)
VALUES
  ('fatigue',
   ARRAY['Ferritin','B12_Cobalamin','Vitamin_D_25OH','TSH'],
   'either', 1,
   'Most common biomarker-driven symptom. TSH abnormality can cause fatigue in both directions.'),
  ('brain_fog',
   ARRAY['B12_Cobalamin','Vitamin_D_25OH','TSH','Omega3_Index'],
   'low', 2,
   'B12 and D deficiency are primary drivers. Elevated TSH (hypothyroidism) also causes cognitive slowing.'),
  ('hair_loss',
   ARRAY['Ferritin','Zinc','TSH','Vitamin_D_25OH'],
   'low', 2,
   'Ferritin <40ng/mL consistently linked to diffuse hair shedding even when Hb is normal.'),
  ('muscle_cramps',
   ARRAY['Magnesium','Calcium','Potassium'],
   'low', 2,
   'Nocturnal cramps most often reflect magnesium or electrolyte depletion.'),
  ('cold_sensitivity',
   ARRAY['TSH','Ferritin','Vitamin_D_25OH'],
   'either', 3,
   'Always feeling cold can indicate hypothyroidism (high TSH), anaemia, or severe D deficiency.'),
  ('poor_sleep',
   ARRAY['Magnesium','Cortisol','Vitamin_D_25OH'],
   'either', 2,
   'Magnesium deficiency reduces sleep quality; elevated evening cortisol delays sleep onset.'),
  ('low_libido',
   ARRAY['Testosterone_Total','DHEA_S','Zinc'],
   'low', 2,
   'Applies to both sexes. Zinc is an essential cofactor for testosterone synthesis.'),
  ('frequent_illness',
   ARRAY['Zinc','Vitamin_D_25OH','Selenium'],
   'low', 1,
   'Zinc and D are the most evidence-backed immune-support nutrients.')
ON CONFLICT (symptom) DO NOTHING;

-- ── protocol_simulations: user-generated what-if stacks ───────────────────

CREATE TABLE IF NOT EXISTS protocol_simulations (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  simulated_products      JSONB       NOT NULL DEFAULT '[]',
  total_monthly_cost_usd  NUMERIC(8,2),
  interaction_warnings    JSONB       NOT NULL DEFAULT '[]',
  upper_limit_warnings    JSONB       NOT NULL DEFAULT '[]',
  timing_conflicts        JSONB       NOT NULL DEFAULT '[]',
  created_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS protocol_simulations_user_idx
  ON protocol_simulations(user_id);

-- ── protocol_share_cards: shareable protocol links ────────────────────────

CREATE TABLE IF NOT EXISTS protocol_share_cards (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  snapshot_id         UUID        REFERENCES protocol_snapshots(id) ON DELETE SET NULL,
  share_token         TEXT        NOT NULL UNIQUE,
  card_type           TEXT        NOT NULL DEFAULT 'public'
                        CHECK (card_type IN ('public','practitioner')),
  expires_at          TIMESTAMPTZ,
  view_count          INTEGER     NOT NULL DEFAULT 0,
  include_biomarkers  BOOLEAN     NOT NULL DEFAULT false,
  include_cost        BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS protocol_share_cards_user_idx
  ON protocol_share_cards(user_id);
CREATE INDEX IF NOT EXISTS protocol_share_cards_token_idx
  ON protocol_share_cards(share_token);

-- ── chronotype_timing_offsets: wall-clock times per chronotype × slot ─────

CREATE TABLE IF NOT EXISTS chronotype_timing_offsets (
  id                            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  chronotype                    TEXT    NOT NULL
                                  CHECK (chronotype IN ('morning','intermediate','evening')),
  timing_slot                   TEXT    NOT NULL,
  clock_time                    TEXT    NOT NULL,          -- "HH:MM" 24h
  offset_from_standard_minutes  INTEGER NOT NULL DEFAULT 0,
  notes                         TEXT,
  is_active                     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (chronotype, timing_slot)
);

-- 3 chronotypes × 7 slots = 21 rows
INSERT INTO chronotype_timing_offsets
  (chronotype, timing_slot, clock_time, offset_from_standard_minutes, notes)
VALUES
  -- Morning type (early bird — wakes ~5:30–6am)
  ('morning', 'morning',      '06:30', -90, 'First fat-soluble supplements with breakfast'),
  ('morning', 'pre_workout',  '07:00', -90, 'Pre-workout stack before early training session'),
  ('morning', 'with_lunch',   '11:30', -60, 'Midday mineral and iron doses'),
  ('morning', 'afternoon',    '14:00', -60, 'Afternoon energy + adaptogens'),
  ('morning', 'with_dinner',  '17:30', -90, 'Evening fat-soluble supplements'),
  ('morning', 'pre_sleep',    '21:00', -90, 'Magnesium and sleep-support stack'),
  ('morning', 'post_workout', '08:00', -90, 'Creatine + protein window'),

  -- Intermediate type (standard reference — wakes ~7:30–8am)
  ('intermediate', 'morning',      '08:00',   0, 'Reference time for all offsets'),
  ('intermediate', 'pre_workout',  '08:30',   0, 'Standard pre-workout window'),
  ('intermediate', 'with_lunch',   '12:30',   0, 'Standard midday dose window'),
  ('intermediate', 'afternoon',    '15:00',   0, 'Standard afternoon window'),
  ('intermediate', 'with_dinner',  '19:00',   0, 'Standard evening fat-soluble window'),
  ('intermediate', 'pre_sleep',    '22:30',   0, 'Standard sleep-stack window'),
  ('intermediate', 'post_workout', '09:30',   0, 'Standard post-workout window'),

  -- Evening type (night owl — wakes ~9:30–10am)
  ('evening', 'morning',      '10:00', 120, 'First morning supplements delayed to match later wake'),
  ('evening', 'pre_workout',  '17:00', 510, 'Late-afternoon training typical for evening types'),
  ('evening', 'with_lunch',   '13:30',  60, 'Later lunch window'),
  ('evening', 'afternoon',    '16:00',  60, 'Afternoon adaptogens align with later peak alertness'),
  ('evening', 'with_dinner',  '20:30',  90, 'Later dinner window — delay fat-solubles accordingly'),
  ('evening', 'pre_sleep',    '00:00',  90, 'Sleep stack near midnight for natural later sleep timing'),
  ('evening', 'post_workout', '18:30', 540, 'Post late-afternoon workout window')
ON CONFLICT (chronotype, timing_slot) DO NOTHING;

-- ── user_protocol_timelines: audit trail of protocol events per user ───────

CREATE TABLE IF NOT EXISTS user_protocol_timelines (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  event_data  JSONB       NOT NULL DEFAULT '{}',
  snapshot_id UUID        REFERENCES protocol_snapshots(id) ON DELETE SET NULL,
  product_id  UUID        REFERENCES health_products(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_protocol_timelines_user_idx
  ON user_protocol_timelines(user_id);
CREATE INDEX IF NOT EXISTS user_protocol_timelines_occurred_at_idx
  ON user_protocol_timelines(user_id, occurred_at DESC);

-- ── travel_events: logged travel for supplement timing adjustment ──────────

CREATE TABLE IF NOT EXISTS travel_events (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID    NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  destination_timezone  TEXT    NOT NULL,
  origin_timezone       TEXT    NOT NULL,
  departure_date        DATE    NOT NULL,
  return_date           DATE,
  flight_direction      TEXT    CHECK (flight_direction IN ('eastward','westward','na')),
  adjustment_strategy   TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS travel_events_user_idx
  ON travel_events(user_id) WHERE is_active = true;

-- ── personal_biomarker_baselines: user-specific reference ranges ──────────

CREATE TABLE IF NOT EXISTS personal_biomarker_baselines (
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  marker_name           TEXT        NOT NULL,
  personal_mean         NUMERIC     NOT NULL,
  personal_std_dev      NUMERIC,
  personal_optimal_low  NUMERIC,
  personal_optimal_high NUMERIC,
  data_points           INTEGER     NOT NULL DEFAULT 0,
  confidence            NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  first_sample_date     DATE,
  last_sample_date      DATE,
  last_computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, marker_name)
);

-- ── personal_baseline_history: individual biomarker readings over time ─────

CREATE TABLE IF NOT EXISTS personal_baseline_history (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  marker_name         TEXT        NOT NULL,
  value_at            NUMERIC     NOT NULL,
  measured_date       DATE        NOT NULL,
  biomarker_result_id UUID        REFERENCES biomarkers(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS personal_baseline_history_user_marker_idx
  ON personal_baseline_history(user_id, marker_name);

-- ═══════════════════════════════════════════════════════════
-- SECTION 2: ALTER TABLE — extend existing tables
-- ═══════════════════════════════════════════════════════════

-- ── health_products: additional product metadata ──────────────────────────

ALTER TABLE health_products
  ADD COLUMN IF NOT EXISTS post_workout_adaptation_risk    BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_workout_risk_threshold_mg  NUMERIC,
  ADD COLUMN IF NOT EXISTS post_workout_risk_note          TEXT,
  ADD COLUMN IF NOT EXISTS has_cycling_requirement         BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycling_on_weeks                INTEGER,
  ADD COLUMN IF NOT EXISTS cycling_off_weeks               INTEGER,
  ADD COLUMN IF NOT EXISTS cycling_rationale               TEXT,
  ADD COLUMN IF NOT EXISTS product_form_id                 UUID     REFERENCES product_forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS form_name                       TEXT;

-- ── user_health_context: chronotype, travel, cycle, ramp, gate columns ────

ALTER TABLE user_health_context
  ADD COLUMN IF NOT EXISTS chronotype                    TEXT,
  ADD COLUMN IF NOT EXISTS symptom_last_reported_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supply_tracking_enabled       BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ramp_started_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ramp_current_week             INTEGER,
  ADD COLUMN IF NOT EXISTS ramp_completed                BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_travel_mode                BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_mode_activated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS travel_destination_timezone   TEXT,
  ADD COLUMN IF NOT EXISTS travel_origin_timezone        TEXT,
  ADD COLUMN IF NOT EXISTS travel_mode_ends_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS protocol_gated_reason         TEXT,
  ADD COLUMN IF NOT EXISTS protocol_gated_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS protocol_gate_acknowledged    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medication_last_updated       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_detected_training_phase  TEXT,
  ADD COLUMN IF NOT EXISTS auto_phase_confidence         NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS auto_phase_computed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_phase_override_until     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pregnancy_status              TEXT,
  ADD COLUMN IF NOT EXISTS pregnancy_status_updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biological_sex                TEXT,
  ADD COLUMN IF NOT EXISTS hormonal_status               TEXT,
  ADD COLUMN IF NOT EXISTS cycle_tracking_enabled        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS average_cycle_length_days     INTEGER;

-- ── dosing_rules: effect timeline + patient-facing narrative ──────────────

ALTER TABLE dosing_rules
  ADD COLUMN IF NOT EXISTS quick_effect_weeks       INTEGER,
  ADD COLUMN IF NOT EXISTS meaningful_effect_weeks  INTEGER,
  ADD COLUMN IF NOT EXISTS full_effect_weeks        INTEGER,
  ADD COLUMN IF NOT EXISTS what_to_expect           TEXT,
  ADD COLUMN IF NOT EXISTS early_indicators         TEXT[];

-- ── notification_log: suppression tracking ────────────────────────────────

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS suppression_reason TEXT;

-- ═══════════════════════════════════════════════════════════
-- SECTION 3: V8 CLINICAL TABLES
-- ═══════════════════════════════════════════════════════════

-- ── critical_value_thresholds: panic-value definitions ────────────────────

CREATE TABLE IF NOT EXISTS critical_value_thresholds (
  id                      UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  marker_name             TEXT  NOT NULL UNIQUE,
  critical_high           NUMERIC,
  critical_low            NUMERIC,
  critical_high_condition TEXT,
  critical_low_condition  TEXT,
  immediate_action_text   TEXT  NOT NULL,
  practitioner_alert_text TEXT,
  unit                    TEXT  NOT NULL,
  source                  TEXT
);

INSERT INTO critical_value_thresholds
  (marker_name, critical_high, critical_low, unit, immediate_action_text, practitioner_alert_text, source)
VALUES
  ('Ferritin', NULL, 5,
   'ng/mL',
   'Critically low ferritin — iron stores are depleted. Consult your doctor before adjusting supplements.',
   'Ferritin <5 ng/mL indicates severe iron depletion. Evaluate for GI blood loss.',
   'BSH 2021; NICE'),
  ('Potassium', 6.5, 2.5,
   'mEq/L',
   'Dangerous potassium level detected — seek emergency care immediately.',
   'Critical potassium requires urgent IV management. Risk of cardiac arrhythmia.',
   'Clinical Lab Standards'),
  ('Sodium', 160, 120,
   'mEq/L',
   'Critical sodium imbalance — seek emergency care immediately.',
   'Severe hyponatraemia or hypernatraemia requires controlled correction to prevent cerebral oedema/myelinolysis.',
   'Clinical Lab Standards'),
  ('ALT', 1000, NULL,
   'U/L',
   'Severely elevated liver enzyme — stop any potentially hepatotoxic supplements and contact your doctor urgently.',
   'ALT >1000 U/L suggests acute hepatocellular injury. Discontinue all supplements pending investigation.',
   'AASLD Guidelines'),
  ('TSH', 50, 0.01,
   'mIU/L',
   'Critical thyroid hormone level detected. Contact your doctor today.',
   'TSH >50 indicates severe hypothyroidism; TSH <0.01 indicates thyrotoxicosis. Both require urgent review.',
   'ATA Guidelines'),
  ('eGFR', NULL, 15,
   'mL/min/1.73m²',
   'Critically low kidney function. Avoid nephrotoxic supplements and consult your nephrologist urgently.',
   'eGFR <15 = kidney failure. Many supplements require dose adjustment or cessation.',
   'KDIGO 2024'),
  ('Glucose_Fasting', 500, 50,
   'mg/dL',
   'Critical blood glucose level — seek emergency care immediately.',
   'Hypoglycaemia <50 requires urgent glucose administration; hyperglycaemia >500 may indicate DKA.',
   'ADA Standards of Care 2024'),
  ('Hemoglobin', NULL, 7,
   'g/dL',
   'Critically low haemoglobin — seek medical evaluation immediately.',
   'Hb <7 g/dL is the typical transfusion threshold. Supplement changes alone are insufficient at this level.',
   'BSH 2021; BCSH Guidelines')
ON CONFLICT (marker_name) DO NOTHING;

-- ── critical_value_events: per-user triggered alerts ─────────────────────

CREATE TABLE IF NOT EXISTS critical_value_events (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  marker_name          TEXT        NOT NULL,
  observed_value       NUMERIC     NOT NULL,
  threshold_triggered  TEXT        NOT NULL
                         CHECK (threshold_triggered IN ('critical_high','critical_low')),
  threshold_value      NUMERIC     NOT NULL,
  biomarker_result_id  UUID        REFERENCES biomarkers(id) ON DELETE SET NULL,
  alerted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_acknowledged_at TIMESTAMPTZ,
  practitioner_alerted BOOLEAN     NOT NULL DEFAULT false,
  protocol_gated       BOOLEAN     NOT NULL DEFAULT false,
  resolved_at          TIMESTAMPTZ,
  notes                TEXT
);
CREATE INDEX IF NOT EXISTS critical_value_events_user_idx
  ON critical_value_events(user_id);
CREATE INDEX IF NOT EXISTS critical_value_events_unresolved_idx
  ON critical_value_events(user_id) WHERE resolved_at IS NULL;

-- ── pregnancy_safety_rules: supplement safety by pregnancy status ──────────

CREATE TABLE IF NOT EXISTS pregnancy_safety_rules (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  product_category    TEXT    NOT NULL,
  applicable_statuses TEXT[]  NOT NULL DEFAULT '{}',
  rule_type           TEXT    NOT NULL
                        CHECK (rule_type IN ('hard_block','dose_limit','require_md_approval','monitor')),
  dose_limit_mg       NUMERIC,
  block_reason        TEXT    NOT NULL,
  user_facing_message TEXT    NOT NULL,
  clinical_note       TEXT,
  evidence_level      TEXT    NOT NULL
                        CHECK (evidence_level IN ('established','probable','limited','theoretical')),
  trimester_specific  BOOLEAN NOT NULL DEFAULT false,
  source              TEXT,
  reviewed_by         TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS pregnancy_safety_rules_active_idx
  ON pregnancy_safety_rules(product_category) WHERE is_active = true;

INSERT INTO pregnancy_safety_rules
  (product_category, applicable_statuses, rule_type, block_reason, user_facing_message, clinical_note, evidence_level, trimester_specific, source)
VALUES
  ('vit_a_retinol_group',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
   'hard_block',
   'Preformed vitamin A (retinol) is teratogenic above 10,000 IU/day.',
   'High-dose Vitamin A is not safe during pregnancy or while trying to conceive. Food-sourced beta-carotene is safe.',
   'Teratogenic effects documented at >10,000 IU/day retinol. Avoid supplements unless prescribed.',
   'established', true, 'Rothman 1995; NIH ODS Teratology'),

  ('ashwagandha',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
   'hard_block',
   'Ashwagandha has documented uterotonic properties that may stimulate contractions.',
   'Ashwagandha is not safe during pregnancy. Discontinue when planning to conceive.',
   'Withanolides have been shown to stimulate uterine smooth muscle in animal models.',
   'probable', false, 'Mishra 2000; Singh 2011'),

  ('adaptogens_group',
   ARRAY['first_trimester'],
   'dose_limit',
   'Insufficient human safety data during the critical first trimester of organogenesis.',
   'Adaptogenic herbs (Rhodiola, Eleuthero, Maca) have limited safety data in early pregnancy. Consult your OB.',
   'First trimester is the period of highest teratogenic risk. Caution is warranted without RCT evidence.',
   'theoretical', true, 'WHO Traditional Medicine Guidelines'),

  ('vit_c_group',
   ARRAY['first_trimester','second_trimester','third_trimester'],
   'dose_limit',
   'Very high doses of Vitamin C (>2000mg/day) may increase miscarriage risk.',
   'Keep Vitamin C to ≤500mg supplemental during pregnancy. Your diet likely provides the 85mg RDA.',
   'The UL is 2000mg/day; the RDA during pregnancy is 85mg. High-dose IV use associated with adverse outcomes.',
   'limited', false, 'IOM DRI 2000; Bjelakovic 2012'),

  ('herbal_stimulants',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
   'hard_block',
   'Herbal stimulants (guarana, ephedra, high-dose caffeine, synephrine) can restrict fetal blood flow.',
   'Stimulant-containing supplements are not safe during pregnancy. Switch to caffeine-free alternatives.',
   'Vasoconstriction and elevated cortisol from stimulants can impair placental perfusion.',
   'established', false, 'ACOG Practice Bulletin'),

  ('iron_group',
   ARRAY['first_trimester','second_trimester','third_trimester'],
   'dose_limit',
   'Iron needs increase during pregnancy, but excessive iron is associated with oxidative stress.',
   'During pregnancy, your iron needs rise to 27mg/day. Do not exceed this without medical supervision.',
   'Both deficiency and excess are harmful in pregnancy. Target: ferritin 30–50 ng/mL.',
   'established', false, 'WHO Guideline 2016; ACOG 2008'),

  ('dha_omega3',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'monitor',
   'High-dose omega-3 may have mild anticoagulant effect. DHA is beneficial and recommended.',
   'DHA 200–300mg/day is recommended during pregnancy for fetal brain development. Stay under 3g/day total.',
   'DHA is essential for fetal brain and retinal development. Benefits outweigh risks at 200–300mg/day.',
   'established', false, 'EFSA 2014; WHO 2008'),

  ('melatonin_group',
   ARRAY['first_trimester'],
   'monitor',
   'Exogenous melatonin has limited safety data in the first trimester of human pregnancy.',
   'Melatonin use in early pregnancy lacks long-term safety data. Consult your OB before continuing.',
   'Melatonin receptors are present in the placenta. Animal data suggests potential effects on fetal development.',
   'theoretical', true, 'Reiter 2014; Lanoix 2012')
ON CONFLICT DO NOTHING;

-- ── nutrient_competition_rules: absorption interference between nutrients ───

CREATE TABLE IF NOT EXISTS nutrient_competition_rules (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nutrient_a                  TEXT    NOT NULL,
  nutrient_b                  TEXT    NOT NULL,
  competition_type            TEXT
                                CHECK (competition_type IN (
                                  'transporter_competition','binding_inhibition',
                                  'metabolic_depletion','receptor_competition')),
  competition_threshold_a_mg  NUMERIC,
  competition_threshold_b_mg  NUMERIC,
  absorption_impact_pct       NUMERIC,
  affected_nutrient           TEXT    NOT NULL,
  mitigation_strategy         TEXT    NOT NULL,
  clinical_note               TEXT,
  source                      TEXT,
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (nutrient_a, nutrient_b)
);
CREATE INDEX IF NOT EXISTS nutrient_competition_active_idx
  ON nutrient_competition_rules(nutrient_a, nutrient_b) WHERE is_active = true;

INSERT INTO nutrient_competition_rules
  (nutrient_a, nutrient_b, competition_type, competition_threshold_a_mg,
   absorption_impact_pct, affected_nutrient, mitigation_strategy, clinical_note, source)
VALUES
  ('Iron', 'Zinc', 'transporter_competition', 25, 30,
   'Zinc',
   'Take iron and zinc >2 hours apart, or use a chelated form for both to reduce competitive inhibition.',
   'Shared DMT-1 transporter. High-dose iron supplements (>25mg) significantly reduce zinc absorption.',
   'Sandstrom 1985; Rossander-Hulten 1991'),
  ('Calcium', 'Iron', 'transporter_competition', 500, 50,
   'Iron',
   'Take iron supplements at a separate meal or at least 2 hours away from calcium.',
   'Both milk calcium and supplemental calcium inhibit non-haeme iron absorption. Effect is dose-dependent.',
   'Hallberg 1991; Gleerup 1995'),
  ('Calcium', 'Zinc', 'transporter_competition', 1000, 20,
   'Zinc',
   'Avoid combining high-dose calcium with zinc in the same meal. Split into separate doses.',
   'Effect seen primarily at calcium doses >1000mg. Dietary calcium has minimal impact.',
   'Dawson-Hughes 1986; Wood & Zheng 1997'),
  ('Zinc', 'Copper', 'transporter_competition', 40, 40,
   'Copper',
   'Take copper 2+ hours apart from zinc, or use a balanced Zinc + Copper product (7.5:1 ratio).',
   'Zinc induces metallothionein in intestinal cells, which binds copper and prevents its absorption.',
   'Solomons 1985; IOM DRI 2001'),
  ('Magnesium', 'Calcium', 'transporter_competition', 600, 25,
   'Magnesium',
   'Split calcium and magnesium supplements across different meals. Avoid combining in a single high dose.',
   'Calcium-to-magnesium ratio matters more than absolute amounts. Aim for ≤2:1 Ca:Mg in supplements.',
   'Rude 2010; WHO/FAO 2004')
ON CONFLICT (nutrient_a, nutrient_b) DO NOTHING;

-- ── adverse_event_reports: user-reported supplement adverse events ─────────

CREATE TABLE IF NOT EXISTS adverse_event_reports (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id           UUID        REFERENCES health_products(id) ON DELETE SET NULL,
  protocol_snapshot_id UUID        REFERENCES protocol_snapshots(id) ON DELETE SET NULL,
  event_type           TEXT[]      NOT NULL DEFAULT '{}',
  severity             TEXT        NOT NULL
                         CHECK (severity IN ('mild','moderate','significant')),
  onset_days           INTEGER,
  duration_days        INTEGER,
  notes                TEXT,
  action_taken         TEXT        NOT NULL
                         CHECK (action_taken IN (
                           'nothing','reduced_dose','stopped_product','saw_doctor','switched_form')),
  reported_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at          TIMESTAMPTZ,
  reviewed_by_rd       BOOLEAN     NOT NULL DEFAULT false,
  rd_notes             TEXT
);
CREATE INDEX IF NOT EXISTS adverse_event_reports_user_idx
  ON adverse_event_reports(user_id);
CREATE INDEX IF NOT EXISTS adverse_event_reports_product_idx
  ON adverse_event_reports(product_id);

-- ── adverse_event_aggregates: rolled-up safety signals per product ─────────

CREATE TABLE IF NOT EXISTS adverse_event_aggregates (
  id                            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id                    UUID        NOT NULL UNIQUE REFERENCES health_products(id) ON DELETE CASCADE,
  total_reports                 INTEGER     NOT NULL DEFAULT 0,
  reports_last_90d              INTEGER     NOT NULL DEFAULT 0,
  significant_reports_last_90d  INTEGER     NOT NULL DEFAULT 0,
  top_event_types               JSONB,
  adverse_rate_pct              NUMERIC(5,2),
  dose_review_flagged           BOOLEAN     NOT NULL DEFAULT false,
  flagged_at                    TIMESTAMPTZ,
  last_computed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── adverse_event_prompts: triggered post-use check-in nudges ─────────────

CREATE TABLE IF NOT EXISTS adverse_event_prompts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  product_id     UUID        REFERENCES health_products(id) ON DELETE SET NULL,
  prompt_trigger TEXT        NOT NULL,
  prompted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at   TIMESTAMPTZ,
  response       TEXT
);
CREATE INDEX IF NOT EXISTS adverse_event_prompts_user_idx
  ON adverse_event_prompts(user_id);

-- ── training_phase_detections: auto-detected sport/training phases ─────────

CREATE TABLE IF NOT EXISTS training_phase_detections (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  detected_phase    TEXT        NOT NULL,
  confidence        NUMERIC(4,3) NOT NULL,
  detection_signals JSONB,
  detected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_confirmed    BOOLEAN
);
CREATE INDEX IF NOT EXISTS training_phase_detections_user_idx
  ON training_phase_detections(user_id);

-- ── protocol_pdf_exports: generated PDF export metadata ───────────────────

CREATE TABLE IF NOT EXISTS protocol_pdf_exports (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  snapshot_id                 UUID        REFERENCES protocol_outputs(id) ON DELETE SET NULL,
  pdf_url                     TEXT,
  export_type                 TEXT        NOT NULL
                                CHECK (export_type IN ('doctor_visit','specialist','full_clinical','summary')),
  include_biomarkers          BOOLEAN     NOT NULL DEFAULT true,
  include_drug_interactions   BOOLEAN     NOT NULL DEFAULT false,
  include_practitioner_notes  BOOLEAN     NOT NULL DEFAULT false,
  include_evidence_grades     BOOLEAN     NOT NULL DEFAULT false,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                  TIMESTAMPTZ,
  download_count              INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS protocol_pdf_exports_user_idx
  ON protocol_pdf_exports(user_id);

-- ── outcome_milestones: meaningful health achievements ────────────────────

CREATE TABLE IF NOT EXISTS outcome_milestones (
  id                            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                       UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  milestone_type                TEXT        NOT NULL
                                  CHECK (milestone_type IN (
                                    'biomarker_normalized','biomarker_improved',
                                    'biological_age_improved','adherence_streak',
                                    'race_pr','protocol_milestone','deficiency_cleared')),
  milestone_value               TEXT,
  previous_value                TEXT,
  marker_name                   TEXT,
  products_active_at_milestone  TEXT[]      NOT NULL DEFAULT '{}',
  achieved_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  narrative_text                TEXT,
  is_shared                     BOOLEAN     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS outcome_milestones_user_idx
  ON outcome_milestones(user_id);
CREATE INDEX IF NOT EXISTS outcome_milestones_shared_idx
  ON outcome_milestones(user_id) WHERE is_shared = true;

-- ── outcome_summaries: longitudinal progress summary per period ────────────

CREATE TABLE IF NOT EXISTS outcome_summaries (
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  period_start          DATE        NOT NULL,
  period_end            DATE        NOT NULL,
  total_adherence_days  INTEGER     NOT NULL DEFAULT 0,
  longest_streak_days   INTEGER     NOT NULL DEFAULT 0,
  biomarkers_normalized INTEGER     NOT NULL DEFAULT 0,
  bio_age_change_years  NUMERIC(4,2),
  readiness_avg_start   NUMERIC(5,2),
  readiness_avg_end     NUMERIC(5,2),
  top_milestones        JSONB,
  summary_narrative     TEXT,
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start, period_end)
);
