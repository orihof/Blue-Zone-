-- ============================================================
-- Migration 003 — Wearable OAuth connections
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whoop', 'oura', 'garmin', 'apple_health', 'lumen')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,        -- Unix timestamp (seconds)
  scope TEXT,
  provider_user_id TEXT,    -- Provider's own user ID
  raw_data JSONB,           -- Raw token response for future reference
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_id ON wearable_connections(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_wearable_connections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_wearable_connections_updated_at
BEFORE UPDATE ON wearable_connections
FOR EACH ROW EXECUTE FUNCTION update_wearable_connections_updated_at();
