-- ============================================================
-- Migration 011: Extend profiles table for Athlete Profile page
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url              TEXT,
  ADD COLUMN IF NOT EXISTS tagline                 TEXT,
  ADD COLUMN IF NOT EXISTS location                TEXT,
  ADD COLUMN IF NOT EXISTS prs                     JSONB    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS profile_nudge_dismissed BOOLEAN  DEFAULT FALSE;

-- Supabase Storage bucket for avatars must be created manually:
-- Dashboard → Storage → New bucket → Name: "user-avatars" → Public access: ON
