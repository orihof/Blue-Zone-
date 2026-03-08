-- Migration 020: Clinical biomarker audit
-- MD review completed. Athlete-specific thresholds added.
-- Reviewed by: [MD name], [date]

-- ── Schema changes ───────────────────────────────────────────
ALTER TABLE critical_value_thresholds
  ADD COLUMN IF NOT EXISTS athlete_critical_low     NUMERIC,
  ADD COLUMN IF NOT EXISTS athlete_optimal_low      NUMERIC,
  ADD COLUMN IF NOT EXISTS athlete_optimal_high     NUMERIC,
  ADD COLUMN IF NOT EXISTS athlete_critical_high    NUMERIC,
  ADD COLUMN IF NOT EXISTS sex_adjusted             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS athlete_note             TEXT;

-- ── Update existing rows ─────────────────────────────────────
UPDATE critical_value_thresholds SET
  athlete_critical_high = 200,
  athlete_optimal_high  = 40,
  athlete_note = 'ALT commonly elevated 60–100 U/L post-training from muscle stress, not liver damage. Interpret in context of training load before escalating.'
WHERE marker_name = 'alt';

UPDATE critical_value_thresholds SET
  athlete_critical_low  = 45,
  athlete_optimal_low   = 70,
  athlete_note = 'High protein intake and muscle mass chronically suppress eGFR. An eGFR of 55–70 in a high-training-load athlete may be normal. Consider cystatin C for more accurate kidney function assessment.'
WHERE marker_name = 'egfr';

UPDATE critical_value_thresholds SET
  athlete_critical_low  = 20,
  athlete_optimal_low   = 50,
  athlete_optimal_high  = 200,
  sex_adjusted          = TRUE,
  athlete_note = 'Functional iron deficiency in endurance athletes begins at <50 ng/mL (women) and <70 ng/mL (men), well above the clinical critical_low of 5. Female runners are most at risk. Flag and intervene early — this directly impacts VO2 max and recovery.'
WHERE marker_name = 'ferritin';

UPDATE critical_value_thresholds SET
  athlete_optimal_low   = 72,
  athlete_optimal_high  = 85,
  athlete_note = 'Optimal fasting glucose for longevity athletes is 72–85 mg/dL. Begin monitoring and lifestyle intervention if trending toward 90–99 (pre-diabetes range), well before clinical thresholds are breached.'
WHERE marker_name = 'glucose_fasting';

UPDATE critical_value_thresholds SET
  athlete_critical_low  = 11.5,
  athlete_optimal_low   = 13.5,
  sex_adjusted          = TRUE,
  athlete_note = 'Performance impairment begins at ~12.5 g/dL (women) / ~13.5 g/dL (men), far above the clinical critical_low of 7. Athletes often train through mild anemia attributing symptoms to undertraining.'
WHERE marker_name = 'hemoglobin';

UPDATE critical_value_thresholds SET
  athlete_note = 'Standard critical thresholds apply. Sweating athletes at risk of hypokalemia in ultra-endurance events.'
WHERE marker_name = 'potassium';

UPDATE critical_value_thresholds SET
  athlete_note = 'Exercise-associated hyponatremia (EAH) is a specific risk in ultra-endurance athletes who over-hydrate. Critical_low of 120 is correct; monitor athletes post-event.'
WHERE marker_name = 'sodium';

UPDATE critical_value_thresholds SET
  athlete_note = 'Standard critical thresholds apply. Subclinical hypothyroid (TSH 2.5–4.5) is worth flagging in athletes with unexplained fatigue or poor recovery.'
WHERE marker_name = 'tsh';

-- ── Insert new markers ───────────────────────────────────────
INSERT INTO critical_value_thresholds
  (marker_name, critical_low, critical_high, unit,
   athlete_critical_low, athlete_optimal_low, athlete_optimal_high,
   athlete_critical_high, sex_adjusted, athlete_note,
   immediate_action_text, source)
