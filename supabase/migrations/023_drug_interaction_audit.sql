-- Migration 023: Drug interaction rules — MD audit
-- Reviewed by: [MD name], [date]

-- ── Schema changes ───────────────────────────────────────────
ALTER TABLE drug_interaction_rules
  ADD COLUMN IF NOT EXISTS evidence_level                   TEXT,
  ADD COLUMN IF NOT EXISTS timing_separation_hours          NUMERIC,
  ADD COLUMN IF NOT EXISTS supplement_dose_threshold_mg     NUMERIC,
  ADD COLUMN IF NOT EXISTS requires_prescriber_notification BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS affected_lab_test                TEXT;

-- ── Add mild to severity constraint ─────────────────────────
ALTER TABLE drug_interaction_rules
  DROP CONSTRAINT IF EXISTS drug_interaction_rules_interaction_severity_check;

ALTER TABLE drug_interaction_rules
  ADD CONSTRAINT drug_interaction_rules_interaction_severity_check
  CHECK (interaction_severity IN (
    'beneficial', 'mild', 'moderate', 'severe', 'contraindicated'
  ));

-- ── Update existing rows ─────────────────────────────────────
UPDATE drug_interaction_rules SET
  interaction_type                 = 'lab_interference',
  affected_lab_test                = 'TSH, Free T4, Free T3',
  supplement_dose_threshold_mg     = 5,
  timing_separation_hours          = NULL,
  evidence_level                   = 'established',
  requires_prescriber_notification = FALSE
WHERE drug_name = 'levothyroxine' AND supplement_name = 'biotin';

UPDATE drug_interaction_rules SET
  mechanism                        = 'EPA and DHA inhibit platelet aggregation and reduce thromboxane A2 production via arachidonic acid metabolism, potentiating warfarin anticoagulant effect. Risk escalates significantly above 3g/day EPA+DHA.',
  recommendation                   = 'Monitor INR at baseline and 4 weeks after starting omega-3. Target INR range 2.0–3.0 for most warfarin indications. Inform prescriber. At doses above 3g/day EPA+DHA, escalate to severe and require prescriber approval.',
  supplement_dose_threshold_mg     = 3000,
  evidence_level                   = 'established',
  requires_prescriber_notification = TRUE
WHERE drug_name = 'warfarin' AND supplement_name = 'omega3';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  requires_prescriber_notification = FALSE
WHERE drug_name = 'statin_class' AND supplement_name = 'coq10';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  requires_prescriber_notification = TRUE
WHERE drug_name = 'ssri_class' AND supplement_name = 'st_johns_wort';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  timing_separation_hours          = 4,
  requires_prescriber_notification = TRUE
WHERE drug_name = 'levothyroxine' AND supplement_name = 'iron';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  timing_separation_hours          = 4,
  requires_prescriber_notification = TRUE
WHERE drug_name = 'levothyroxine' AND supplement_name = 'calcium';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  requires_prescriber_notification = FALSE
WHERE drug_name = 'metformin' AND supplement_name = 'vitamin_b12';

UPDATE drug_interaction_rules SET
  evidence_level                   = 'established',
  timing_separation_hours          = 2,
  requires_prescriber_notification = FALSE
WHERE drug_name = 'tetracycline' AND supplement_name = 'iron';

-- ── Insert new rows ──────────────────────────────────────────
INSERT INTO drug_interaction_rules
  (drug_name, supplement_name, interaction_type, interaction_severity,
   mechanism, recommendation, evidence_level, timing_separation_hours,
   supplement_dose_threshold_mg, requires_prescriber_notification, affected_lab_test)
