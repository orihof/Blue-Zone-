-- =============================================================
-- Blue Zone — Core Schema Migration 001
-- Run in Supabase SQL Editor (or via supabase db push)
-- Safe to run on a fresh DB or one that already ran schema.sql
-- =============================================================

-- ----------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- RATE LIMIT BUCKETS  (Supabase-persisted, survives cold starts)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  endpoint     text        NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer    NOT NULL DEFAULT 1,
  CONSTRAINT uq_rate_limit UNIQUE (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rl_user_endpoint
  ON rate_limit_buckets (user_id, endpoint, window_start);

-- ----------------------------------------------------------------
-- HEALTH UPLOADS  (multi-source: PDF, WHOOP, Oura, Garmin, Apple)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_uploads (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  source        text        NOT NULL, -- 'pdf'|'whoop'|'oura'|'garmin'|'apple_health'
  file_name     text,
  storage_path  text,                 -- Supabase Storage path (private bucket)
  raw_data      jsonb,                -- original wearable JSON payload
  parsed_data   jsonb,                -- normalized output
  warnings      text[]      NOT NULL DEFAULT '{}',
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','done','failed')),
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_uploads_user_id
  ON health_uploads (user_id, created_at DESC);

-- ----------------------------------------------------------------
-- BIOMARKERS  (extend existing table safely)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS biomarkers (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES nextauth_users(id) ON DELETE CASCADE,
  upload_id     uuid        REFERENCES health_uploads(id) ON DELETE SET NULL,
  snapshot_id   uuid,                 -- legacy FK, kept for backwards compat
  name          text        NOT NULL,
  value         numeric     NOT NULL,
  unit          text        NOT NULL,
  reference_min numeric,
  reference_max numeric,
  status        text        NOT NULL DEFAULT 'normal'
                CHECK (status IN ('low','normal','high','optimal','critical')),
  source        text,                 -- 'lab'|'blood_test'|'dexa'
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Add columns to existing biomarkers table if they were created without them
DO $$ BEGIN
  ALTER TABLE biomarkers ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES nextauth_users(id) ON DELETE CASCADE;
  ALTER TABLE biomarkers ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES health_uploads(id) ON DELETE SET NULL;
  ALTER TABLE biomarkers ADD COLUMN IF NOT EXISTS name      text;
  ALTER TABLE biomarkers ADD COLUMN IF NOT EXISTS source    text;
  ALTER TABLE biomarkers ADD COLUMN IF NOT EXISTS date      date NOT NULL DEFAULT CURRENT_DATE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_biomarkers_user_id
  ON biomarkers (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biomarkers_upload_id
  ON biomarkers (upload_id);

-- ----------------------------------------------------------------
-- WEARABLE SNAPSHOTS  (daily aggregates from any device)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wearable_snapshots (
  id               uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid    NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  upload_id        uuid    REFERENCES health_uploads(id) ON DELETE SET NULL,
  source           text    NOT NULL, -- 'whoop'|'oura'|'garmin'|'apple_health'
  date             date    NOT NULL,
  hrv              numeric,          -- ms (RMSSD)
  resting_hr       numeric,          -- bpm
  sleep_score      numeric,          -- 0–100
  deep_sleep_min   integer,
  rem_sleep_min    integer,
  recovery_score   numeric,          -- 0–100
  strain_score     numeric,          -- 0–21 (WHOOP) or 0–100 (others)
  readiness_score  numeric,          -- 0–100
  steps            integer,
  active_calories  integer,
  raw_data         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_wearable_snapshot UNIQUE (user_id, source, date)
);

CREATE INDEX IF NOT EXISTS idx_wearable_user_date
  ON wearable_snapshots (user_id, date DESC);

-- ----------------------------------------------------------------
-- PROTOCOL OUTPUTS  (Claude's raw + parsed responses)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocol_outputs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  upload_id       uuid        REFERENCES health_uploads(id) ON DELETE SET NULL,
  protocol_id     uuid        REFERENCES protocols(id) ON DELETE SET NULL,
  model           text        NOT NULL DEFAULT 'claude-sonnet-4-6',
  raw_response    text        NOT NULL,
  parsed_output   jsonb       NOT NULL,
  priority_score  integer     CHECK (priority_score BETWEEN 0 AND 100),
  input_tokens    integer,
  output_tokens   integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_outputs_user_id
  ON protocol_outputs (user_id, created_at DESC);

-- ----------------------------------------------------------------
-- UPDATED_AT TRIGGER  (health_uploads)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION _bz_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_health_uploads_updated_at ON health_uploads;
CREATE TRIGGER trg_health_uploads_updated_at
  BEFORE UPDATE ON health_uploads
  FOR EACH ROW EXECUTE FUNCTION _bz_set_updated_at();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- All tables use the service role exclusively (bypasses RLS).
-- These policies block accidental anon/authenticated JWT access.
-- ----------------------------------------------------------------

ALTER TABLE rate_limit_buckets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_uploads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomarkers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_outputs     ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then re-create
DO $$ DECLARE
  t text;
  p text;
BEGIN
  FOR t, p IN VALUES
    ('rate_limit_buckets',  'block_anon_rate_limits'),
    ('health_uploads',      'block_anon_health_uploads'),
    ('biomarkers',          'block_anon_biomarkers'),
    ('wearable_snapshots',  'block_anon_wearable_snapshots'),
    ('protocol_outputs',    'block_anon_protocol_outputs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
  END LOOP;
END $$;

CREATE POLICY block_anon_rate_limits      ON rate_limit_buckets   FOR ALL USING (false);
CREATE POLICY block_anon_health_uploads   ON health_uploads       FOR ALL USING (false);
CREATE POLICY block_anon_biomarkers       ON biomarkers           FOR ALL USING (false);
CREATE POLICY block_anon_wearable_snapshots ON wearable_snapshots FOR ALL USING (false);
CREATE POLICY block_anon_protocol_outputs ON protocol_outputs     FOR ALL USING (false);
