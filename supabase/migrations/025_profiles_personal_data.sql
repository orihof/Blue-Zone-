-- migration 025: add personal data fields to profiles for new onboarding flow
-- Collected in the "Profile" step: age, biological sex, current injuries/sensitivities.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS age              INTEGER,
  ADD COLUMN IF NOT EXISTS gender           TEXT,
  ADD COLUMN IF NOT EXISTS current_injuries TEXT[] DEFAULT '{}';
