/// lib/recommendations/generateDemo.ts
import type { ProtocolPayload } from "@/lib/db/payload";

type Goal = "energy" | "sleep" | "focus" | "strength" | "fat_loss" | "recovery" | "hormones" | "longevity";
type Budget = "low" | "medium" | "high";
type Prefs = { vegan?: boolean; caffeineFree?: boolean; noFishOil?: boolean };

export function generateDemo(
  selectedAge: number,
  goals: Goal[],
  budget: Budget,
  preferences: Prefs
): ProtocolPayload {
  const band = selectedAge <= 35 ? "young" : selectedAge <= 50 ? "mid" : "senior";
  const wantsSleep = goals.includes("sleep");
  const wantsFocus = goals.includes("focus");
  const wantsStrength = goals.includes("strength");
  const wantsLongevity = goals.includes("longevity");
  const wantsRecovery = goals.includes("recovery");

  const supplements = [];

  // Universal
  supplements.push({
    id: "vit-d3",
    category: "supplement" as const,
    title: "Vitamin D3 + K2",
    rationaleBullets: [
      "May support immune regulation, bone density, and mood stability.",
      "Most adults have suboptimal levels, particularly with limited sun exposure.",
    ],
    howToUse: "Take 2,000–5,000 IU D3 with 100 mcg K2 daily with a fat-containing meal.",
    whatToTrack: ["25(OH)D serum level every 3–6 months", "Mood and energy ratings"],
    whenToAvoid: ["Active hypercalcemia", "Certain granulomatous diseases — discuss with your clinician"],
    tags: ["immune", "bone", "foundational"],
    links: {
      iherb: "https://www.iherb.com/search?kw=vitamin+d3+k2",
      amazon: "https://www.amazon.com/s?k=vitamin+d3+k2",
    },
  });

  supplements.push({
    id: "magnesium-glycinate",
    category: "supplement" as const,
    title: "Magnesium Glycinate",
    rationaleBullets: [
      "May support sleep quality, stress response, and muscle recovery.",
      "The glycinate form is commonly preferred for tolerability and absorption.",
    ],
    howToUse: "300–400 mg elemental magnesium 60 minutes before bed.",
    whatToTrack: ["Sleep onset time", "Morning energy score", "Muscle soreness"],
    whenToAvoid: ["Kidney disease or impaired renal function — discuss with your clinician"],
    tags: ["sleep", "recovery", "stress"],
    links: {
      iherb: "https://www.iherb.com/search?kw=magnesium+glycinate",
      amazon: "https://www.amazon.com/s?k=magnesium+glycinate",
    },
  });

  if (!preferences.noFishOil && !preferences.vegan && (wantsRecovery || wantsLongevity || budget !== "low")) {
    supplements.push({
      id: "omega3",
      category: "supplement" as const,
      title: "Omega-3 (EPA + DHA)",
      rationaleBullets: [
        "EPA and DHA may support cardiovascular health and reduce systemic inflammation markers.",
        "Commonly associated with improved recovery and cognitive function in lifestyle studies.",
      ],
      howToUse: "2–4 g combined EPA/DHA daily with a meal. Keep refrigerated.",
      whatToTrack: ["Triglyceride levels", "Self-reported joint comfort"],
      whenToAvoid: ["Blood-thinning medications — discuss dose with your clinician"],
      tags: ["heart", "inflammation", "recovery"],
      links: {
        iherb: "https://www.iherb.com/search?kw=omega+3+epa+dha",
        amazon: "https://www.amazon.com/s?k=omega+3+fish+oil",
      },
    });
  }

  if (preferences.vegan || preferences.noFishOil) {
    supplements.push({
      id: "algae-omega",
      category: "supplement" as const,
      title: "Algae Omega-3 (DHA/EPA)",
      rationaleBullets: [
        "Provides DHA and EPA from microalgae — the original source fish obtain their omega-3.",
        "Bioequivalent cardiovascular and cognitive support without fish-derived products.",
      ],
      howToUse: "250–500 mg DHA daily with a meal.",
      whatToTrack: ["Energy levels", "Cognitive clarity ratings"],
      whenToAvoid: ["Anticoagulant use — discuss with your clinician"],
      tags: ["vegan", "heart", "brain"],
      links: {
        iherb: "https://www.iherb.com/search?kw=algae+omega+3+dha",
        amazon: "https://www.amazon.com/s?k=algae+omega+3",
      },
    });
  }

  if (wantsStrength || band === "young") {
    supplements.push({
      id: "creatine",
      category: "supplement" as const,
      title: "Creatine Monohydrate",
      rationaleBullets: [
        "One of the most evidence-backed supplements for strength, power output, and muscle protein synthesis.",
        "Also commonly associated with cognitive function support in research settings.",
      ],
      howToUse: "3–5 g daily. Timing is flexible — consistency matters more than timing.",
      whatToTrack: ["Training load and 1-rep max progress", "Body composition"],
      whenToAvoid: ["Chronic kidney disease — discuss with your clinician"],
      tags: ["strength", "muscle", "cognition"],
      links: {
        iherb: "https://www.iherb.com/search?kw=creatine+monohydrate",
        amazon: "https://www.amazon.com/s?k=creatine+monohydrate",
      },
    });
  }

  if (wantsFocus && !preferences.caffeineFree) {
    supplements.push({
      id: "l-theanine",
      category: "supplement" as const,
      title: "L-Theanine",
      rationaleBullets: [
        "May promote focused calm without sedation. Commonly paired with caffeine to smooth stimulant effects.",
        "Associated with alpha brainwave activity linked to relaxed alertness in small studies.",
      ],
      howToUse: "100–200 mg in the morning or before focused work sessions.",
      whatToTrack: ["Focus ratings (1–10)", "Anxiety levels"],
      whenToAvoid: ["None established — low risk profile"],
      tags: ["focus", "calm", "cognition"],
      links: {
        iherb: "https://www.iherb.com/search?kw=l-theanine",
        amazon: "https://www.amazon.com/s?k=l-theanine",
      },
    });
  }

  if (wantsSleep) {
    supplements.push({
      id: "glycine",
      category: "supplement" as const,
      title: "Glycine",
      rationaleBullets: [
        "May improve sleep quality and reduce time to sleep onset.",
        "Also supports collagen synthesis and healthy blood glucose metabolism.",
      ],
      howToUse: "3 g dissolved in warm water 30–60 minutes before bed.",
      whatToTrack: ["Sleep onset time", "Sleep tracker data (HRV, deep sleep %)", "Morning energy"],
      whenToAvoid: ["None established at typical doses"],
      tags: ["sleep", "collagen", "recovery"],
      links: {
        iherb: "https://www.iherb.com/search?kw=glycine+powder",
        amazon: "https://www.amazon.com/s?k=glycine+supplement",
      },
    });
  }

  if ((band === "mid" || band === "senior") && budget !== "low") {
    supplements.push({
      id: "coq10",
      category: "supplement" as const,
      title: "CoQ10 (Ubiquinol)",
      rationaleBullets: [
        "CoQ10 production declines with age and statin use. May support mitochondrial energy production.",
        "Ubiquinol (the active, reduced form) has higher bioavailability than ubiquinone.",
      ],
      howToUse: "100–200 mg ubiquinol daily with a fat-containing meal.",
      whatToTrack: ["Energy levels throughout the day", "Exercise tolerance"],
      whenToAvoid: ["Blood thinners (may have mild anticoagulant effect) — discuss with your clinician"],
      tags: ["energy", "longevity", "mitochondria"],
      links: {
        iherb: "https://www.iherb.com/search?kw=coq10+ubiquinol",
        amazon: "https://www.amazon.com/s?k=coq10+ubiquinol",
      },
    });
  }

  const nutrition = [
    {
      id: "evoo",
      category: "nutrition" as const,
      title: "Extra-Virgin Olive Oil",
      rationaleBullets: [
        "Rich in oleocanthal, which may inhibit inflammatory enzymes similarly to ibuprofen.",
        "Cornerstone of longevity dietary patterns with robust epidemiological support.",
      ],
      howToUse: "Use for cold dressings, low-heat cooking, and as a finishing oil. Avoid high-heat frying.",
      whatToTrack: ["C-reactive protein (CRP) on next bloodwork"],
      whenToAvoid: ["No known contraindications at dietary doses"],
      tags: ["anti-inflammatory", "heart", "mediterranean"],
      links: { iherb: null, amazon: "https://www.amazon.com/s?k=extra+virgin+olive+oil" },
    },
    {
      id: "avocado-oil",
      category: "nutrition" as const,
      title: "Avocado Oil (Refined)",
      rationaleBullets: [
        "High smoke point (~260°C) makes it suitable for high-heat cooking without oxidation.",
        "Rich in monounsaturated oleic acid, associated with healthy lipid profiles.",
      ],
      howToUse: "Use for stir-frying, roasting, and grilling. Stores at room temperature.",
      whatToTrack: ["LDL particle size on next lipid panel"],
      whenToAvoid: ["Avocado allergy"],
      tags: ["high-heat", "monounsaturated", "cooking"],
      links: { iherb: null, amazon: "https://www.amazon.com/s?k=avocado+oil+refined" },
    },
  ];

  const home = [
    {
      id: "air-purifier",
      category: "home" as const,
      title: "HEPA Air Purifier",
      rationaleBullets: [
        "Indoor particulate matter is associated with sleep disruption and respiratory health.",
        "HEPA filtration removes 99.97% of particles ≥0.3 microns including allergens and pollutants.",
      ],
      howToUse: "Place in bedroom, run continuously at low-medium setting. Replace filter annually.",
      whatToTrack: ["Sleep quality metrics", "Morning respiratory comfort"],
      whenToAvoid: ["No contraindications"],
      tags: ["sleep", "air quality", "respiratory"],
      links: { iherb: null, amazon: "https://www.amazon.com/s?k=hepa+air+purifier" },
    },
    ...(budget !== "low" ? [{
      id: "sleep-tracker",
      category: "home" as const,
      title: "Sleep Tracker (Ring or Watch)",
      rationaleBullets: [
        "Objective sleep staging data enables personalized optimization rather than guesswork.",
        "HRV trending correlates with recovery and autonomic nervous system status.",
      ],
      howToUse: "Wear nightly, review trends weekly rather than individual nights.",
      whatToTrack: ["HRV trend", "Deep sleep duration", "Sleep efficiency"],
      whenToAvoid: ["No contraindications"],
      tags: ["sleep", "HRV", "data"],
      links: { iherb: null, amazon: "https://www.amazon.com/s?k=sleep+tracker+ring" },
    }] : []),
  ];

  const clinics = [
    {
      id: "longevity-clinic",
      name: "Longevity & Preventive Medicine Center",
      city: "Your city",
      specialty: ["Preventive Medicine", "Hormone Optimization", "Biomarker Analysis"],
      whyRelevant: ["Can run comprehensive longevity bloodwork", "Interprets biological age markers"],
      website: null,
      bookingUrl: null,
      placeId: null,
    },
    {
      id: "functional-lab",
      name: "Advanced Diagnostics & Functional Lab",
      city: "Your city",
      specialty: ["Functional Blood Testing", "Gut Microbiome", "Nutritional Deficiency Panels"],
      whyRelevant: ["Offers expanded biomarker panels beyond standard labs"],
      website: null,
      bookingUrl: null,
      placeId: null,
    },
    {
      id: "sports-recovery",
      name: "Sports Medicine & Recovery Clinic",
      city: "Your city",
      specialty: ["Physical Therapy", "IV Therapy", "Cryotherapy", "Performance Medicine"],
      whyRelevant: ["Recovery and performance optimization aligned with your goals"],
      website: null,
      bookingUrl: null,
      placeId: null,
    },
  ];

  const checkinQuestions = [
    "How would you rate your average energy level this week? (1–10)",
    "How many nights did you achieve 7+ hours of sleep?",
    "Did you take your supplements consistently this week?",
    "How was your exercise adherence this week?",
    ...(wantsFocus ? ["Rate your focus and mental clarity this week (1–10)"] : []),
    ...(wantsRecovery ? ["How quickly did you recover from workouts this week?"] : []),
    "Any side effects or concerns from your current stack?",
  ];

  const dailyChecklist = [
    { id: "take-supplements", title: "Take morning supplements", frequency: "daily" as const, timeOfDay: "am" as const },
    { id: "evening-magnesium", title: "Magnesium glycinate before bed", frequency: "daily" as const, timeOfDay: "pm" as const },
    { id: "movement", title: "30+ minutes movement or exercise", frequency: "daily" as const, timeOfDay: null },
    { id: "sleep-window", title: "In bed by consistent sleep time", frequency: "daily" as const, timeOfDay: "pm" as const },
    { id: "weekly-checkin", title: "Complete weekly check-in", frequency: "weekly" as const, timeOfDay: null },
  ];

  const baseScore = band === "young" ? 72 : band === "mid" ? 65 : 58;

  return {
    scores: {
      biologicalAgeEstimate: null,
      confidence: 0.35,
      recovery: wantsRecovery ? Math.min(baseScore + 5, 80) : baseScore,
      sleep: wantsSleep ? Math.min(baseScore + 8, 82) : baseScore - 3,
      metabolic: band === "senior" ? 60 : baseScore + 2,
      readiness: baseScore - 2,
    },
    biologicalAgeNarrative: null,
    timeline: [
      { week: 1, focus: "Establishing foundational habits", expectedWins: ["Improved sleep latency", "Consistent supplement timing"] },
      { week: 2, focus: "Stack optimization and tracking", expectedWins: ["Noticeable energy improvements", "Reduced afternoon slump"] },
      { week: 3, focus: "Intensifying recovery protocols", expectedWins: ["Better workout recovery", "Improved HRV readings"] },
      { week: 4, focus: "Reviewing adherence and adjusting", expectedWins: ["Behavioral habit lock-in", "First check-in data point"] },
      { week: 6, focus: "Re-assessment and protocol refinement", expectedWins: ["Data-driven stack adjustments", "Preparation for lab testing"] },
    ],
    recommendations: {
      supplements,
      nutrition,
      home,
      clinics,
    },
    stackSafetyNotes:
      supplements.length >= 3
        ? [
            "Magnesium and omega-3 may mildly enhance effects of blood-thinning medications — discuss with your clinician if you are prescribed anticoagulants.",
            "Start new supplements one at a time, 5–7 days apart, to identify any individual reactions.",
            "This is a demo protocol based on questionnaire data only. Upload blood test results for a personalized, higher-confidence protocol.",
          ]
        : [],
    habits: {
      dailyChecklist,
      weeklyCheckInQuestions: checkinQuestions,
    },
    explainability: {
      keyDrivers: [
        {
          title: "Goal-based selection",
          evidence: [`Goals selected: ${goals.join(", ")}`, "Protocol built from evidence-informed defaults for your age band"],
          sourcedFrom: "questionnaire",
        },
        {
          title: "Age band optimization",
          evidence: [
            `Age band: ${band} (${selectedAge} years)`,
            band === "senior" ? "Emphasis on metabolic and mitochondrial support" : "Emphasis on performance and foundational wellness",
          ],
          sourcedFrom: "questionnaire",
        },
      ],
    },
    safety: {
      disclaimers: [
        "This is a demonstration protocol generated from questionnaire inputs only — not from your personal health data.",
        "Blue Zone is not a medical service. All suggestions are for educational and informational purposes only.",
        "Always discuss supplement use with a qualified healthcare professional, especially if you have underlying conditions or take medications.",
      ],
      redFlags: [
        "If you experience unusual symptoms after starting any supplement, discontinue and consult a clinician.",
        "Do not use this protocol to replace prescribed medications without medical guidance.",
      ],
      generalContraindications: [
        "Pregnancy or breastfeeding — consult your OB/GYN before starting any supplement protocol.",
        "Chronic kidney or liver disease — many supplements are metabolized through these organs.",
        "Active cancer treatment — some supplements may interfere with chemotherapy or radiation.",
      ],
    },
  };
}
