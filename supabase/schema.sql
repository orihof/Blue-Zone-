-- ============================================================
-- Blue Zone — Complete Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ---- NextAuth adapter tables --------------------------------

CREATE TABLE IF NOT EXISTS nextauth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'clinic')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nextauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS nextauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS nextauth_verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ---- Health data tables -------------------------------------

CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'processing', 'done', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('blood_test', 'apple_health', 'whoop', 'garmin', 'oura', 'manual')),
  date DATE,
  raw_data JSONB,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biomarkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES health_snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('normal', 'low', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  mode TEXT NOT NULL DEFAULT 'demo' CHECK (mode IN ('personal', 'demo')),
  selected_age INTEGER NOT NULL CHECK (selected_age BETWEEN 23 AND 60),
  goals TEXT[] NOT NULL DEFAULT '{}',
  budget TEXT NOT NULL DEFAULT 'medium' CHECK (budget IN ('low', 'medium', 'high')),
  preferences JSONB NOT NULL DEFAULT '{}',
  payload JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  trigger_reason TEXT,
  share_token TEXT UNIQUE,
  share_token_expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES protocols(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, item_id, category)
);

CREATE TABLE IF NOT EXISTS checkin_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES protocols(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL,
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---- Indexes ------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_user_id ON health_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_created_at ON health_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biomarkers_snapshot_id ON biomarkers(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_biomarkers_user_id ON biomarkers(user_id);
CREATE INDEX IF NOT EXISTS idx_protocols_user_id ON protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_protocols_created_at ON protocols(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_protocol_id ON bookmarks(protocol_id);
CREATE INDEX IF NOT EXISTS idx_checkin_responses_user_id ON checkin_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_responses_protocol_id ON checkin_responses(protocol_id);

-- ---- Row Level Security -------------------------------------
-- NOTE: Service role key bypasses RLS. These policies protect anon key access.
-- Since NextAuth (not Supabase Auth) manages sessions, auth.uid() is NOT set.
-- All privileged access goes through server-side route handlers using the service role key.

ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_responses ENABLE ROW LEVEL SECURITY;

-- No anon policies needed — all access is via service role on the server.

-- ---- Storage ------------------------------------------------
-- Create "health-files" bucket in Supabase Dashboard:
--   Storage → New Bucket → Name: health-files → Private (recommended)
-- Service role key is used server-side to generate signed upload URLs.
