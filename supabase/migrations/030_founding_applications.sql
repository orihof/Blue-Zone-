-- Migration: Create founding_applications table for pre-auth cohort signup
-- Reversible: yes
-- Risk: low
-- Rollback: DROP TABLE founding_applications;

CREATE TABLE founding_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  athlete_type TEXT NOT NULL,
  wearables TEXT[] DEFAULT '{}',
  blood_sources TEXT[] DEFAULT '{}',
  primary_goal TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'waitlisted', 'declined')),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_founding_applications_status
  ON founding_applications(status);
CREATE INDEX idx_founding_applications_email
  ON founding_applications(email);

ALTER TABLE founding_applications ENABLE ROW LEVEL SECURITY;

-- No public access — all writes go through getAdminClient() service role
CREATE POLICY "Service role full access on founding_applications"
  ON founding_applications
  FOR ALL
  USING (true)
  WITH CHECK (true);
