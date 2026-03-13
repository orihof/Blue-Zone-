-- Reset test user for onboarding flow testing
-- Run in Supabase SQL Editor before each full onboarding test
-- WARNING: Destructive — only run against test accounts

-- Replace this UUID with your test user ID
DO $$
DECLARE
  test_user_id UUID := '6a0bc12d-0a06-4961-a5ac-97071fc3c7ad';
BEGIN
  -- Reset onboarding step and all profile flags
  UPDATE profiles SET
    onboarding_step = 'name',
    name = NULL,
    primary_goal = NULL,
    age = NULL,
    biological_sex = NULL,
    height_cm = NULL,
    weight_kg = NULL,
    activity_level = NULL,
    is_pregnant = NULL,
    pregnancy_question_declined = FALSE,
    pregnancy_safe_mode = FALSE,
    analysis_in_progress = FALSE,
    has_onboarding_data = TRUE,
    use_sex_neutral_ranges = FALSE,
    notify_by_email = FALSE,
    onboarding_completed_at = NULL,
    current_injuries = NULL,
    current_medications = NULL,
    current_supplements = NULL,
    conditions = NULL
  WHERE id = test_user_id;

  -- Delete related onboarding data
  DELETE FROM consent_records WHERE user_id = test_user_id;
  DELETE FROM onboarding_events WHERE user_id = test_user_id;
  DELETE FROM protocols WHERE user_id = test_user_id;
  DELETE FROM push_subscriptions WHERE user_id = test_user_id;

  RAISE NOTICE 'Test user reset complete. onboarding_step = name';
END $$;

-- Verify reset
SELECT id, onboarding_step, name, primary_goal, analysis_in_progress, onboarding_completed_at
FROM profiles
WHERE id = '6a0bc12d-0a06-4961-a5ac-97071fc3c7ad';
