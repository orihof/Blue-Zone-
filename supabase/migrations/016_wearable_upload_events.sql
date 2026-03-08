-- migration 016: wearable upload event tracking + profile freshness columns
-- Run in Supabase SQL Editor after migration 015.

-- ── New table: wearable_upload_events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wearable_upload_events (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  device_type      TEXT NOT NULL,              -- 'apple_health' | 'samsung_health'
  scenario         TEXT NOT NULL,              -- 'onboarding_baseline' | 'quarterly_refresh' | 'user_triggered_event'
  trigger_reason   TEXT,                       -- NULL unless scenario = 'user_triggered_event'
  is_first_upload  BOOLEAN DEFAULT FALSE,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wearable_upload_events_user_id_idx ON wearable_upload_events(user_id);

-- ── profiles additions ────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS baseline_established_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_wearable_upload_at  TIMESTAMPTZ;
