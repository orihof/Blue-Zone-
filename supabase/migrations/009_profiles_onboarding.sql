-- migration 009: user onboarding profiles
-- stores name, primary_goal, and current onboarding step

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES nextauth_users(id) ON DELETE CASCADE,
  name            TEXT,
  primary_goal    TEXT,
  onboarding_step TEXT NOT NULL DEFAULT 'name',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();
