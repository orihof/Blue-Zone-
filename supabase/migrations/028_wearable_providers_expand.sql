-- Migration 028: Expand wearable provider constraint
-- Adds strava, samsung_health, polar to the allowed provider list
-- Next migration: 029

ALTER TABLE wearable_connections
  DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;

ALTER TABLE wearable_connections
  ADD CONSTRAINT wearable_connections_provider_check
  CHECK (provider IN (
    'whoop',
    'oura',
    'garmin',
    'apple_health',
    'lumen',
    'strava',
    'samsung_health',
    'polar'
  ));
