-- migration 005: sports event preparation protocols

CREATE TABLE IF NOT EXISTS sports_protocols (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES nextauth_users(id) ON DELETE CASCADE,
  competition_type      TEXT        NOT NULL,
  event_date            DATE        NOT NULL,
  weeks_to_event        INTEGER     NOT NULL,
  priority_outcome      TEXT        NOT NULL,
  age                   INTEGER     NOT NULL,
  gender                TEXT        NOT NULL,
  experience_level      TEXT        NOT NULL,
  current_injuries      TEXT[]      DEFAULT '{}',
  known_conditions      TEXT[]      DEFAULT '{}',
  medications           TEXT        DEFAULT '',
  stimulant_tolerance   TEXT        NOT NULL,
  budget_value          INTEGER     NOT NULL,
  budget_tier           INTEGER     NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing','ready','failed')),
  payload               JSONB,
  error_message         TEXT,
  protocol_generated_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_protocols_user_id ON sports_protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_sports_protocols_status  ON sports_protocols(status);
