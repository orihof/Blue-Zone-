-- migration 006: add race_distance to sports_protocols
-- Populated only when competition_type = 'running_race'; NULL for all other sports.

ALTER TABLE sports_protocols
  ADD COLUMN IF NOT EXISTS race_distance TEXT;
