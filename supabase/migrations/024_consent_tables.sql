-- ============================================================
-- Migration 024: Consent Tables
-- ============================================================
-- Creates consent_records and consent_audit_log.
-- All FKs reference nextauth_users(id) — never auth.users(id).
-- Safe to run multiple times (IF NOT EXISTS throughout).
--
-- consent_audit_log supports two insert patterns:
--   1. ConsentService.recordConsent  → action, previous_state, new_state, changed_by
--   2. sendConsentConfirmationEmail  → event_type, new_state
-- Both columns are nullable so either pattern can omit the other's field.
-- ============================================================

-- ── consent_records ──────────────────────────────────────────────────────────
-- Append-only; only one row per user has is_current = true.

CREATE TABLE IF NOT EXISTS consent_records (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  tier1_service         BOOLEAN     NOT NULL DEFAULT true,
  tier2_research        BOOLEAN     NOT NULL DEFAULT false,
  tier2_research_types  TEXT[]      NOT NULL DEFAULT '{}',
  tier3_commercial      BOOLEAN     NOT NULL DEFAULT false,
  tier3_partners        JSONB       NOT NULL DEFAULT '[]',
  consent_version       TEXT        NOT NULL DEFAULT '1.0',
  policy_version        TEXT        NOT NULL DEFAULT '1.0',
  terms_version         TEXT        NOT NULL DEFAULT '1.0',
  consent_method        TEXT        NOT NULL,
  ip_address            TEXT,
  user_agent            TEXT,
  is_current            BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT consent_method_check CHECK (consent_method IN (
    'explicit_checkbox',
    'onboarding_flow',
    'onboarding_modal',
    'settings_page',
    'api',
    'import',
    'policy_update_acknowledgment'
  ))
);

CREATE INDEX IF NOT EXISTS consent_records_user_id_idx    ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS consent_records_is_current_idx ON consent_records(user_id, is_current)
  WHERE is_current = true;

-- ── consent_audit_log ────────────────────────────────────────────────────────
-- Append-only audit trail — one row per consent change or email event.
--
-- action     — set by ConsentService.recordConsent ('created' | 'updated')
-- event_type — set by sendConsentConfirmationEmail ('confirmation_email_sent' | 'confirmation_email_failed')
-- Both are nullable so each caller can omit the other's field.

CREATE TABLE IF NOT EXISTS consent_audit_log (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  consent_id      UUID        NOT NULL REFERENCES consent_records(id) ON DELETE CASCADE,
  action          TEXT                 CHECK (action IN ('created', 'updated')),
  event_type      TEXT,
  previous_state  JSONB,
  new_state       JSONB       NOT NULL,
  changed_by      UUID        REFERENCES nextauth_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_audit_log_user_id_idx    ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS consent_audit_log_consent_id_idx ON consent_audit_log(consent_id);
