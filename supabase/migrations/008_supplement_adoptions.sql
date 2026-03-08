-- Migration 008: user supplement adoptions
-- Tracks which supplements a user has "adopted" from their protocols.
-- Used to render protocol event markers on the Trends page.

CREATE TABLE IF NOT EXISTS user_supplement_adoptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  protocol_type   TEXT,                           -- 'sports' | 'goal'
  adopted_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, supplement_name)
);

CREATE INDEX IF NOT EXISTS user_supplement_adoptions_user_idx ON user_supplement_adoptions(user_id);
CREATE INDEX IF NOT EXISTS user_supplement_adoptions_date_idx ON user_supplement_adoptions(user_id, adopted_at);