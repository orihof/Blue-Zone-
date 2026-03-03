/// lib/recommendations/generate.ts

export type BudgetTier = "low" | "medium" | "high";
export type Goal =
  | "energy"
  | "sleep"
  | "focus"
  | "strength"
  | "fat_loss"
  | "recovery"
  | "hormones"
  | "longevity";

export interface Preferences {
  vegan?: boolean;
  caffeineFree?: boolean;
  noFishOil?: boolean;
}

export interface Supplement {
  id: string;
  title: string;
  rationale: string;
  dosage: string;
  tags: string[];
  iHerbUrl: string;
  amazonUrl: string;
  budget: BudgetTier[];
}

export interface Oil {
  id: string;
  title: string;
  rationale: string;
  usage: string;
  tags: string[];
  amazonUrl: string;
}

export interface Appliance {
  id: string;
  title: string;
  rationale: string;
  tags: string[];
  amazonUrl: string;
  budget: BudgetTier[];
}

export interface Clinic {
  id: string;
  name: string;
  specialty: string;
  address: string;
  rating: number;
  distance: string;
  googleMapsUrl: string;
}

export interface ProtocolPayload {
  supplements: Supplement[];
  oils: Oil[];
  appliances: Appliance[];
  clinics: Clinic[];
}

const SUPPLEMENT_DB: Supplement[] = [
  {
    id: "vitamin-d3",
    title: "Vitamin D3 + K2",
    rationale:
      "Foundational for immune function, bone density, and mood regulation. Most adults test deficient, particularly those with limited sun exposure.",
    dosage: "2,000–5,000 IU D3 with 100 mcg K2 daily with a fatty meal",
    tags: ["immune", "bone", "mood"],
    iHerbUrl: "https://www.iherb.com/search?kw=vitamin+d3+k2",
    amazonUrl: "https://www.amazon.com/s?k=vitamin+d3+k2",
    budget: ["low", "medium", "high"],
  },
  {
    id: "magnesium-glycinate",
    title: "Magnesium Glycinate",
    rationale:
      "Supports deep sleep, stress response, and over 300 enzymatic processes. The glycinate form is gentle on digestion and highly bioavailable.",
    dosage: "300–400 mg elemental magnesium 1 hour before bed",
    tags: ["sleep", "stress", "recovery"],
    iHerbUrl: "https://www.iherb.com/search?kw=magnesium+glycinate",
    amazonUrl: "https://www.amazon.com/s?k=magnesium+glycinate",
    budget: ["low", "medium", "high"],
  },
  {
    id: "omega-3",
    title: "High-Potency Omega-3 (Fish Oil)",
    rationale:
      "EPA and DHA support cardiovascular health, reduce systemic inflammation, and protect cognitive function over the long term.",
    dosage: "2–4 g combined EPA/DHA daily with a meal",
    tags: ["heart", "brain", "inflammation"],
    iHerbUrl: "https://www.iherb.com/search?kw=omega+3+fish+oil+epa+dha",
    amazonUrl: "https://www.amazon.com/s?k=omega+3+fish+oil",
    budget: ["medium", "high"],
  },
  {
    id: "creatine",
    title: "Creatine Monohydrate",
    rationale:
      "One of the most evidence-backed supplements for strength, power output, and cognitive function. Supports muscle protein synthesis and ATP production.",
    dosage: "3–5 g daily, timing flexible",
    tags: ["strength", "muscle", "cognition"],
    iHerbUrl: "https://www.iherb.com/search?kw=creatine+monohydrate",
    amazonUrl: "https://www.amazon.com/s?k=creatine+monohydrate",
    budget: ["low", "medium", "high"],
  },
  {
    id: "l-theanine",
    title: "L-Theanine",
    rationale:
      "Promotes calm, focused attention without sedation. Synergizes with caffeine to reduce jitters while enhancing alertness and reaction time.",
    dosage: "100–200 mg with morning routine or before focused work",
    tags: ["focus", "calm", "cognition"],
    iHerbUrl: "https://www.iherb.com/search?kw=l-theanine",
    amazonUrl: "https://www.amazon.com/s?k=l-theanine",
    budget: ["low", "medium", "high"],
  },
  {
    id: "glycine",
    title: "Glycine",
    rationale:
      "Improves sleep quality and onset time. Also supports collagen synthesis and healthy blood sugar metabolism throughout the night.",
    dosage: "3 g in warm water 30 minutes before bed",
    tags: ["sleep", "collagen", "recovery"],
    iHerbUrl: "https://www.iherb.com/search?kw=glycine+powder",
    amazonUrl: "https://www.amazon.com/s?k=glycine+powder",
    budget: ["low", "medium", "high"],
  },
  {
    id: "coq10",
    title: "CoQ10 (Ubiquinol)",
    rationale:
      "Cellular energy production declines with age. Ubiquinol (the active form) supports mitochondrial function and cardiovascular health.",
    dosage: "100–200 mg daily with a fat-containing meal",
    tags: ["energy", "heart", "longevity"],
    iHerbUrl: "https://www.iherb.com/search?kw=coq10+ubiquinol",
    amazonUrl: "https://www.amazon.com/s?k=coq10+ubiquinol",
    budget: ["medium", "high"],
  },
  {
    id: "ashwagandha",
    title: "Ashwagandha (KSM-66)",
    rationale:
      "Adaptogen shown to reduce cortisol, support thyroid function, and improve testosterone levels in individuals under chronic stress.",
    dosage: "300–600 mg KSM-66 extract daily, preferably with meals",
    tags: ["stress", "hormones", "recovery"],
    iHerbUrl: "https://www.iherb.com/search?kw=ashwagandha+ksm-66",
    amazonUrl: "https://www.amazon.com/s?k=ashwagandha+ksm-66",
    budget: ["low", "medium", "high"],
  },
  {
    id: "berberine",
    title: "Berberine",
    rationale:
      "Activates AMPK pathways involved in glucose metabolism and metabolic rate. Research suggests meaningful effects on blood sugar regulation.",
    dosage: "500 mg 2–3× daily with meals to reduce GI side effects",
    tags: ["metabolic", "fat_loss", "longevity"],
    iHerbUrl: "https://www.iherb.com/search?kw=berberine",
    amazonUrl: "https://www.amazon.com/s?k=berberine",
    budget: ["medium", "high"],
  },
  {
    id: "nmn",
    title: "NMN (Nicotinamide Mononucleotide)",
    rationale:
      "Precursor to NAD+, which declines significantly with age. Supports cellular repair pathways, energy metabolism, and mitochondrial biogenesis.",
    dosage: "250–500 mg in the morning (sublingual or capsule)",
    tags: ["longevity", "energy", "aging"],
    iHerbUrl: "https://www.iherb.com/search?kw=nmn",
    amazonUrl: "https://www.amazon.com/s?k=nmn+supplement",
    budget: ["high"],
  },
  {
    id: "zinc",
    title: "Zinc + Copper",
    rationale:
      "Zinc is essential for testosterone production, immune function, and wound healing. Pair with copper (1–2 mg) to maintain the correct ratio.",
    dosage: "15–25 mg zinc with 1–2 mg copper daily with food",
    tags: ["immune", "hormones", "recovery"],
    iHerbUrl: "https://www.iherb.com/search?kw=zinc+copper",
    amazonUrl: "https://www.amazon.com/s?k=zinc+copper+supplement",
    budget: ["low", "medium", "high"],
  },
  {
    id: "algae-omega",
    title: "Algae-Based Omega-3 (DHA/EPA)",
    rationale:
      "Plant-derived DHA and EPA sourced directly from microalgae — the same source fish obtain their omega-3. Equivalent benefits without fish products.",
    dosage: "250–500 mg DHA daily with meals",
    tags: ["heart", "brain", "vegan"],
    iHerbUrl: "https://www.iherb.com/search?kw=algae+omega+3+dha",
    amazonUrl: "https://www.amazon.com/s?k=algae+omega+3",
    budget: ["medium", "high"],
  },
];

