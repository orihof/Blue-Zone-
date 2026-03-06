-- ============================================================
-- Migration 010: Referral Links, Conversions & Training Partners
-- ============================================================

-- Referral links: one row per user, stores unique invite code + stats
CREATE TABLE IF NOT EXISTS referral_links (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL UNIQUE,
  clicks      INTEGER     NOT NULL DEFAULT 0,
  conversions INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_links_user_id_idx ON referral_links(user_id);
CREATE INDEX IF NOT EXISTS referral_links_code_idx    ON referral_links(code);

-- Referral conversions: tracks which new user was referred by whom
CREATE TABLE IF NOT EXISTS referral_conversions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id  UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  referee_id   UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  converted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referee_id)   -- each new user can only have one referrer
);
CREATE INDEX IF NOT EXISTS referral_conversions_referrer_id_idx ON referral_conversions(referrer_id);

-- Training partners: invite-token based partner pairing
CREATE TABLE IF NOT EXISTS training_partners (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  partner_user_id UUID        REFERENCES nextauth_users(id) ON DELETE SET NULL,
  invite_token    TEXT        NOT NULL UNIQUE,
  partner_name    TEXT,
  partner_email   TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','declined')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  accepted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS training_partners_user_id_idx ON training_partners(user_id);
CREATE INDEX IF NOT EXISTS training_partners_token_idx   ON training_partners(invite_token);
