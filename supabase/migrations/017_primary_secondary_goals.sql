-- migration 017: primary goal, secondary goal unlock, onboarding completion
-- Run in Supabase SQL Editor after migration 016.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_goal              TEXT,
  ADD COLUMN IF NOT EXISTS secondary_goal            TEXT,
  ADD COLUMN IF NOT EXISTS secondary_goal_set_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at   TIMESTAMPTZ;
