-- Migration: Add card_data JSONB and protocol_ref_id to protocol_share_cards
-- Reversible: yes
-- Risk: low
-- Rollback: ALTER TABLE protocol_share_cards DROP COLUMN card_data, DROP COLUMN protocol_ref_id;

ALTER TABLE protocol_share_cards
  ADD COLUMN IF NOT EXISTS card_data JSONB,
  ADD COLUMN IF NOT EXISTS protocol_ref_id TEXT;

CREATE INDEX IF NOT EXISTS share_cards_protocol_ref_idx
  ON protocol_share_cards(protocol_ref_id);
