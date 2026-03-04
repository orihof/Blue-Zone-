/// lib/iherb-catalog.ts
// Curated iHerb product catalog — maps supplement categories and keywords
// to specific, real product pages with affiliate code support.
//
// Products selected for: quality tier, verified longevity research, high ratings,
// and availability on iHerb as of 2025.

export interface IHerbProduct {
  id: string;
  name: string;
  brand: string;
  icon: string;
  priceUsd: string;
  url: string;         // Direct product page URL (add rcode= for affiliate)
  category: string;
  keywords: string[];  // Keyword matching against recommendation titles
  shortWhy: string;    // One-line reason shown on the card
}

const AFFILIATE = process.env.IHERB_AFFILIATE_CODE ?? "";
function url(path: string) {
  return AFFILIATE ? `${path}?rcode=${AFFILIATE}` : path;
}

export const IHERB_PRODUCTS: IHerbProduct[] = [
  // ── Omega-3 / Inflammation ─────────────────────────────────────────────────
  {
    id: "omega3-nordic",
    name: "Ultimate Omega 2X",
    brand: "Nordic Naturals",
    icon: "🐟",
    priceUsd: "$42",
    url: url("https://www.iherb.com/pr/nordic-naturals-ultimate-omega-2x-mini-1120-mg-60-soft-gels/67898"),
    category: "Inflammation",
    keywords: ["omega", "omega-3", "fish oil", "epa", "dha", "hscrp", "inflammation"],
    shortWhy: "2140mg EPA+DHA per serving — meta-analysis shows −0.4 mg/L hsCRP reduction",
  },
  // ── Magnesium / Sleep ──────────────────────────────────────────────────────
  {
    id: "magnesium-thorne",
    name: "Magnesium Bisglycinate",
    brand: "Thorne Research",
    icon: "🌙",
    priceUsd: "$26",
    url: url("https://www.iherb.com/pr/thorne-research-magnesium-bisglycinate-210-capsules/21322"),
    category: "Sleep",
    keywords: ["magnesium", "sleep", "insomnia", "nmda", "glycinate", "bisglycinate"],
    shortWhy: "Chelated glycinate form — best blood-brain barrier passage for sleep quality",
  },
  // ── CoQ10 / Metabolic ─────────────────────────────────────────────────────
  {
    id: "coq10-jarrow",
    name: "QH-Absorb Ubiquinol 200mg",
    brand: "Jarrow Formulas",
    icon: "⚡",
    priceUsd: "$48",
    url: url("https://www.iherb.com/pr/jarrow-formulas-qh-absorb-ubiquinol-200-mg-60-softgels/72649"),
    category: "Metabolic",
    keywords: ["coq10", "ubiquinol", "coenzyme q10", "mitochondria", "atp", "energy", "coq"],
    shortWhy: "Ubiquinol (active form) — 8× better absorption vs ubiquinone",
  },
  // ── Berberine / Metabolic ─────────────────────────────────────────────────
  {
    id: "berberine-thorne",
    name: "Berberine-500",
    brand: "Thorne Research",
    icon: "🌿",
    priceUsd: "$44",
    url: url("https://www.iherb.com/pr/thorne-research-berberine-500-60-capsules/20139"),
    category: "Metabolic",
    keywords: ["berberine", "glucose", "insulin", "blood sugar", "ampk", "metabolic", "hba1c", "a1c"],
    shortWhy: "500mg pharmaceutical-grade — activates AMPK, improves insulin sensitivity ~20%",
  },
  // ── Vitamin D3+K2 ─────────────────────────────────────────────────────────
  {
    id: "vitd3k2-life",
    name: "Vitamins D3 & K2",
    brand: "Life Extension",
    icon: "☀️",
    priceUsd: "$24",
    url: url("https://www.iherb.com/pr/life-extension-vitamins-d3-k2-60-soft-gels/66799"),
    category: "Hormonal",
    keywords: ["vitamin d", "vitamin d3", "d3", "k2", "mk7", "vdr", "calcium", "bone"],
    shortWhy: "D3 5000IU + K2 MK7 45mcg — VDR pathway + calcium shuttling",
  },
  // ── Ashwagandha / Stress ──────────────────────────────────────────────────
  {
    id: "ashwagandha-ksm66",
    name: "KSM-66 Ashwagandha 600mg",
    brand: "Jarrow Formulas",
    icon: "🧘",
    priceUsd: "$28",
    url: url("https://www.iherb.com/pr/jarrow-formulas-ashwagandha-ksm-66-300-mg-120-veggie-caps/95060"),
    category: "Stress",
    keywords: ["ashwagandha", "cortisol", "stress", "ksm-66", "adaptogen", "hrv", "recovery"],
    shortWhy: "KSM-66 root extract — reduces cortisol ~28%, improves VO₂ max per double-blind RCT",
  },
  // ── NMN / Longevity ───────────────────────────────────────────────────────
  {
    id: "nmn-thorne",
    name: "ResveraCel (NMN + Resveratrol)",
    brand: "Thorne Research",
    icon: "🔬",
    priceUsd: "$58",
    url: url("https://www.iherb.com/pr/thorne-research-resveracel-60-capsules/84085"),
    category: "Longevity",
    keywords: ["nmn", "nad+", "nad", "resveratrol", "sirtuins", "anti-aging", "longevity", "biological age"],
    shortWhy: "NMN 125mg + Resveratrol 100mg — supports NAD+ production and SIRT1 pathway",
  },
  // ── Creatine / Performance ────────────────────────────────────────────────
  {
    id: "creatine-thorne",
    name: "Creatine Monohydrate",
    brand: "Thorne Research",
    icon: "💪",
    priceUsd: "$38",
    url: url("https://www.iherb.com/pr/thorne-research-creatine-16-oz/91043"),
    category: "Performance",
    keywords: ["creatine", "strength", "muscle", "vo2", "performance", "power", "resistance"],
    shortWhy: "5g/day pharmaceutical-grade — gold-standard for muscle strength and cognitive function",
  },
  // ── Zinc / Hormonal ───────────────────────────────────────────────────────
  {
    id: "zinc-thorne",
    name: "Zinc Picolinate 30mg",
    brand: "Thorne Research",
    icon: "🔩",
    priceUsd: "$16",
    url: url("https://www.iherb.com/pr/thorne-research-zinc-picolinate-60-capsules/633"),
    category: "Hormonal",
    keywords: ["zinc", "testosterone", "immune", "picolinate", "hormonal", "hormone"],
    shortWhy: "Picolinate form — superior absorption, supports testosterone synthesis and immunity",
  },
  // ── Probiotics / Gut ──────────────────────────────────────────────────────
  {
    id: "probiotics-jarrow",
    name: "Jarro-Dophilus Ultra 50 Billion",
    brand: "Jarrow Formulas",
    icon: "🦠",
    priceUsd: "$32",
    url: url("https://www.iherb.com/pr/jarrow-formulas-jarro-dophilus-ultra-50-billion-60-veggie-caps/93175"),
    category: "Gut",
    keywords: ["probiotic", "gut", "microbiome", "bacteria", "digestive", "leaky gut", "ibs"],
    shortWhy: "50 Billion CFU, 10 strains — clinically validated for gut barrier integrity",
  },
  // ── Alpha Lipoic Acid / Metabolic ─────────────────────────────────────────
  {
    id: "ala-thorne",
    name: "Alpha Lipoic Acid 300mg",
    brand: "Thorne Research",
    icon: "🛡️",
    priceUsd: "$22",
    url: url("https://www.iherb.com/pr/thorne-research-alpha-lipoic-acid-300-mg-60-capsules/1121"),
    category: "Metabolic",
    keywords: ["alpha lipoic acid", "ala", "antioxidant", "insulin", "neuropathy", "oxidative stress"],
    shortWhy: "Universal antioxidant — improves insulin sensitivity and mitochondrial function",
  },
  // ── Vitamin B Complex ─────────────────────────────────────────────────────
  {
    id: "bcomplex-thorne",
    name: "Basic B Complex",
    brand: "Thorne Research",
    icon: "⚡",
    priceUsd: "$20",
    url: url("https://www.iherb.com/pr/thorne-research-basic-b-complex-60-capsules/773"),
    category: "Energy",
    keywords: ["b vitamin", "b complex", "b12", "folate", "methylation", "homocysteine", "energy", "fatigue"],
    shortWhy: "Methylated B vitamins — supports homocysteine metabolism and cellular energy production",
  },
  // ── Curcumin / Inflammation ───────────────────────────────────────────────
  {
    id: "curcumin-thorne",
    name: "Meriva-SF Curcumin Phytosome",
    brand: "Thorne Research",
    icon: "🟡",
    priceUsd: "$36",
    url: url("https://www.iherb.com/pr/thorne-research-meriva-sf-500-mg-60-capsules/19888"),
    category: "Inflammation",
    keywords: ["curcumin", "turmeric", "inflammation", "nf-kb", "joint", "anti-inflammatory"],
    shortWhy: "Phytosome form — 29× better absorption vs standard turmeric extract",
  },
  // ── L-Glutamine / Recovery ────────────────────────────────────────────────
  {
    id: "glutamine-jarrow",
    name: "L-Glutamine Powder",
    brand: "Jarrow Formulas",
    icon: "🔄",
    priceUsd: "$18",
    url: url("https://www.iherb.com/pr/jarrow-formulas-l-glutamine-powder-17-6-oz-500-g/571"),
    category: "Recovery",
    keywords: ["glutamine", "gut lining", "recovery", "muscle", "immune", "leaky gut", "post-workout"],
    shortWhy: "5g/day supports gut barrier integrity and muscle recovery post-exercise",
  },
  // ── Selenium / Thyroid ────────────────────────────────────────────────────
  {
    id: "selenium-thorne",
    name: "Selenomethionine 200mcg",
    brand: "Thorne Research",
    icon: "🦋",
    priceUsd: "$14",
    url: url("https://www.iherb.com/pr/thorne-research-selenomethionine-200-mcg-60-capsules/743"),
    category: "Hormonal",
    keywords: ["selenium", "thyroid", "tsh", "glutathione", "antioxidant", "selenomethionine"],
    shortWhy: "Selenomethionine form — essential for thyroid hormone synthesis and GPx activation",
  },
];

// ── Matching logic ──────────────────────────────────────────────────────────

/**
 * Returns the best matching iHerb product for a given recommendation title/category.
 * Uses keyword scoring — returns null if no confident match (score < 1).
 */
export function matchIHerbProduct(
  title: string,
  category?: string,
): IHerbProduct | null {
  const haystack = `${title} ${category ?? ""}`.toLowerCase();

  let best: IHerbProduct | null = null;
  let bestScore = 0;

  for (const product of IHERB_PRODUCTS) {
    let score = 0;
    for (const kw of product.keywords) {
      if (haystack.includes(kw.toLowerCase())) score++;
    }
    // Boost if category matches
    if (category && product.category.toLowerCase() === category.toLowerCase()) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return bestScore >= 1 ? best : null;
}

/**
 * Returns the direct iHerb URL for a product, with affiliate code if configured.
 */
export function getIHerbUrl(productId: string): string | null {
  const p = IHERB_PRODUCTS.find((p) => p.id === productId);
  return p?.url ?? null;
}
