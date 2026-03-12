-- migration 026: add medications array to profiles for general onboarding
-- NOTE: health_conditions already covered by the existing 'conditions TEXT[]' column (migration 014).
-- 'current_medications TEXT' also exists (migration 014) but is free-text; this adds a typed array.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS medications TEXT[] DEFAULT '{}';
