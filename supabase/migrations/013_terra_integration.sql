-- Migration 013: Terra wearable integration
-- Extends wearable_snapshots with Terra-specific columns
-- Adds terra_user_id to profiles for webhook auth event matching

-- ── Extend wearable_snapshots ──────────────────────────────────────────────────
ALTER TABLE wearable_snapshots
  ADD COLUMN IF NOT EXISTS heart_rate_resting  INTEGER,
  ADD COLUMN IF NOT EXISTS heart_rate_avg      INTEGER,
  ADD COLUMN IF NOT EXISTS heart_rate_max      INTEGER,
  ADD COLUMN IF NOT EXISTS hrv_rmssd           NUMERIC,
  ADD COLUMN IF NOT EXISTS sleep_total_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sleep_rem_minutes   INTEGER,
  ADD COLUMN IF NOT EXISTS sleep_deep_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS sleep_light_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS vo2_max             NUMERIC,
  ADD COLUMN IF NOT EXISTS stress_score        INTEGER,
  ADD COLUMN IF NOT EXISTS spo2                NUMERIC,
  ADD COLUMN IF NOT EXISTS raw_payload         JSONB,
  ADD COLUMN IF NOT EXISTS recorded_at         TIMESTAMPTZ;

-- Back-fill recorded_at from existing date column where possible
UPDATE wearable_snapshots
  SET recorded_at = date::TIMESTAMPTZ
  WHERE recorded_at IS NULL AND date IS NOT NULL;

-- ── Extend profiles ────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terra_user_id TEXT;

-- Sparse index — only non-null rows (Terra-connected users)
CREATE INDEX IF NOT EXISTS profiles_terra_user_id_idx
  ON profiles(terra_user_id)
  WHERE terra_user_id IS NOT NULL;
