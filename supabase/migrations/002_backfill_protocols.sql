-- Migration 002: backfill protocols table with columns added after initial deploy
-- Safe to run multiple times (IF NOT EXISTS / EXCEPTION guards).

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processing';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'demo';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS trigger_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS share_token TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS share_token_expires_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS error_message TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Add CHECK constraints only if they don't already exist
DO $$ BEGIN
  ALTER TABLE protocols ADD CONSTRAINT protocols_status_check
    CHECK (status IN ('processing', 'ready', 'failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE protocols ADD CONSTRAINT protocols_mode_check
    CHECK (mode IN ('personal', 'demo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
