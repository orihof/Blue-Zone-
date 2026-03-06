-- ============================================================
-- Migration 012: Biological Age Score columns on profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS biological_age         NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS biological_age_delta   NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS bio_age_percentile     INTEGER,
  ADD COLUMN IF NOT EXISTS bio_age_calculated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bio_age_confidence     TEXT,
  ADD COLUMN IF NOT EXISTS bio_age_revealed       BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bio_age_drivers        JSONB    DEFAULT '[]';

-- bio_age_drivers shape:
-- [{ factor: string, direction: "positive"|"negative"|"neutral", magnitude: number, detail: string }]
