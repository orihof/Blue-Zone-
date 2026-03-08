-- Migration 022: Nutrient competition rules — MD audit
-- Reviewed by: [MD name], [date]

-- ── Schema changes ───────────────────────────────────────────
ALTER TABLE nutrient_competition_rules
  ADD COLUMN IF NOT EXISTS evidence_level            TEXT,
  ADD COLUMN IF NOT EXISTS timing_separation_hours   NUMERIC,
  ADD COLUMN IF NOT EXISTS is_bidirectional          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS interaction_direction     TEXT,
  ADD COLUMN IF NOT EXISTS clinical_significance     TEXT;

-- ── Drop and replace competition_type constraint ─────────────
ALTER TABLE nutrient_competition_rules
  DROP CONSTRAINT IF EXISTS nutrient_competition_rules_competition_type_check;

ALTER TABLE nutrient_competition_rules
  ADD CONSTRAINT nutrient_competition_rules_competition_type_check
  CHECK (competition_type IN (
    'transporter_competition',
    'binding_inhibition',
    'metabolic_depletion',
    'receptor_competition',
    'synergy_dependency',
    'synergy_enhancer',
    'antagonism',
    'oxidative_interference',
    'absorption_inhibition',
    'absorption_inhibitor',
    'masking_interaction'
  ));

-- ── Update existing rows ─────────────────────────────────────
UPDATE nutrient_competition_rules SET
  absorption_impact_pct   = 45,
  is_bidirectional        = TRUE,
  interaction_direction   = 'bidirectional',
  timing_separation_hours = 2,
  evidence_level          = 'established',
  clinical_significance   = 'high'
WHERE nutrient_a = 'Iron' AND nutrient_b = 'Zinc';

UPDATE nutrient_competition_rules SET
  competition_threshold_a_mg = 600,
  absorption_impact_pct      = 30,
  timing_separation_hours    = 2,
  evidence_level             = 'established',
  clinical_significance      = 'moderate'
WHERE nutrient_a = 'Calcium' AND nutrient_b = 'Zinc';

UPDATE nutrient_competition_rules SET
  timing_separation_hours = 2,
  evidence_level          = 'established',
  clinical_significance   = 'high',
  interaction_direction   = 'a_affects_b'
WHERE nutrient_a = 'Calcium' AND nutrient_b = 'Iron';

UPDATE nutrient_competition_rules SET
  timing_separation_hours = 2,
  evidence_level          = 'established',
  clinical_significance   = 'high',
  interaction_direction   = 'a_affects_b'
WHERE nutrient_a = 'Zinc' AND nutrient_b = 'Copper';

UPDATE nutrient_competition_rules SET
  competition_threshold_a_mg = 400,
  competition_threshold_b_mg = 600,
  timing_separation_hours    = 2,
  evidence_level             = 'probable',
  clinical_significance      = 'moderate',
  interaction_direction      = 'b_affects_a',
  is_bidirectional           = TRUE
WHERE nutrient_a = 'Magnesium' AND nutrient_b = 'Calcium';

-- ── Insert new rows ──────────────────────────────────────────
INSERT INTO nutrient_competition_rules
  (nutrient_a, nutrient_b, competition_type, affected_nutrient,
   absorption_impact_pct, competition_threshold_a_mg, competition_threshold_b_mg,
   mitigation_strategy, evidence_level, timing_separation_hours,
   is_bidirectional, interaction_direction, clinical_significance)
