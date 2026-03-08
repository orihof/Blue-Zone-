-- Migration 021: Pregnancy safety rules — MD audit
-- Reviewed by: [MD name], [date]

-- ── Schema changes ───────────────────────────────────────────
ALTER TABLE pregnancy_safety_rules
  ADD COLUMN IF NOT EXISTS max_dose_value        NUMERIC,
  ADD COLUMN IF NOT EXISTS max_dose_unit         TEXT,
  ADD COLUMN IF NOT EXISTS recommended_dose      NUMERIC,
  ADD COLUMN IF NOT EXISTS trimester_dose_varies BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS athlete_note          TEXT;

-- ── Update existing rows ─────────────────────────────────────
UPDATE pregnancy_safety_rules SET
  applicable_statuses = ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
  athlete_note = 'Adaptogens_group excludes ashwagandha (separate hard_block). Rhodiola has evidence for uterine stimulation and should be reviewed for upgrade to hard_block. Maca and eleuthero have insufficient human safety data across all trimesters, not just the first.'
WHERE product_category = 'adaptogens_group';

UPDATE pregnancy_safety_rules SET
  applicable_statuses = ARRAY['first_trimester','second_trimester','third_trimester','breastfeeding'],
  block_reason = 'Exogenous melatonin has limited safety data throughout human pregnancy and affects fetal circadian programming. Also transfers into breast milk.'
WHERE product_category = 'melatonin_group';

UPDATE pregnancy_safety_rules SET
  evidence_level  = 'probable',
  max_dose_value  = 2000,
  max_dose_unit   = 'mg/day',
  block_reason    = 'Supplemental Vitamin C above 2000mg/day is associated with increased miscarriage risk. Standard prenatal doses (85–120mg/day) are safe and recommended.'
WHERE product_category = 'vit_c_group';

UPDATE pregnancy_safety_rules SET
  max_dose_value        = 45,
  max_dose_unit         = 'mg/day',
  trimester_dose_varies = TRUE,
  block_reason          = 'Iron needs increase during pregnancy (recommended 27mg/day in 2nd and 3rd trimester). Excessive iron above 45mg/day is associated with oxidative stress and GI toxicity. Dose varies by trimester — flag for clinical review if supplementing above recommended levels.'
WHERE product_category = 'iron_group';

-- ── Insert new rows ──────────────────────────────────────────
INSERT INTO pregnancy_safety_rules
  (product_category, rule_type, applicable_statuses, block_reason,
   user_facing_message, evidence_level, max_dose_value, max_dose_unit, trimester_dose_varies)
VALUES
  ('bpc157_peptides', 'hard_block',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'BPC-157 and similar research peptides have zero human pregnancy safety data. Categorically block — no dose is considered safe during pregnancy or while trying to conceive.',
   'BPC-157 is not recommended during pregnancy or when trying to conceive due to the absence of human safety data.',
   'theoretical', NULL, NULL, FALSE),

  ('gh_peptides', 'hard_block',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'CJC-1295, Ipamorelin, and other growth hormone axis peptides have no human pregnancy safety data. Growth hormone axis manipulation carries high theoretical risk to fetal development.',
   'Growth hormone peptides are not recommended during pregnancy or when trying to conceive.',
   'theoretical', NULL, NULL, FALSE),

  ('st_johns_wort', 'hard_block',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
   'St. John''s Wort is a documented uterine stimulant and induces CYP450 enzymes, potentially reducing efficacy of prenatal medications.',
   'St. John''s Wort is not recommended during pregnancy or when trying to conceive due to potential uterine effects.',
   'probable', NULL, NULL, FALSE),

  ('caffeine', 'dose_limit',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'Caffeine above 200mg/day is associated with increased miscarriage and low birth weight risk. This is the universally accepted clinical cap (NHS, ACOG).',
   'Caffeine has been capped at 200mg/day for pregnancy safety.',
   'established', 200, 'mg/day', FALSE),

  ('vit_d_high_dose', 'dose_limit',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'Vitamin D above 4000 IU/day during pregnancy carries hypercalcemia risk. Standard prenatal D3 (600–2000 IU/day) is safe and recommended.',
   'High-dose Vitamin D has been capped at 4000 IU/day for pregnancy safety.',
   'established', 4000, 'IU/day', FALSE),

  ('creatine', 'monitor',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'Creatine is commonly used by athletes but has limited human pregnancy safety data. Some animal studies suggest potential neuroprotective benefit for the fetus, but no human RCT data exists. Flag for discussion with healthcare provider.',
   'Creatine has limited pregnancy safety data. Please discuss use with your OB or midwife before continuing.',
   'theoretical', NULL, NULL, FALSE),

  ('zinc_high_dose', 'dose_limit',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester','breastfeeding'],
   'Zinc above 40mg/day competes with copper absorption and may cause fetal copper deficiency. Standard prenatal zinc (11–13mg/day) is safe.',
   'High-dose zinc has been capped at 40mg/day for pregnancy safety.',
   'established', 40, 'mg/day', FALSE),

  ('collagen_supplements', 'monitor',
   ARRAY['first_trimester','second_trimester','third_trimester','breastfeeding'],
   'High-dose collagen and glycine supplements are widely used in longevity stacks but have no dedicated human pregnancy safety data.',
   'Collagen supplements have limited pregnancy safety data. Please discuss with your OB or midwife before continuing.',
   'theoretical', NULL, NULL, FALSE),

  ('beta_alanine', 'dose_limit',
   ARRAY['first_trimester','second_trimester','third_trimester'],
   'Beta-alanine has no fetal safety studies. High-dose supplementation is not recommended during pregnancy.',
   'Beta-alanine dose has been reduced for pregnancy safety. Consider pausing until postpartum.',
   'theoretical', 2, 'g/day', FALSE),

  ('rhodiola', 'hard_block',
   ARRAY['trying_to_conceive','first_trimester','second_trimester','third_trimester'],
   'Rhodiola rosea has evidence for uterine stimulation. Should be treated as a hard block during pregnancy and while trying to conceive.',
   'Rhodiola is not recommended during pregnancy or when trying to conceive due to potential uterine effects.',
   'probable', NULL, NULL, FALSE);