const OIL_DB: Oil[] = [
  {
    id: "evoo",
    title: "Extra-Virgin Olive Oil",
    rationale:
      "Rich in oleocanthal, a natural anti-inflammatory compound. Cornerstone of Mediterranean and longevity diets with robust epidemiological support.",
    usage:
      "Cold dressings, low-heat sautéing, finishing dishes. Avoid high-heat frying which degrades polyphenols.",
    tags: ["anti-inflammatory", "heart", "mediterranean"],
    amazonUrl: "https://www.amazon.com/s?k=extra+virgin+olive+oil",
  },
  {
    id: "avocado-oil",
    title: "Avocado Oil (Refined)",
    rationale:
      "High smoke point (500°F / 260°C) with a monounsaturated fat profile. Ideal for high-heat cooking while maintaining a healthy lipid profile.",
    usage: "Stir-frying, roasting, grilling. Stable at high temperatures.",
    tags: ["high-heat", "monounsaturated", "neutral"],
    amazonUrl: "https://www.amazon.com/s?k=avocado+oil+refined",
  },
  {
    id: "coconut-oil",
    title: "Virgin Coconut Oil",
    rationale:
      "Contains medium-chain triglycerides (MCTs) rapidly metabolized for energy and ketone production. Antimicrobial lauric acid content.",
    usage: "Baking, medium-heat cooking, blending into hot beverages.",
    tags: ["mct", "energy", "baking"],
    amazonUrl: "https://www.amazon.com/s?k=virgin+coconut+oil",
  },
];

