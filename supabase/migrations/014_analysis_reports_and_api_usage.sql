-- ============================================================
-- Migration 014: Analysis reports, API usage tracking,
--                and profiles biomarker-engine columns
-- ============================================================

-- ── 1. Extend profiles ─────────────────────────────────────────────────────────
-- Adds columns required by the biomarker engine intake form.
-- Uses ADD COLUMN IF NOT EXISTS so re-running is safe.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS biological_sex       TEXT,        -- 'male' | 'female' | 'other'
  ADD COLUMN IF NOT EXISTS height_cm            NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg            NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS activity_level       TEXT,        -- 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  ADD COLUMN IF NOT EXISTS athlete_archetype    TEXT,        -- 'endurance' | 'strength' | 'team_sport' | 'recreational' | etc.
  ADD COLUMN IF NOT EXISTS health_goals         TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_medications  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_supplements  TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS conditions           TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_tier            TEXT    NOT NULL DEFAULT 'free';  -- 'free' | 'pro' | 'clinic'

-- ── 2. analysis_reports ────────────────────────────────────────────────────────
-- One row per AI-generated analysis (biomarker deep-dive, goal assessment, etc.)

CREATE TABLE IF NOT EXISTS analysis_reports (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL,               -- 'biomarker_analysis' | 'goal_assessment' | 'protocol_review' | etc.
  input_snapshot  JSONB       DEFAULT '{}',           -- de-identified copy of inputs used to generate this report
  payload         JSONB,                              -- full structured output from Claude
  model           TEXT,                               -- e.g. 'claude-sonnet-4-6'
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  status          TEXT        NOT NULL DEFAULT 'ready'
                    CHECK (status IN ('processing', 'ready', 'failed')),
  error_message   TEXT,
  generated_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analysis_reports_user_id_idx      ON analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS analysis_reports_generated_at_idx ON analysis_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS analysis_reports_user_generated_idx
  ON analysis_reports(user_id, generated_at DESC);

-- ── 3. Row Level Security — analysis_reports ───────────────────────────────────
-- NOTE: This app uses NextAuth + service-role key for all server-side DB access.
-- The service role bypasses RLS by default, so all existing API routes are
-- unaffected. RLS is enabled here as a defence-in-depth measure: if any
-- client-side or anon-key access is added in future, users will only be able
-- to read their own rows.

ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- Service role (used by all API routes) bypasses RLS automatically — no policy needed.
-- This policy covers any future direct/anon client access:
DROP POLICY IF EXISTS "Users read own reports" ON analysis_reports;
CREATE POLICY "Users read own reports"
  ON analysis_reports
  FOR SELECT
  USING (user_id = auth.uid());

-- ── 4. api_usage ───────────────────────────────────────────────────────────────
-- Tracks every Claude API call for cost monitoring and per-user quota enforcement.

CREATE TABLE IF NOT EXISTS api_usage (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        REFERENCES nextauth_users(id) ON DELETE SET NULL,
  endpoint        TEXT        NOT NULL,               -- e.g. '/api/goal-prep/generate'
  report_id       UUID        REFERENCES analysis_reports(id) ON DELETE SET NULL,
  model           TEXT,                               -- e.g. 'claude-sonnet-4-6'
  input_tokens    INTEGER     NOT NULL DEFAULT 0,
  output_tokens   INTEGER     NOT NULL DEFAULT 0,
  -- cost_usd is computed: input * $3/M + output * $15/M for sonnet-4-6 (update as pricing changes)
  cost_usd        NUMERIC(10,6) GENERATED ALWAYS AS (
                    (input_tokens  * 3.0  / 1000000.0) +
                    (output_tokens * 15.0 / 1000000.0)
                  ) STORED,
  duration_ms     INTEGER,                            -- wall-clock time for the API call
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_user_id_idx    ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS api_usage_endpoint_idx   ON api_usage(endpoint);

-- ── 5. Verification query ───────────────────────────────────────────────────────
-- Run this after the migration to confirm everything was created:
--
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('analysis_reports', 'api_usage', 'profiles')
-- ORDER BY table_name;
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN (
--     'biological_sex','height_cm','weight_kg','activity_level',
--     'athlete_archetype','health_goals','current_medications',
--     'current_supplements','conditions','user_tier'
--   )
-- ORDER BY column_name;
