-- Onboarding funnel analytics
-- Run in Supabase SQL Editor

-- 1. Step completion counts
SELECT
  onboarding_step,
  COUNT(*) as user_count
FROM profiles
GROUP BY onboarding_step
ORDER BY
  CASE onboarding_step
    WHEN 'name' THEN 1
    WHEN 'consent' THEN 2
    WHEN 'goals' THEN 3
    WHEN 'personal_info' THEN 4
    WHEN 'blood_test' THEN 5
    WHEN 'wearables' THEN 6
    WHEN 'analysis' THEN 7
    WHEN 'done' THEN 8
    WHEN 'data' THEN 8
    ELSE 9
  END;

-- 2. Goal distribution
SELECT
  primary_goal,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM profiles
WHERE primary_goal IS NOT NULL
GROUP BY primary_goal
ORDER BY user_count DESC;

-- 3. Completion timing (requires onboarding_completed_at and created_at)
SELECT
  AVG(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at)) / 60) as avg_minutes_to_complete,
  MIN(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at)) / 60) as min_minutes,
  MAX(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at)) / 60) as max_minutes,
  COUNT(*) as completed_count
FROM profiles
WHERE onboarding_completed_at IS NOT NULL AND created_at IS NOT NULL;

-- 4. Drop-off by step (users who started but never advanced past each step)
SELECT
  step_name,
  action,
  COUNT(*) as event_count
FROM onboarding_events
GROUP BY step_name, action
ORDER BY step_name, action;

-- 5. Pipeline failure rate
SELECT
  action,
  COUNT(*) as count
FROM onboarding_events
WHERE step_name = 'analysis'
GROUP BY action;

-- 6. Hourly completion distribution
SELECT
  EXTRACT(HOUR FROM onboarding_completed_at) as hour_of_day,
  COUNT(*) as completions
FROM profiles
WHERE onboarding_completed_at IS NOT NULL
GROUP BY hour_of_day
ORDER BY hour_of_day;