const APPLIANCE_DB: Appliance[] = [
  {
    id: "air-purifier",
    title: "HEPA Air Purifier",
    rationale:
      "Indoor air quality directly impacts sleep quality, respiratory health, and cognitive performance. HEPA filtration removes 99.97% of particulates ≥0.3 microns.",
    tags: ["sleep", "respiratory", "cognition"],
    amazonUrl: "https://www.amazon.com/s?k=hepa+air+purifier",
    budget: ["medium", "high"],
  },
  {
    id: "red-light",
    title: "Red Light Therapy Panel",
    rationale:
      "Photobiomodulation at 660–850 nm stimulates mitochondrial cytochrome c oxidase, reduces inflammation, and accelerates tissue recovery.",
    tags: ["recovery", "energy", "skin"],
    amazonUrl: "https://www.amazon.com/s?k=red+light+therapy+panel",
    budget: ["high"],
  },
  {
    id: "sleep-tracker",
    title: "Sleep Tracker (Ring / Watch)",
    rationale:
      "Objective sleep staging data enables personalized optimization of bedtime, temperature, and recovery protocols based on your biology.",
    tags: ["sleep", "data", "recovery"],
    amazonUrl: "https://www.amazon.com/s?k=sleep+tracker+ring",
    budget: ["medium", "high"],
  },
  {
    id: "standing-desk",
    title: "Standing Desk Converter",
    rationale:
      "Reduces sedentary time linked to metabolic syndrome and all-cause mortality. Alternating sit/stand improves circulation and energy.",
    tags: ["metabolic", "posture", "longevity"],
    amazonUrl: "https://www.amazon.com/s?k=standing+desk+converter",
    budget: ["medium", "high"],
  },
  {
    id: "cold-plunge",
    title: "Cold Therapy (Portable Plunge)",
    rationale:
      "Cold water immersion activates brown adipose tissue, dramatically boosts norepinephrine (~300%), and accelerates muscle recovery post-exercise.",
    tags: ["recovery", "metabolism", "stress-resilience"],
    amazonUrl: "https://www.amazon.com/s?k=cold+plunge+portable",
    budget: ["high"],
  },
  {
    id: "water-filter",
    title: "Under-Sink Water Filter",
    rationale:
      "Removes heavy metals, chlorine, and microplastics from tap water. Hydration quality affects every physiological process.",
    tags: ["hydration", "detox", "foundational"],
    amazonUrl: "https://www.amazon.com/s?k=under+sink+water+filter",
    budget: ["medium", "high"],
  },
];

