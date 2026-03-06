-- Migration 007: Health goal prep pack protocols table
-- Stores one row per goal prep pack generation (8 categories: weight_loss, anti_aging, performance, cognition, sleep, hair, mood, sexual_health).

CREATE TABLE IF NOT EXISTS goal_protocols (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  category              TEXT        NOT NULL,
  age                   INTEGER     NOT NULL,
  gender                TEXT        NOT NULL,
  known_conditions      TEXT[]      DEFAULT '{}',
  medications           TEXT        DEFAULT '',
  stimulant_tolerance   TEXT        NOT NULL,
  budget_value          INTEGER     NOT NULL,
  budget_tier           INTEGER     NOT NULL CHECK (budget_tier BETWEEN 1 AND 4),
  category_data         JSONB       DEFAULT '{}',
  status                TEXT        NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'ready', 'failed')),
  payload               JSONB,
  error_message         TEXT,
  protocol_generated_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS goal_protocols_user_id_idx  ON goal_protocols(user_id);
CREATE INDEX IF NOT EXISTS goal_protocols_category_idx ON goal_protocols(category);
CREATE INDEX IF NOT EXISTS goal_protocols_status_idx   ON goal_protocols(status);
