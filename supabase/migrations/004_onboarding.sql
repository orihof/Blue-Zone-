-- Migration 004: Onboarding state columns on nextauth_users
-- Run in Supabase SQL Editor

ALTER TABLE nextauth_users
  ADD COLUMN IF NOT EXISTS onboarding_goals         TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_wearable_done BOOLEAN DEFAULT FALSE;