const MOCK_CLINICS: Clinic[] = [
  {
    id: "clinic-1",
    name: "Longevity & Performance Medical Center",
    specialty: "Preventive Medicine · Hormone Optimization",
    address: "120 Health Blvd, Suite 200",
    rating: 4.8,
    distance: "0.8 mi",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "clinic-2",
    name: "Advanced Diagnostics Lab",
    specialty: "Functional Blood Testing · Biomarker Panels",
    address: "45 Wellness Ave",
    rating: 4.6,
    distance: "1.3 mi",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "clinic-3",
    name: "Sports Medicine & Recovery Clinic",
    specialty: "Physical Therapy · IV Therapy · Cryotherapy",
    address: "88 Vitality St",
    rating: 4.7,
    distance: "2.1 mi",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "clinic-4",
    name: "Integrative Health Center",
    specialty: "Naturopathic Medicine · Nutrition Counseling",
    address: "200 Wellness Plaza",
    rating: 4.5,
    distance: "2.9 mi",
    googleMapsUrl: "https://maps.google.com",
  },
];

export function generateProtocol(
  selectedAge: number,
  goals: Goal[],
  budget: BudgetTier,
  preferences: Preferences
): ProtocolPayload {
  const usedIds = new Set<string>();
  const supplements: Supplement[] = [];

  const add = (id: string) => {
    if (usedIds.has(id)) return;
    const s = SUPPLEMENT_DB.find((x) => x.id === id);
    if (!s || !s.budget.includes(budget)) return;
    usedIds.add(id);
    supplements.push(s);
  };

  // Foundational stack
  add("vitamin-d3");
  add("magnesium-glycinate");

  // Age-based emphasis
  if (selectedAge <= 30) {
    add("creatine");
    add("zinc");
  } else if (selectedAge <= 45) {
    add("coq10");
    add("ashwagandha");
    add("creatine");
  } else {
    add("coq10");
    add("nmn");
    add("berberine");
    add("ashwagandha");
  }

  // Goal additions
  if (goals.includes("sleep")) {
    add("glycine");
    add("magnesium-glycinate");
  }
  if (goals.includes("focus")) {
    add("l-theanine");
  }
  if (goals.includes("strength")) {
    add("creatine");
    add("zinc");
  }
  if (goals.includes("recovery")) {
    if (!preferences.noFishOil) {
      add("omega-3");
    } else {
      add("algae-omega");
    }
  }
  if (goals.includes("hormones")) {
    add("ashwagandha");
    add("zinc");
  }
  if (goals.includes("longevity")) {
    add("nmn");
    add("berberine");
  }
  if (goals.includes("fat_loss")) {
    add("berberine");
  }
  if (goals.includes("energy")) {
    add("coq10");
    add("nmn");
  }

  // Vegan substitution
  if (preferences.vegan) {
    const idx = supplements.findIndex((s) => s.id === "omega-3");
    if (idx !== -1) {
      supplements.splice(idx, 1);
      add("algae-omega");
    }
  }

  const oils = OIL_DB.slice(0, budget === "low" ? 1 : 2);

  const appliances = APPLIANCE_DB.filter((a) => {
    if (!a.budget.includes(budget)) return false;
    if (budget === "high") return true;
    if (
      goals.includes("sleep") &&
      (a.id === "air-purifier" || a.id === "sleep-tracker")
    )
      return true;
    if (goals.includes("recovery") && a.id === "red-light") return true;
    return ["air-purifier", "water-filter"].includes(a.id);
  }).slice(0, 4);

  return { supplements, oils, appliances, clinics: MOCK_CLINICS };
}
