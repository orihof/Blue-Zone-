-- Migration: Add ON DELETE SET NULL to consent_audit_log.changed_by FK
-- Reversible: yes
-- Risk: low
-- Rollback: DROP CONSTRAINT consent_audit_log_changed_by_fkey_new; ADD CONSTRAINT consent_audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES nextauth_users(id);

-- The original FK on consent_audit_log.changed_by has no ON DELETE action,
-- defaulting to NO ACTION. This blocks deletion of a nextauth_users row
-- if any audit log entry references that user as the changer.
-- Fix: replace with ON DELETE SET NULL so user deletion cascades cleanly
-- while preserving the audit log row (changed_by becomes NULL = "deleted user").

ALTER TABLE consent_audit_log
  DROP CONSTRAINT IF EXISTS consent_audit_log_changed_by_fkey;

ALTER TABLE consent_audit_log
  ADD CONSTRAINT consent_audit_log_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES nextauth_users(id) ON DELETE SET NULL;
