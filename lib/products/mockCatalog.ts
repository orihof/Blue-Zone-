/// lib/products/mockCatalog.ts
import type { CatalogProduct } from "@/lib/types/health";

const IHERB = process.env.IHERB_AFFILIATE_CODE ?? "";
const AMAZON = process.env.AMAZON_AFFILIATE_TAG ?? "";

function iherb(path: string): string {
  const base = `https://www.iherb.com${path}`;
  return IHERB ? `${base}?rcode=${IHERB}` : base;
}

function amazon(asin: string): string {
  const base = `https://www.amazon.com/dp/${asin}`;
  return AMAZON ? `${base}?tag=${AMAZON}` : base;
}

// ============================================================
// PRODUCT DATABASE  (mock — fallback when APIs unavailable)
// Keys are lowercase search terms that match productQuery strings
// ============================================================

const CATALOG: Record<string, CatalogProduct[]> = {
  "magnesium glycinate": [
    {
      id: "mg-gly-01",
      title: "Magnesium Glycinate 400mg",
      brand: "Doctor's Best",
      price: "$24.99",
      imageUrl: "https://placehold.co/200x200/e8f5e9/2e7d32?text=Mg",
      affiliateUrl: iherb("/pr/doctor-s-best-high-absorption-magnesium-400-mg-240-tablets/31760"),
      source: "iherb",
    },
    {
      id: "mg-gly-02",
      title: "Chelated Magnesium Glycinate 400mg",
      brand: "Pure Encapsulations",
      price: "$31.50",
      imageUrl: "https://placehold.co/200x200/e8f5e9/2e7d32?text=Mg+PE",
      affiliateUrl: amazon("B00EWED6K2"),
      source: "amazon",
    },
  ],
  "vitamin d3 k2": [
    {
      id: "vd3k2-01",
      title: "Vitamin D3 5000 IU + K2 MK-7 100mcg",
      brand: "Thorne",
      price: "$28.00",
      imageUrl: "https://placehold.co/200x200/fff9c4/f57f17?text=D3+K2",
      affiliateUrl: iherb("/pr/thorne-research-vitamin-d-k2-liquid-1-fl-oz/37352"),
      source: "iherb",
    },
    {
      id: "vd3k2-02",
      title: "Vitamin D3 + K2 Drops",
      brand: "Life Extension",
      price: "$22.00",
      imageUrl: "https://placehold.co/200x200/fff9c4/f57f17?text=D3+K2+LE",
      affiliateUrl: amazon("B09JZ3QLQW"),
      source: "amazon",
    },
  ],
  "omega-3 fish oil": [
    {
      id: "o3-01",
      title: "Omega-3 EPA/DHA 1200mg (triglyceride form)",
      brand: "Nordic Naturals",
      price: "$35.95",
      imageUrl: "https://placehold.co/200x200/e3f2fd/1565c0?text=O3",
      affiliateUrl: iherb("/pr/nordic-naturals-omega-3-lemon-flavor-690-mg-120-soft-gels/27792"),
      source: "iherb",
    },
    {
      id: "o3-02",
      title: "Ultra Omega-3 Fish Oil 2150mg",
      brand: "Sports Research",
      price: "$29.95",
      imageUrl: "https://placehold.co/200x200/e3f2fd/1565c0?text=O3+SR",
      affiliateUrl: amazon("B01BMFVQ1K"),
      source: "amazon",
    },
  ],
  "coenzyme q10 ubiquinol": [
    {
      id: "coq10-01",
      title: "CoQ10 Ubiquinol 200mg",
      brand: "Jarrow Formulas",
      price: "$42.00",
      imageUrl: "https://placehold.co/200x200/fce4ec/880e4f?text=CoQ10",
      affiliateUrl: iherb("/pr/jarrow-formulas-qh-absorb-ubiquinol-200-mg-60-softgels/42547"),
      source: "iherb",
    },
    {
      id: "coq10-02",
      title: "Ubiquinol CoQ10 200mg Kaneka",
      brand: "Life Extension",
      price: "$38.00",
      imageUrl: "https://placehold.co/200x200/fce4ec/880e4f?text=CoQ10+LE",
      affiliateUrl: amazon("B07RGJKNLQ"),
      source: "amazon",
    },
  ],
  "ashwagandha ksm-66": [
    {
      id: "ashwa-01",
      title: "Ashwagandha KSM-66 600mg",
      brand: "Physician's Choice",
      price: "$19.97",
      imageUrl: "https://placehold.co/200x200/f3e5f5/6a1b9a?text=Ashwa",
      affiliateUrl: amazon("B07B5XRYMC"),
      source: "amazon",
    },
    {
      id: "ashwa-02",
      title: "Sensoril Ashwagandha 125mg",
      brand: "Jarrow Formulas",
      price: "$16.95",
      imageUrl: "https://placehold.co/200x200/f3e5f5/6a1b9a?text=Ashwa+J",
      affiliateUrl: iherb("/pr/jarrow-formulas-sensoril-ashwagandha-125-mg-120-capsules/93065"),
      source: "iherb",
    },
  ],
  "berberine hcl": [
    {
      id: "berb-01",
      title: "Berberine HCL 500mg",
      brand: "Thorne",
      price: "$38.00",
      imageUrl: "https://placehold.co/200x200/e8f5e9/1b5e20?text=Berb",
      affiliateUrl: iherb("/pr/thorne-research-berberine-500-mg-60-capsules/79756"),
      source: "iherb",
    },
    {
      id: "berb-02",
      title: "Berberine 1200mg with Ceylon Cinnamon",
      brand: "Double Wood",
      price: "$25.95",
      imageUrl: "https://placehold.co/200x200/e8f5e9/1b5e20?text=Berb+DW",
      affiliateUrl: amazon("B08CY5Z1G2"),
      source: "amazon",
    },
  ],
  "nmn nicotinamide mononucleotide": [
    {
      id: "nmn-01",
      title: "NMN 500mg Nicotinamide Mononucleotide",
      brand: "Tru Niagen",
      price: "$49.95",
      imageUrl: "https://placehold.co/200x200/e0f2f1/004d40?text=NMN",
      affiliateUrl: amazon("B01NCKXZMY"),
      source: "amazon",
    },
    {
      id: "nmn-02",
      title: "NMN Sublingual Pure Powder 250mg",
      brand: "Renue By Science",
      price: "$39.00",
      imageUrl: "https://placehold.co/200x200/e0f2f1/004d40?text=NMN+RBS",
      affiliateUrl: iherb("/pr/renue-by-science-nmn-pure-powder-60g/108789"),
      source: "iherb",
    },
  ],
  "zinc picolinate": [
    {
      id: "zinc-01",
      title: "Zinc Picolinate 30mg",
      brand: "Thorne",
      price: "$18.00",
      imageUrl: "https://placehold.co/200x200/fafafa/37474f?text=Zinc",
      affiliateUrl: iherb("/pr/thorne-research-zinc-picolinate-30-mg-60-capsules/40374"),
      source: "iherb",
    },
    {
      id: "zinc-02",
      title: "Zinc Bisglycinate Chelate 50mg",
      brand: "Pure Encapsulations",
      price: "$22.00",
      imageUrl: "https://placehold.co/200x200/fafafa/37474f?text=Zinc+PE",
      affiliateUrl: amazon("B001GIXE22"),
      source: "amazon",
    },
  ],
  "vitamin b complex methylated": [
    {
      id: "bcomp-01",
      title: "B-Complex with Methylated B12 & Folate",
      brand: "Thorne",
      price: "$26.00",
      imageUrl: "https://placehold.co/200x200/fff8e1/e65100?text=B+Complex",
      affiliateUrl: iherb("/pr/thorne-research-basic-b-complex-60-capsules/21503"),
      source: "iherb",
    },
    {
      id: "bcomp-02",
      title: "Methyl B12 + Methylfolate Complex",
      brand: "Jarrow Formulas",
      price: "$19.99",
      imageUrl: "https://placehold.co/200x200/fff8e1/e65100?text=B+J",
      affiliateUrl: amazon("B00020ICJQ"),
      source: "amazon",
    },
  ],
  "curcumin turmeric": [
    {
      id: "curc-01",
      title: "Meriva Curcumin Phytosome 500mg",
      brand: "Thorne",
      price: "$42.00",
      imageUrl: "https://placehold.co/200x200/fff3e0/bf360c?text=Curc",
      affiliateUrl: iherb("/pr/thorne-research-meriva-soy-free-120-capsules/49003"),
      source: "iherb",
    },
    {
      id: "curc-02",
      title: "Curcumin C3 Complex 500mg with BioPerine",
      brand: "Doctor's Best",
      price: "$26.99",
      imageUrl: "https://placehold.co/200x200/fff3e0/bf360c?text=Curc+DB",
      affiliateUrl: amazon("B000MFIHM4"),
      source: "amazon",
    },
  ],
  "probiotics lactobacillus": [
    {
      id: "prob-01",
      title: "Probiotic 100 Billion CFU 34 Strains",
      brand: "Physician's Choice",
      price: "$29.95",
      imageUrl: "https://placehold.co/200x200/e8f5e9/2e7d32?text=Probiotic",
      affiliateUrl: amazon("B07S7LY7MJ"),
      source: "amazon",
    },
    {
      id: "prob-02",
      title: "Shelf-Stable Probiotics 30 Billion CFU",
      brand: "Jarrow Formulas",
      price: "$24.99",
      imageUrl: "https://placehold.co/200x200/e8f5e9/2e7d32?text=Prob+J",
      affiliateUrl: iherb("/pr/jarrow-formulas-jarro-dophilus-eps-25-billion-60-capsules/1734"),
      source: "iherb",
    },
  ],
  "iron bisglycinate": [
    {
      id: "iron-01",
      title: "Iron Bisglycinate 25mg (Ferrochel)",
      brand: "Thorne",
      price: "$16.00",
      imageUrl: "https://placehold.co/200x200/fce4ec/b71c1c?text=Iron",
      affiliateUrl: iherb("/pr/thorne-research-ferrasorb-60-capsules/38367"),
      source: "iherb",
    },
    {
      id: "iron-02",
      title: "Gentle Iron 25mg Ferrochel",
      brand: "Solgar",
      price: "$12.79",
      imageUrl: "https://placehold.co/200x200/fce4ec/b71c1c?text=Iron+S",
      affiliateUrl: amazon("B00020HN6G"),
      source: "amazon",
    },
  ],
};

