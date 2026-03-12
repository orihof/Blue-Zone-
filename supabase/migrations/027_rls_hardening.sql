-- Migration: Fix broken auth.uid() RLS policy and add consistent block_anon policies
-- Reversible: yes
-- Risk: low
-- Rollback: DROP the new policies; re-create the old "Users read own reports" policy
--           (but it was non-functional — auth.uid() is never set with NextAuth)

-- ============================================================
-- Migration 027: RLS Hardening
-- ============================================================
-- CONTEXT
-- Blue Zone uses NextAuth.js (JWT strategy), NOT Supabase Auth.
-- Supabase's auth.uid() is NEVER set in any request context.
-- All DB access goes through getAdminClient() (service role),
-- which bypasses RLS entirely.
--
-- RLS is enabled as defence-in-depth: if any code path ever
-- uses the anon key or an authenticated (non-service-role)
-- client, these policies deny all access by default.
--
-- This migration:
--   1. Removes the broken "Users read own reports" policy on
--      analysis_reports (it referenced auth.uid(), which returns
--      NULL with NextAuth → silently denied all SELECT access)
--   2. Replaces it with a block_anon policy matching migration 001
--   3. Enables RLS + block_anon policies on all tables that had
--      RLS enabled with no policies, or no RLS at all
-- ============================================================

-- ── 1. Fix analysis_reports ─────────────────────────────────────────────────

-- Remove the broken auth.uid() policy
DROP POLICY IF EXISTS "Users read own reports" ON analysis_reports;

-- Replace with defensive block matching migration 001 pattern
CREATE POLICY block_anon_analysis_reports
  ON analysis_reports FOR ALL USING (false);

-- ── 2. Enable RLS + block_anon on consent tables (migration 024) ────────────
-- These had RLS enabled via schema.sql / migration 024 but no policies defined.

ALTER TABLE consent_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS block_anon_consent_records   ON consent_records;
DROP POLICY IF EXISTS block_anon_consent_audit_log ON consent_audit_log;

CREATE POLICY block_anon_consent_records
  ON consent_records FOR ALL USING (false);

CREATE POLICY block_anon_consent_audit_log
  ON consent_audit_log FOR ALL USING (false);

-- ── 3. Enable RLS + block_anon on legacy tables (schema.sql) ────────────────
-- These had RLS enabled via schema.sql but no CREATE POLICY statements.
-- Using IF NOT EXISTS on ALTER TABLE in case RLS was already enabled.

ALTER TABLE uploads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS block_anon_uploads           ON uploads;
DROP POLICY IF EXISTS block_anon_health_snapshots   ON health_snapshots;
DROP POLICY IF EXISTS block_anon_protocols          ON protocols;
DROP POLICY IF EXISTS block_anon_bookmarks          ON bookmarks;
DROP POLICY IF EXISTS block_anon_checkin_responses   ON checkin_responses;

CREATE POLICY block_anon_uploads
  ON uploads FOR ALL USING (false);

CREATE POLICY block_anon_health_snapshots
  ON health_snapshots FOR ALL USING (false);

CREATE POLICY block_anon_protocols
  ON protocols FOR ALL USING (false);

CREATE POLICY block_anon_bookmarks
  ON bookmarks FOR ALL USING (false);

CREATE POLICY block_anon_checkin_responses
  ON checkin_responses FOR ALL USING (false);

-- ── 4. Enable RLS + block_anon on profiles ──────────────────────────────────
-- profiles was never explicitly RLS-enabled in any migration.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS block_anon_profiles ON profiles;

CREATE POLICY block_anon_profiles
  ON profiles FOR ALL USING (false);

-- ── 5. Enable RLS + block_anon on api_usage ─────────────────────────────────
-- api_usage contains per-user token counts and cost data.

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS block_anon_api_usage ON api_usage;

CREATE POLICY block_anon_api_usage
  ON api_usage FOR ALL USING (false);

-- ── Verification query ──────────────────────────────────────────────────────
-- Run after migration to confirm all policies exist:
--
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
