-- migration 015: per-stage token detail + depth/completeness columns for api_usage
-- Run in Supabase SQL Editor after migration 014.

ALTER TABLE api_usage
  ADD COLUMN IF NOT EXISTS stage_2_input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS stage_2_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS stage_3_input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS stage_3_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS depth_level           TEXT,
  ADD COLUMN IF NOT EXISTS data_completeness     NUMERIC(5,4);

-- Monthly cost / usage admin query:
-- SELECT
--   COUNT(*)               AS total_analyses,
--   AVG(cost_usd)          AS avg_cost_per_analysis,
--   SUM(cost_usd)          AS total_spend,
--   AVG(duration_ms)       AS avg_duration_ms,
--   AVG(data_completeness) AS avg_data_completeness
-- FROM api_usage
-- WHERE endpoint = '/api/analysis/generate'
--   AND created_at > NOW() - INTERVAL '30 days';