// ============================================================
// SEARCH  (fuzzy match against catalog keys)
// ============================================================

export function searchMockCatalog(query: string): CatalogProduct[] {
  const q = query.toLowerCase().trim();

  // Exact key match
  if (CATALOG[q]) return CATALOG[q].slice(0, 2);

  // Word intersection match — find catalog key with most overlapping words
  const queryWords = q.split(/\s+/);
  let bestKey = "";
  let bestScore = 0;

  for (const key of Object.keys(CATALOG)) {
    const keyWords = key.split(/\s+/);
    const score = queryWords.filter((w) => keyWords.some((k) => k.includes(w) || w.includes(k))).length;
    if (score > bestScore) {
      bestScore = score;
      bestKey   = key;
    }
  }

  if (bestScore > 0 && bestKey) return CATALOG[bestKey].slice(0, 2);

  // Fallback: generic supplement placeholder
  return [
    {
      id: `generic-${Date.now()}`,
      title: query.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
      brand: "Various",
      price: "$19.99+",
      imageUrl: `https://placehold.co/200x200/f5f5f5/9e9e9e?text=${encodeURIComponent(query.slice(0, 8))}`,
      affiliateUrl: `https://www.iherb.com/search?kw=${encodeURIComponent(query)}${IHERB ? `&rcode=${IHERB}` : ""}`,
      source: "iherb",
    },
  ];
}