VALUES
  ('hba1c', NULL, NULL, '%',
   NULL, NULL, 5.4, 6.5, FALSE,
   'Core metabolic health marker. Optimal for longevity athletes is <5.4%. Flag anything above 5.7% for dietary intervention.',
   'Your HbA1c result requires dietary review. Please discuss with your doctor.',
   'MD audit 2024'),
  ('hscrp', NULL, 10.0, 'mg/L',
   NULL, NULL, 1.0, 3.0, FALSE,
   'Distinguish training inflammation from systemic inflammation. Chronically elevated >3 mg/L despite rest periods is a red flag.',
   'Your hsCRP result requires medical review.',
   'MD audit 2024'),
  ('creatinine', NULL, NULL, 'mg/dL',
   NULL, NULL, 1.2, 1.6, TRUE,
   'Pairs with eGFR. Athletes have higher muscle mass; use alongside cystatin C for accurate kidney assessment.',
   'Your creatinine result requires medical review.',
   'MD audit 2024'),
  ('calcium', 6.5, 13.0, 'mg/dL',
   8.0, 8.5, 10.2, 11.0, FALSE,
   'Important for bone health in endurance athletes at risk of stress fractures.',
   'Your calcium result requires immediate medical attention. Please contact your doctor today.',
   'MD audit 2024'),
  ('wbc', 2.0, 30.0, 'x10³/µL',
   3.5, 4.5, 10.0, 12.0, FALSE,
   'Chronically low WBC may indicate overtraining-induced immune suppression. Monitor during heavy training blocks.',
   'Your white blood cell count requires medical review.',
   'MD audit 2024'),
  ('testosterone_total', NULL, NULL, 'ng/dL',
   250, 500, 900, NULL, TRUE,
   'Overtraining syndrome manifests early as testosterone suppression in male athletes. Optimal for performance is 500–900 ng/dL.',
   'Your testosterone result requires medical review.',
   'MD audit 2024'),
  ('cortisol_am', NULL, NULL, 'µg/dL',
   NULL, 10, 18, 25, FALSE,
   'HPA axis dysregulation from chronic training stress. Low AM cortisol (<10) may indicate adrenal fatigue pattern.',
   'Your cortisol result requires medical review.',
   'MD audit 2024'),
  ('magnesium_rbc', NULL, NULL, 'mg/dL',
   4.0, 5.2, 6.8, NULL, FALSE,
   'RBC magnesium (not serum) is the accurate measure. Athletes deplete magnesium heavily through sweat. Affects sleep, recovery, and muscle function.',
   'Your RBC magnesium result requires review.',
   'MD audit 2024'),
  ('vitamin_d', NULL, NULL, 'ng/mL',
   20, 40, 70, 100, FALSE,
   'Outdoor athletes frequently assume adequacy — blood levels often tell a different story. Optimal for longevity and immune function is 40–70 ng/mL.',
   'Your Vitamin D result requires review.',
   'MD audit 2024'),
  ('uric_acid', NULL, NULL, 'mg/dL',
   NULL, NULL, 6.0, 8.0, FALSE,
   'Elevated in athletes performing intense anaerobic work. Associated with cardiovascular risk and gout. Flag >7 mg/dL for dietary review.',
   'Your uric acid result requires dietary review.',
   'MD audit 2024'),
  ('homocysteine', NULL, NULL, 'µmol/L',
   NULL, NULL, 9.0, 15.0, FALSE,
   'Cardiovascular and cognitive risk marker. Longevity-optimal is <9 µmol/L. Elevated homocysteine responds well to B12/folate/B6 supplementation.',
   'Your homocysteine result requires review.',
   'MD audit 2024'),
  ('vitamin_b12', NULL, NULL, 'pg/mL',
   200, 600, 1000, NULL, FALSE,
   'Serum B12 >600 is optimal for athletes and longevity. Low B12 commonly causes fatigue and neuropathy.',
   'Your B12 result requires review.',
   'MD audit 2024'),
  ('igf1', NULL, NULL, 'ng/mL',
   NULL, 100, 200, 300, FALSE,
   'Longevity marker. Chronically elevated IGF-1 (>200) is associated with mTOR activation and accelerated aging. Low IGF-1 impairs recovery.',
   'Your IGF-1 result requires medical review.',
   'MD audit 2024'),
  ('apob', NULL, NULL, 'mg/dL',
   NULL, NULL, 90, 130, FALSE,
   'Superior cardiovascular risk marker vs. LDL-C alone. Longevity target is <90 mg/dL.',
   'Your ApoB result requires cardiovascular review with your doctor.',
   'MD audit 2024')
ON CONFLICT (marker_name) DO NOTHING;