VALUES
  -- Blood thinners
  ('warfarin', 'vitamin_k',
   'antagonism', 'contraindicated',
   'Vitamin K directly opposes warfarin mechanism by activating clotting factors II, VII, IX, and X. Even moderate changes in dietary or supplemental vitamin K destabilize INR control.',
   'Do not supplement vitamin K without prescriber supervision. Maintain consistent dietary vitamin K intake. Any change requires INR re-monitoring.',
   'established', NULL, 100, TRUE, NULL),

  ('warfarin', 'vitamin_e',
   'additive', 'severe',
   'Vitamin E above 800mg/day inhibits vitamin K-dependent clotting factors and has independent antiplatelet effects, significantly potentiating warfarin anticoagulation.',
   'Avoid vitamin E supplementation above 200mg/day while on warfarin. If continuing, monitor INR closely and inform prescriber.',
   'established', NULL, 800, TRUE, NULL),

  ('warfarin', 'ginkgo_biloba',
   'additive', 'severe',
   'Ginkgo biloba inhibits platelet-activating factor and has antiplatelet properties. Multiple case reports of serious bleeding events with warfarin co-administration.',
   'Do not combine ginkgo biloba with warfarin. Discontinue ginkgo at least 2 weeks before any surgical procedure.',
   'probable', NULL, NULL, TRUE, NULL),

  ('aspirin', 'omega3',
   'additive', 'moderate',
   'Both aspirin and omega-3 fatty acids inhibit platelet aggregation via different mechanisms. Additive antiplatelet effect.',
   'Low-dose aspirin (81mg) with standard fish oil is generally well-tolerated but monitor for increased bruising. Inform prescriber at doses above 2g/day EPA+DHA.',
   'established', NULL, 2000, TRUE, NULL),

  ('apixaban_class', 'omega3',
   'additive', 'moderate',
   'Direct oral anticoagulants combined with high-dose omega-3 increase bleeding risk via additive antiplatelet effects.',
   'Limit omega-3 to standard doses (1–2g/day) while on DOACs. Inform prescriber. Monitor for unusual bruising or bleeding.',
   'probable', NULL, 2000, TRUE, NULL),

  -- Thyroid
  ('levothyroxine', 'magnesium',
   'absorption', 'moderate',
   'Magnesium forms complexes with levothyroxine in the GI tract, reducing thyroid hormone bioavailability.',
   'Take levothyroxine at least 4 hours away from magnesium supplements.',
   'probable', 4, 200, TRUE, NULL),

  ('levothyroxine', 'zinc',
   'absorption', 'moderate',
   'Zinc competes with levothyroxine for GI absorption and may form insoluble complexes, reducing thyroid hormone bioavailability.',
   'Take levothyroxine at least 4 hours away from zinc supplements.',
   'limited', 4, 25, TRUE, NULL),

  ('levothyroxine', 'caffeine',
   'absorption', 'moderate',
   'Caffeine reduces levothyroxine absorption by up to 30% when taken simultaneously, likely through accelerated gastric transit and reduced contact time with intestinal mucosa.',
   'Take levothyroxine with water only, at least 30–60 minutes before coffee or caffeine-containing supplements.',
   'established', 1, 100, TRUE, NULL),

  -- Mental health
  ('ssri_class', '5htp',
   'additive', 'contraindicated',
   '5-HTP is a direct precursor to serotonin. Combined with SSRIs, it can cause serotonin syndrome — a potentially life-threatening condition.',
   'Do not combine 5-HTP with any SSRI. Discontinue 5-HTP before starting SSRI therapy.',
   'probable', NULL, 50, TRUE, NULL),

  ('ssri_class', 'sam_e',
   'additive', 'severe',
   'SAM-e increases serotonin and dopamine synthesis. Combined with SSRIs, additive serotonergic activity creates serotonin syndrome risk.',
   'Avoid SAM-e with SSRIs. If transitioning, allow adequate washout period. Consult prescriber.',
   'probable', NULL, 400, TRUE, NULL),

  ('maoi_class', 'tyrosine',
   'additive', 'contraindicated',
   'MAO inhibitors prevent breakdown of tyramine. High tyrosine supplementation increases tyramine load, risking hypertensive crisis.',
   'Absolutely contraindicated. Do not use tyrosine or high-tyramine supplements with any MAOI.',
   'established', NULL, 500, TRUE, NULL),

  ('maoi_class', 'tryptophan',
   'additive', 'contraindicated',
   'Tryptophan is a serotonin precursor. Combined with MAOIs that prevent serotonin breakdown, this combination can cause fatal serotonin syndrome.',
   'Absolutely contraindicated. Do not combine tryptophan with MAOIs under any circumstances.',
   'established', NULL, 500, TRUE, NULL),

  ('lithium', 'caffeine',
   'pharmacokinetic', 'moderate',
   'Caffeine increases renal excretion of lithium, reducing serum lithium levels. Sudden caffeine cessation can raise lithium to toxic levels.',
   'Maintain consistent caffeine intake while on lithium. Avoid large increases or sudden discontinuation. Monitor lithium levels if caffeine habits change.',
   'established', NULL, 200, TRUE, NULL),

  -- Diabetes / metabolic
  ('metformin', 'magnesium',
   'depletion', 'moderate',
   'Metformin reduces intestinal magnesium absorption over time. Magnesium deficiency in athletes impairs recovery, sleep, and insulin sensitivity.',
   'Supplement magnesium glycinate or malate 200–400mg/day if on metformin long-term. Monitor RBC magnesium annually.',
   'probable', NULL, NULL, FALSE, NULL),

  ('metformin', 'coq10',
   'depletion', 'moderate',
   'Metformin inhibits mitochondrial complex I, reducing endogenous CoQ10 synthesis over time.',
   'Consider CoQ10 100–200mg/day (ubiquinol form) if on long-term metformin. Especially important for athletes experiencing unexplained fatigue.',
   'probable', NULL, NULL, FALSE, NULL),

  ('insulin_class', 'chromium',
   'additive', 'moderate',
   'Chromium potentiates insulin action by enhancing insulin receptor sensitivity. Combined with exogenous insulin, additive glucose-lowering effect increases hypoglycemia risk.',
   'Monitor blood glucose closely if adding chromium while on insulin. Prescriber may need to adjust insulin dose.',
   'probable', NULL, 200, TRUE, NULL),

  ('insulin_class', 'alpha_lipoic_acid',
   'additive', 'moderate',
   'Alpha-lipoic acid has significant insulin-sensitizing effects. Combined with insulin therapy, additive hypoglycemia risk especially relevant in fasted athletes.',
   'Monitor blood glucose when starting ALA with insulin. Start at low dose (100mg) and titrate. Inform prescriber.',
   'established', NULL, 300, TRUE, NULL),

  ('glp1_agonists', 'berberine',
   'additive', 'moderate',
   'Berberine activates AMPK and reduces hepatic glucose production. Combined with GLP-1 agonists, additive glucose-lowering effect may cause hypoglycemia.',
   'Use berberine with caution alongside GLP-1 agonists. Monitor blood glucose. Inform prescriber.',
   'probable', NULL, 500, TRUE, NULL),

  -- Cardiovascular
  ('ace_inhibitors', 'potassium',
   'additive', 'severe',
   'ACE inhibitors reduce aldosterone, raising serum potassium. Additional potassium supplementation can cause dangerous hyperkalemia.',
   'Avoid potassium supplementation above 1g/day while on ACE inhibitors without prescriber guidance. Monitor serum potassium.',
   'established', NULL, 1000, TRUE, NULL),

  ('beta_blockers', 'coq10',
   'depletion', 'beneficial',
   'Beta-blockers reduce endogenous CoQ10 synthesis over time. CoQ10 supplementation may partially offset this depletion and support cardiac energy metabolism.',
   'Consider CoQ10 100–200mg/day (ubiquinol) if on long-term beta-blocker therapy. Generally safe to self-manage.',
   'probable', NULL, NULL, FALSE, NULL),

  ('beta_blockers', 'melatonin',
   'antagonism', 'moderate',
   'Melatonin has vasoconstrictive properties and can raise blood pressure, partially opposing the antihypertensive effect of beta-blockers.',
   'Use melatonin at the lowest effective dose (0.5–1mg) if on beta-blockers. Avoid high-dose melatonin (>5mg). Monitor blood pressure.',
   'probable', NULL, 5, TRUE, NULL),

  ('calcium_channel_blockers', 'magnesium',
   'additive', 'moderate',
   'Magnesium acts as a natural calcium channel blocker. At therapeutic doses, additive effects may cause excessive vasodilation, hypotension, or bradycardia.',
   'Use magnesium at standard doses (200–300mg/day) with calcium channel blockers. Avoid high-dose magnesium (>400mg single dose). Monitor blood pressure.',
   'probable', NULL, 400, TRUE, NULL),

  ('digoxin', 'magnesium',
   'pharmacokinetic', 'severe',
   'Magnesium deficiency increases myocardial sensitivity to digoxin toxicity. High-dose magnesium can reduce digoxin efficacy. Digoxin has a narrow therapeutic window.',
   'Maintain adequate magnesium status on digoxin. Monitor serum magnesium and digoxin levels. Inform prescriber of all magnesium supplementation.',
   'established', NULL, NULL, TRUE, NULL),

  -- Antibiotics
  ('fluoroquinolone_class', 'magnesium',
   'absorption', 'severe',
   'Magnesium chelates fluoroquinolone antibiotics, reducing antibiotic serum concentration by up to 50% and potentially causing treatment failure.',
   'Take fluoroquinolones at least 2 hours before or 6 hours after magnesium supplements for the duration of the antibiotic course.',
   'established', 6, NULL, FALSE, NULL),

  ('fluoroquinolone_class', 'calcium',
   'absorption', 'severe',
   'Calcium chelates fluoroquinolone antibiotics, significantly reducing antibiotic bioavailability.',
   'Take fluoroquinolones at least 2 hours before or 6 hours after calcium supplements or calcium-rich foods.',
   'established', 6, NULL, FALSE, NULL),

  ('fluoroquinolone_class', 'zinc',
   'absorption', 'severe',
   'Zinc chelates fluoroquinolone antibiotics, reducing serum antibiotic concentration and risking treatment failure.',
   'Take fluoroquinolones at least 2 hours before or 6 hours after zinc supplements.',
   'established', 6, NULL, FALSE, NULL),

  ('tetracycline', 'calcium',
   'absorption', 'severe',
   'Calcium chelates tetracycline antibiotics, reducing antibiotic serum concentration by up to 50% and risking treatment failure.',
   'Take calcium at least 2 hours before or 3 hours after tetracycline for the duration of the antibiotic course.',
   'established', 3, NULL, FALSE, NULL),

  ('tetracycline', 'magnesium',
   'absorption', 'severe',
   'Magnesium chelates tetracycline antibiotics via the same divalent cation mechanism as iron and calcium.',
   'Take magnesium at least 2 hours before or 3 hours after tetracycline for the duration of the antibiotic course.',
   'established', 3, NULL, FALSE, NULL),

  -- Immunosuppressants
  ('cyclosporine', 'st_johns_wort',
   'pharmacokinetic', 'contraindicated',
   'St. John''s Wort is a potent inducer of CYP3A4 and P-glycoprotein, dramatically reducing cyclosporine blood levels. Multiple documented cases of acute transplant rejection.',
   'Absolutely contraindicated in transplant patients or anyone on cyclosporine. Discontinue St. John''s Wort immediately. Inform transplant team.',
   'established', NULL, NULL, TRUE, NULL),

  -- Corticosteroids
  ('corticosteroid_class', 'calcium',
   'depletion', 'moderate',
   'Long-term corticosteroid use reduces intestinal calcium absorption and increases renal calcium excretion, accelerating bone density loss.',
   'Supplement calcium 1000–1200mg/day and vitamin D3 1500–2000 IU/day with long-term corticosteroid use. Prescriber should monitor bone density.',
   'established', NULL, NULL, TRUE, NULL),

  ('corticosteroid_class', 'vitamin_d',
   'depletion', 'moderate',
   'Corticosteroids impair vitamin D metabolism and reduce its effectiveness on calcium absorption, compounding bone loss risk.',
   'Supplement vitamin D3 2000–4000 IU/day with long-term corticosteroid use. Monitor serum 25-OH vitamin D levels.',
   'established', NULL, NULL, TRUE, NULL),

  -- PDE5 inhibitors
  ('pde5_inhibitors', 'nitric_oxide_boosters',
   'additive', 'severe',
   'PDE5 inhibitors combined with nitric oxide boosters cause additive vasodilation and can produce severe hypotension. Athlete pre-workout stacks are particularly high risk.',
   'Do not combine high-dose NO boosters with PDE5 inhibitors. Avoid arginine or citrulline-containing pre-workouts while on sildenafil or tadalafil.',
   'established', NULL, 3000, TRUE, NULL);