VALUES
  ('Zinc', 'Iron',
   'transporter_competition', 'Iron', 40,
   40, NULL,
   'High-dose zinc above 40mg competes with iron absorption. Take zinc and iron at least 2 hours apart.',
   'established', 2, TRUE, 'bidirectional', 'high'),

  ('Calcium', 'Magnesium',
   'transporter_competition', 'Magnesium', 25,
   600, NULL,
   'High calcium intake suppresses magnesium absorption. Split calcium and magnesium across different meals.',
   'probable', 2, TRUE, 'bidirectional', 'moderate'),

  ('Copper', 'Zinc',
   'transporter_competition', 'Zinc', 30,
   5, NULL,
   'High copper intake can suppress zinc absorption. Maintain a balanced copper:zinc ratio. Avoid high-dose copper supplementation without zinc monitoring.',
   'established', 2, TRUE, 'bidirectional', 'moderate'),

  ('Vitamin_D', 'Vitamin_K2',
   'synergy_dependency', 'Vitamin_K2', 35,
   2000, NULL,
   'High-dose D3 increases calcium mobilization and depletes K2. Without K2, calcium is deposited in arteries rather than bones. Always co-supplement K2 (100–200mcg MK-7) with D3 above 2000 IU/day.',
   'probable', NULL, FALSE, 'a_affects_b', 'critical'),

  ('Vitamin_E', 'Vitamin_K',
   'antagonism', 'Vitamin_K', 50,
   800, NULL,
   'High-dose Vitamin E (above 800mg/day) antagonizes Vitamin K activity, increasing bleeding risk. Avoid combining high-dose E with blood thinners or other anticoagulants.',
   'established', NULL, FALSE, 'a_affects_b', 'high'),

  ('Iron', 'Vitamin_E',
   'oxidative_interference', 'Vitamin_E', 30,
   25, NULL,
   'Free iron catalyzes oxidation of Vitamin E, reducing its antioxidant efficacy. Take iron and Vitamin E at least 2 hours apart.',
   'probable', 2, FALSE, 'a_affects_b', 'moderate'),

  ('Vitamin_C', 'Iron',
   'synergy_enhancer', 'Iron', -50,
   200, NULL,
   'Vitamin C dramatically enhances non-heme iron absorption (up to 50% increase). Take iron with Vitamin C-containing food or a 200mg+ Vitamin C supplement to maximize absorption. Note: impact_pct is negative to indicate enhancement not inhibition.',
   'established', NULL, FALSE, 'a_affects_b', 'high'),

  ('Folate', 'Zinc',
   'absorption_inhibition', 'Zinc', 25,
   800, NULL,
   'High synthetic folic acid supplementation (above 800mcg) impairs zinc absorption. Use methylfolate instead of folic acid where possible, or separate timing.',
   'probable', 2, FALSE, 'a_affects_b', 'moderate'),

  ('Folate', 'B12',
   'masking_interaction', 'B12', NULL,
   800, NULL,
   'High folate supplementation can mask B12 deficiency in blood tests by correcting megaloblastic anemia while neurological damage continues. Always test B12 when supplementing high-dose folate. No dose separation applies — this is a lab interpretation flag.',
   'established', NULL, FALSE, 'a_affects_b', 'critical'),

  ('Magnesium', 'Zinc',
   'transporter_competition', 'Zinc', 20,
   400, NULL,
   'High-dose magnesium competes with zinc at intestinal transporters. Keep magnesium supplementation within 300–400mg per dose and separate from zinc.',
   'limited', 2, FALSE, 'a_affects_b', 'low'),

  ('Calcium', 'Vitamin_D',
   'synergy_dependency', 'Calcium', 60,
   1000, NULL,
   'Calcium absorption is highly dependent on Vitamin D status. Without adequate D3 (>30ng/mL serum), calcium supplementation is largely wasted. Ensure Vitamin D sufficiency before high-dose calcium supplementation.',
   'established', NULL, FALSE, 'b_affects_a', 'high'),

  ('Iodine', 'Selenium',
   'synergy_dependency', 'Iodine', 40,
   150, NULL,
   'Selenium is required for thyroid hormone conversion (T4 to T3). High iodine supplementation without adequate selenium can worsen thyroid function. Ensure selenium adequacy (100–200mcg/day) when supplementing iodine.',
   'established', NULL, FALSE, 'b_affects_a', 'high'),

  ('Iron', 'Tannins_Coffee',
   'absorption_inhibitor', 'Iron', 60,
   25, NULL,
   'Tannins in coffee, tea, and red wine reduce non-heme iron absorption by up to 60%. Athletes with low ferritin should avoid coffee or tea within 1 hour before or after iron supplementation or iron-rich meals.',
   'established', 1, FALSE, 'a_affects_b', 'high'),

  ('Zinc', 'Calcium',
   'transporter_competition', 'Calcium', 15,
   40, NULL,
   'High-dose zinc has mild inhibitory effect on calcium absorption. Less clinically significant than the reverse direction. Monitor in athletes supplementing therapeutic zinc doses above 40mg.',
   'limited', 2, TRUE, 'bidirectional', 'low');