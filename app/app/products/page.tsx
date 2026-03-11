"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { resolveEvidence } from "@/lib/evidence-utils";
import type { EvidenceStrength } from "@/lib/evidence-utils";
import { extractFirstSentence, remainingAfterFirstSentence } from "@/lib/text-utils";
import { getOptimalRange, getBiomarkerDelta } from "@/lib/biomarker-utils";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { toast } from "sonner";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:        "#07070E",
  surface:   "#0C0C18",
  surfaceUp: "#111120",
  border:    "rgba(255,255,255,0.05)",
  borderMid: "rgba(255,255,255,0.08)",
  borderHi:  "rgba(255,255,255,0.12)",
  textHi:    "rgba(255,255,255,0.92)",
  textMid:   "rgba(255,255,255,0.45)",
  textLo:    "rgba(255,255,255,0.18)",
  textDim:   "rgba(255,255,255,0.08)",
  blue:      "#3B82F6",
  purple:    "#8B5CF6",
  green:     "#10B981",
  amber:     "#F59E0B",
  orange:    "#F97316",
  red:       "#EF4444",
  cyan:      "#06B6D4",
  gradient:  "linear-gradient(135deg, #3B82F6, #8B5CF6)",
  fontDisplay: "'Syne', sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SYSTEMS = ["Metabolic","Hormonal","Cardiovascular","Sleep & Recovery","Cognitive","Performance"];

const PRODUCTS = [
  {
    id:"vitd3k2", rank:1, name:"Vitamin D3 + K2", brand:"Thorne",
    category:"Micronutrient", urgency:"critical",
    urgencyLabel:"Critical Gap", urgencyColor:T.red, cardTint:"rgba(239,68,68,0.035)",
    icon:"D3", iconColor:T.amber,
    biomarkerSignal:"Vitamin D", biomarkerValue:18, biomarkerUnit:"ng/mL",
    rangeZones:[{label:"Deficient",max:30,color:T.red},{label:"Sub-optimal",max:50,color:T.amber},{label:"Optimal",max:80,color:T.green},{label:"Excess",max:120,color:T.amber}],
    rangeMax:120, biomarkerContext:"Optimal: 50–80 ng/mL",
    whyShort:"At 18 ng/mL your Vitamin D is clinically deficient. Below 30 ng/mL suppresses testosterone synthesis and measurably reduces VO₂ max ceiling.",
    whyFull:"At 18 ng/mL your Vitamin D is clinically deficient. Below 30 ng/mL suppresses testosterone synthesis, impairs calcium absorption, and measurably reduces VO₂ max ceiling. K2 directs calcium into bone rather than arterial walls — a non-negotiable co-factor at this deficiency level.",
    protocolNote:"5,000 IU D3 + 100mcg K2 · With fat-containing meal · Morning",
    dosageCheck:"5,000 IU D3 + 100mcg K2 with a fat-containing meal each morning",
    expectedTimeline:"Levels detectable in 4–6 weeks · Retest at 12 weeks", retestWeeks:12,
    evidence:"Strong", evidenceCitations:312,
    systems:{Metabolic:0.6,Hormonal:0.7,Cardiovascular:0.5,"Sleep & Recovery":0.3,Cognitive:0.3,Performance:0.5},
    synergiesWith:["mag"], synergyNote:"Pairs with Magnesium — D3 absorption improves with adequate Mg status.",
    tags:["immune","bone","testosterone","vo₂ max"], filterTags:["foundation","critical"],
    unlockMarkers:null,
    sources:[{name:"iHerb",price:24.95,url:"https://iherb.com"},{name:"Amazon",price:27.00,url:"https://amazon.com"},{name:"Thorne",price:31.00,url:"https://thorne.com"}],
    sourceNotes:{iHerb:"Best price",Amazon:"Prime shipping",Thorne:"Third-party tested · Direct"},
  },
  {
    id:"mag", rank:2, name:"Magnesium Glycinate", brand:"Pure Encapsulations",
    category:"Mineral", urgency:"high",
    urgencyLabel:"High Priority", urgencyColor:T.orange, cardTint:"rgba(249,115,22,0.02)",
    icon:"Mg", iconColor:T.purple,
    biomarkerSignal:"RBC Magnesium", biomarkerValue:4.1, biomarkerUnit:"mg/dL",
    rangeZones:[{label:"Deficient",max:4.2,color:T.red},{label:"Sub-optimal",max:5.2,color:T.amber},{label:"Optimal",max:6.5,color:T.green},{label:"Excess",max:8.0,color:T.amber}],
    rangeMax:8.0, biomarkerContext:"Optimal: 5.2–6.5 mg/dL",
    whyShort:"Your RBC magnesium sits below the deficiency threshold. Overnight HRV recovery is 18% below personal baseline — magnesium deficiency is the primary driver.",
    whyFull:"Your RBC magnesium sits below the deficiency threshold. Overnight HRV recovery is 18% below personal baseline — magnesium deficiency is the primary driver. Glycinate form for superior absorption and sleep quality. Do not stack with zinc at the same dose.",
    protocolNote:"400mg · 30–45 min before sleep · Not with zinc",
    dosageCheck:"400mg magnesium glycinate form, 30–45 minutes before sleep",
    expectedTimeline:"HRV improvement: 3–4 weeks · Sleep latency: 1–2 weeks", retestWeeks:8,
    evidence:"Strong", evidenceCitations:189,
    systems:{Metabolic:0.3,Hormonal:0.4,Cardiovascular:0.5,"Sleep & Recovery":0.9,Cognitive:0.5,Performance:0.4},
    synergiesWith:["glycine"], synergyNote:"Stacks with Glycine — both lower core temperature at sleep onset for compounded deep sleep benefit.",
    tags:["sleep","hrv","recovery","stress","muscle"], filterTags:["sleep","foundation"],
    unlockMarkers:null,
    sources:[{name:"iHerb",price:28.50,url:"https://iherb.com"},{name:"Amazon",price:26.00,url:"https://amazon.com"}],
    sourceNotes:{iHerb:"Best price · Subscribe & Save",Amazon:"Best price"},
  },
  {
    id:"omega3", rank:3, name:"Omega-3 (EPA + DHA)", brand:"Nordic Naturals",
    category:"Essential Fatty Acid", urgency:"high",
    urgencyLabel:"High Priority", urgencyColor:T.orange, cardTint:"rgba(249,115,22,0.02)",
    icon:"Ω3", iconColor:T.blue,
    biomarkerSignal:"Omega-3 Index", biomarkerValue:4.2, biomarkerUnit:"%",
    rangeZones:[{label:"High Risk",max:4.0,color:T.red},{label:"Moderate Risk",max:6.0,color:T.amber},{label:"Optimal",max:12.0,color:T.green},{label:"Excess",max:16.0,color:T.amber}],
    rangeMax:16.0, biomarkerContext:"Optimal: >8%",
    whyShort:"Your Omega-3 Index at 4.2% places you in elevated cardiovascular risk. At your training volume, systemic inflammation is the primary limiter of recovery capacity.",
    whyFull:"Your Omega-3 Index at 4.2% places you in the elevated cardiovascular risk band. At your training volume, systemic inflammation is the primary limiter of recovery capacity. EPA down-regulates the COX-2 inflammatory pathway. DHA supports cognitive function and myelin integrity.",
    protocolNote:"2g EPA+DHA daily · With largest meal · Split AM/PM",
    dosageCheck:"2g combined EPA+DHA (not total fish oil), split across morning and evening meals",
    expectedTimeline:"Index improvement measurable: 8 weeks · Full effect: 16 weeks", retestWeeks:16,
    evidence:"Strong", evidenceCitations:478,
    systems:{Metabolic:0.4,Hormonal:0.3,Cardiovascular:0.9,"Sleep & Recovery":0.5,Cognitive:0.6,Performance:0.5},
    synergiesWith:["vitd3k2"], synergyNote:"Pairs with Vitamin D3 — fat-soluble vitamins share absorption pathways.",
    tags:["heart","inflammation","recovery","brain","joints"], filterTags:["foundation","performance"],
    unlockMarkers:null,
    sources:[{name:"iHerb",price:39.00,url:"https://iherb.com"},{name:"Amazon",price:42.00,url:"https://amazon.com"},{name:"Triathletes.com",price:44.95,url:"https://triathletes.com"}],
    sourceNotes:{iHerb:"Best price",Amazon:"Prime shipping","Triathletes.com":"NSF Certified · Athlete-specific"},
  },
  {
    id:"creatine", rank:4, name:"Creatine Monohydrate", brand:"Creapure",
    category:"Performance", urgency:"moderate",
    urgencyLabel:"Recommended", urgencyColor:T.blue, cardTint:"rgba(59,130,246,0.015)",
    icon:"Cr", iconColor:T.green,
    biomarkerSignal:null, biomarkerValue:null, biomarkerUnit:null,
    rangeZones:null, rangeMax:null,
    biomarkerContext:"No contraindications in panel · Highest ROI ergogenic",
    whyShort:"No contraindications in your bloodwork. Competition prep archetype + 6-day training = highest ROI addition. 247 RCTs confirm across strength, power, and cognitive domains.",
    whyFull:"No contraindications in your bloodwork. Your competition prep archetype and 6-day training frequency make this the single highest ROI addition. 247 RCTs across 40 years confirm efficacy. Monohydrate form only — no evidence supports alternatives.",
    protocolNote:"5g daily · Any time · No loading phase · Monohydrate only",
    dosageCheck:"5g creatine monohydrate (specifically monohydrate, not HCl or ethyl ester) daily",
    expectedTimeline:"Intramuscular saturation: 4 weeks · Performance gains: 4–8 weeks", retestWeeks:null,
    evidence:"Strong", evidenceCitations:247,
    systems:{Metabolic:0.5,Hormonal:0.3,Cardiovascular:0.2,"Sleep & Recovery":0.2,Cognitive:0.5,Performance:0.9},
    synergiesWith:[], synergyNote:null,
    tags:["strength","power","cognition","muscle","endurance"], filterTags:["performance"],
    unlockMarkers:["Testosterone (total & free)","IGF-1","DHEA-S"],
    sources:[{name:"iHerb",price:18.00,url:"https://iherb.com"},{name:"Amazon",price:16.50,url:"https://amazon.com"},{name:"Triathletes.com",price:22.00,url:"https://triathletes.com"}],
    sourceNotes:{iHerb:"Best price",Amazon:"Best price · Creapure certified","Triathletes.com":"Athlete bundle available"},
  },
  {
    id:"glycine", rank:5, name:"Glycine", brand:"Bulk Supplements",
    category:"Amino Acid", urgency:"moderate",
    urgencyLabel:"Recommended", urgencyColor:T.blue, cardTint:"rgba(59,130,246,0.015)",
    icon:"Gly", iconColor:T.cyan,
    biomarkerSignal:"Sleep Quality Score", biomarkerValue:61, biomarkerUnit:"/100",
    rangeZones:[{label:"Poor",max:50,color:T.red},{label:"Fair",max:70,color:T.amber},{label:"Good",max:85,color:T.green},{label:"Excellent",max:100,color:T.blue}],
    rangeMax:100, biomarkerContext:"Trending ↓ 12% over 3 weeks",
    whyShort:"Your sleep quality score declined 12% over 3 weeks per wearable. Glycine lowers core body temperature at sleep onset — shown to increase slow-wave sleep without sedation.",
    whyFull:"Your sleep quality score declined 12% over 3 weeks per wearable data. Glycine lowers core body temperature via peripheral vasodilation — shown in RCTs to reduce sleep latency and increase slow-wave sleep architecture without dependency.",
    protocolNote:"3g · 30 min before sleep · Stack with Magnesium",
    dosageCheck:"3g glycine powder or capsules, 30 minutes before sleep",
    expectedTimeline:"Sleep quality improvement: 1–2 weeks · Deep sleep increase: 2–3 weeks", retestWeeks:3,
    evidence:"Moderate", evidenceCitations:43,
    systems:{Metabolic:0.3,Hormonal:0.2,Cardiovascular:0.2,"Sleep & Recovery":0.85,Cognitive:0.4,Performance:0.3},
    synergiesWith:["mag"], synergyNote:"Stacks with Magnesium Glycinate — both act on sleep onset temperature. Combined effect is greater than either alone.",
    tags:["sleep","deep-sleep","collagen","recovery"], filterTags:["sleep"],
    unlockMarkers:null,
    sources:[{name:"iHerb",price:12.00,url:"https://iherb.com"},{name:"Amazon",price:11.00,url:"https://amazon.com"}],
    sourceNotes:{iHerb:"Best price",Amazon:"Best price · Subscribe & Save"},
  },
];

type SourceStyle = { bg: string; border: string; color: string };
const SOURCE_STYLES: Record<string, SourceStyle> = {
  iHerb:             {bg:"rgba(16,185,129,0.08)", border:"rgba(16,185,129,0.2)",  color:T.green},
  Amazon:            {bg:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.2)",  color:T.amber},
  "Triathletes.com": {bg:"rgba(59,130,246,0.08)", border:"rgba(59,130,246,0.2)",  color:T.blue},
  Thorne:            {bg:"rgba(139,92,246,0.08)", border:"rgba(139,92,246,0.2)",  color:T.purple},
};

const STRENGTH_COLORS: Record<EvidenceStrength, string> = {
  strong:   T.green,
  moderate: T.amber,
  limited:  T.textMid,
};
type FilterTab = "all" | "critical" | "active" | "recommended";
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "critical",    label: "Critical" },
  { key: "active",      label: "Active" },
  { key: "recommended", label: "Recommended" },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
type Product = typeof PRODUCTS[number];
type ProductSource = Product["sources"][number];
type RangeZone = { label: string; max: number; color: string };

const bestPrice  = (p: Product) => Math.min(...p.sources.map((s: ProductSource) => s.price));
const bestSource = (p: Product) => p.sources.find((s: ProductSource) => s.price === bestPrice(p));

// Phase 2 fix: construct proper search deep-links for each retailer
function buildSearchUrl(sourceName: string, productName: string, brand: string): string {
  const q = encodeURIComponent(`${productName} ${brand}`.trim());
  switch (sourceName) {
    case "Amazon":
      return `https://www.amazon.com/s?k=${q}`;
    case "iHerb":
      return `https://www.iherb.com/search?kw=${encodeURIComponent(productName)}`;
    case "Thorne":
      return `https://www.thorne.com/search#q=${encodeURIComponent(productName)}`;
    case "Triathletes.com":
      return `https://triathletes.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}+supplement`;
  }
}

// Replace static homepage URLs with live search deep-links at render time
function resolveSourceUrl(source: ProductSource, productName: string, brand: string): string {
  return buildSearchUrl(source.name, productName, brand);
}

function downloadICS(product: Product, onDone?: () => void): void {
  const now = new Date();
  const d   = new Date(now.getTime() + (product.retestWeeks ?? 0) * 7 * 86400000);
  const fmt = (x: Date) => x.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Blue Zone//EN","BEGIN:VEVENT",
    `DTSTART:${fmt(d)}`,`DTEND:${fmt(new Date(d.getTime()+3600000))}`,
    `SUMMARY:Blue Zone Retest: ${product.name}`,`DESCRIPTION:Retest ${product.biomarkerSignal||product.name}.`,
    "END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  const blobUrl = URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));
  a.href = blobUrl; a.download = `retest-${product.id}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  onDone?.();
}

function getCoverage(products: Product[]): Record<string, number> {
  const c: Record<string, number> = {};
  SYSTEMS.forEach(s => { c[s] = 0; });
  products.forEach(p => SYSTEMS.forEach(s => { c[s] = Math.min(1,(c[s]||0)+((p.systems as Record<string,number>)[s]||0)); }));
  return c;
}
function getRetailerBreakdown(products: Product[]): Record<string, number> {
  const bd: Record<string, number> = {};
  products.forEach(p => { const s = bestSource(p); if (s) bd[s.name] = (bd[s.name]||0) + s.price; });
  return bd;
}
function uniqueIds(a: string[], b: string[]): string[] { return Array.from(new Set([...a,...b])); }

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals=0 }: { value: number; decimals?: number }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value), raf = useRef<number | null>(null), mount = useRef(false);
  useEffect(() => {
    if (!mount.current) { mount.current = true; return; }
    const from = prev.current, to = value;
    if (from === to) return;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const start = performance.now(), dur = 420;
    const tick = (now: number) => {
      const t = Math.min((now-start)/dur,1), e = 1-Math.pow(1-t,3);
      const v = from+(to-from)*e;
      setDisp(decimals===0?Math.round(v):v);
      if(t<1) raf.current=requestAnimationFrame(tick);
      else { setDisp(to); prev.current=to; }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span>{decimals===0?Math.round(disp):Number(disp).toFixed(decimals)}</span>;
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────
function SkeletonCard({ index }: { index: number }) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:20,animation:"fadeUp 0.4s ease both",animationDelay:`${index*0.07}s`}}>
      {[["65%",10],["85%",22],["50%",10]].map(([w,h],i)=>(
        <div key={i} style={{height:h,width:w,background:T.textDim,borderRadius:6,marginBottom:14,animation:"shimmer 1.6s ease-in-out infinite",animationDelay:`${i*0.15}s`}}/>
      ))}
      <div style={{height:60,background:"rgba(255,255,255,0.025)",borderRadius:12,marginBottom:14,animation:"shimmer 1.6s ease-in-out infinite"}}/>
      {[["100%",9],["75%",9],["55%",9]].map(([w,h],i)=>(
        <div key={i} style={{height:h,width:w,background:"rgba(255,255,255,0.025)",borderRadius:5,marginBottom:10,animation:"shimmer 1.6s ease-in-out infinite",animationDelay:`${i*0.1}s`}}/>
      ))}
      <div style={{height:44,background:"rgba(255,255,255,0.025)",borderRadius:12,marginTop:18,animation:"shimmer 1.6s ease-in-out infinite"}}/>
    </div>
  );
}

// ─── PROTOCOL INTELLIGENCE PANEL (collapsed by default) ──────────────────────
// System short labels for narrow columns
const SYS_SHORT: Record<string, string> = {
  "Metabolic":"Metab.", "Hormonal":"Hormonal", "Cardiovascular":"Cardio",
  "Sleep & Recovery":"Sleep", "Cognitive":"Cognitive", "Performance":"Perform."
};

function ProtocolHeader({
  confirmedProds, plannedProds, allProducts, allActive, activeCost, totalCost, onScrollToProduct,
}: {
  confirmedProds: Product[];
  plannedProds:   Product[];
  allProducts:    Product[];
  allActive:      string[];
  activeCost:     number;
  totalCost:      number;
  onScrollToProduct: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const confirmedCov = getCoverage(confirmedProds);
  const plannedCov   = getCoverage(plannedProds);
  const confirmedPct = Math.round(SYSTEMS.reduce((s,sys)=>s+Math.min(confirmedCov[sys]||0,1),0)/SYSTEMS.length*100);
  const gaps         = SYSTEMS.filter(s=>(confirmedCov[s]||0)<0.2);
  const addedCount   = allActive.length;
  const criticalProd = allProducts.find(p=>p.urgency==="critical") ?? null;

  // Plain-language collapsed summary derived from live gap data
  const summary = (() => {
    const n = gaps.length;
    const base = `Your panel shows ${n} system gap${n===1?"":"s"}.`;
    if (!criticalProd) return base;
    return `${base} 1 is clinically significant — ${extractFirstSentence(criticalProd.whyShort)}`;
  })();

  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,
      padding:"20px 24px",marginBottom:20,animation:"fadeUp 0.4s ease both",animationDelay:"0.05s"}}>

      {/* ── Collapsed header — always visible ── */}
      <p style={{fontFamily:T.fontMono,fontSize:9,letterSpacing:"0.16em",color:T.textLo,
        textTransform:"uppercase",marginBottom:8}}>Protocol Intelligence</p>
      <p style={{fontFamily:T.fontDisplay,fontSize:13,color:T.textMid,lineHeight:1.65,marginBottom:12}}>
        {summary}
      </p>
      <button
        onClick={()=>setExpanded(e=>!e)}
        style={{background:"none",border:"none",cursor:"pointer",padding:0,
          display:"inline-flex",alignItems:"center",gap:5,
          fontFamily:T.fontDisplay,fontSize:11,fontWeight:600,color:T.textLo,
          transition:"color 0.15s"}}>
        {expanded?"Hide protocol intelligence":"Show protocol intelligence"}
        <span style={{fontSize:10,display:"inline-block",transition:"transform 0.2s",
          transform:expanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
      </button>

      {/* ── Expanded body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="panel-body"
            initial={{height:0,opacity:0}}
            animate={{height:"auto",opacity:1}}
            exit={{height:0,opacity:0}}
            transition={{duration:0.25,ease:"easeInOut"}}
            style={{overflow:"hidden"}}
          >
            <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${T.border}`}}>

              {/* Stats row + cost */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                marginBottom:18,flexWrap:"wrap",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontFamily:T.fontDisplay,fontSize:14,fontWeight:700,
                    color:confirmedPct>60?T.green:confirmedPct>20?T.amber:T.textMid}}>
                    {confirmedPct}% confirmed
                  </span>
                  {addedCount < PRODUCTS.length && (
                    <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>
                      · {PRODUCTS.length - addedCount} unaddressed
                    </span>
                  )}
                  {gaps.length > 0 && (
                    <span style={{fontFamily:T.fontDisplay,fontSize:10,color:T.red,
                      background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",
                      borderRadius:99,padding:"2px 9px",fontWeight:600}}>
                      {gaps.length} system gap{gaps.length>1?"s":""}
                    </span>
                  )}
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontFamily:T.fontMono,fontSize:9,color:T.textLo,marginBottom:3,
                    letterSpacing:"0.1em"}}>ACTIVE / MO</p>
                  <p style={{fontFamily:T.fontMono,fontSize:15,fontWeight:700,color:T.textHi}}>
                    $<AnimatedNumber value={Math.round(activeCost)}/>
                    <span style={{fontSize:10,color:T.textLo,fontWeight:400}}> of ~${Math.round(totalCost)}</span>
                  </p>
                </div>
              </div>

              {/* System coverage bars */}
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {SYSTEMS.map(s => {
                  const cPct     = Math.min(100, Math.round((confirmedCov[s]||0)*100));
                  const pPct     = Math.min(100, Math.round((plannedCov[s]||0)*100));
                  const extraPct = Math.min(100, cPct + pPct) - cPct;
                  const isGap    = cPct < 20;
                  const col      = cPct >= 60 ? T.green : cPct >= 25 ? T.amber : T.textLo;
                  return (
                    <div key={s} style={{display:"flex",alignItems:"center",gap:10}}>
                      <p style={{fontFamily:T.fontMono,fontSize:9,
                        color:isGap?T.red:T.textLo,width:90,flexShrink:0,
                        letterSpacing:"0.03em",textAlign:"right",fontWeight:isGap?600:400}}>
                        {SYS_SHORT[s] ?? s}
                      </p>
                      <div style={{flex:1,height:5,background:"rgba(255,255,255,0.04)",
                        borderRadius:99,overflow:"hidden",position:"relative"}}>
                        {extraPct > 0 && (
                          <div style={{position:"absolute",left:`${cPct}%`,top:0,height:"100%",
                            width:`${extraPct}%`,background:"rgba(59,130,246,0.2)",
                            borderRadius:"0 99px 99px 0",transition:"width 0.5s ease"}}/>
                        )}
                        <div style={{height:"100%",width:`${cPct}%`,background:col,borderRadius:99,
                          transition:"width 0.5s ease",
                          boxShadow:cPct>0?`0 0 5px ${col}60`:"none"}}/>
                      </div>
                      <p style={{fontFamily:T.fontMono,fontSize:9,color:isGap?T.red:col,
                        width:36,flexShrink:0,textAlign:"right",fontWeight:600}}>
                        {cPct}%
                        {extraPct > 0 && (
                          <span style={{color:"rgba(59,130,246,0.5)",fontWeight:400,fontSize:8}}>
                            {" "}+{extraPct}
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* System alert */}
              {gaps.length > 0 && (() => {
                const used   = new Set(allActive);
                const topGap = gaps[0];
                const next   = allProducts
                  .filter(p=>!used.has(p.id))
                  .sort((a,b)=>((a.systems as Record<string,number>)[topGap]||0) < ((b.systems as Record<string,number>)[topGap]||0) ? 1 : -1)[0];
                if (!next) return null;
                return (
                  <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`,
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:T.red,
                        flexShrink:0,boxShadow:`0 0 6px ${T.red}`}}/>
                      <p style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textMid,lineHeight:1.5}}>
                        <span style={{color:T.textHi,fontWeight:700}}>{topGap}</span>{" "}
                        uncovered · Add{" "}
                        <span style={{color:T.blue}}>{next.name}</span> to close it
                      </p>
                    </div>
                    <button onClick={()=>onScrollToProduct(next.id)}
                      style={{flexShrink:0,padding:"7px 14px",background:"rgba(59,130,246,0.08)",
                        border:"1px solid rgba(59,130,246,0.2)",borderRadius:9,fontFamily:T.fontDisplay,
                        fontSize:11,fontWeight:700,color:T.blue,cursor:"pointer",whiteSpace:"nowrap",
                        transition:"background 0.15s"}}>
                      View →
                    </button>
                  </div>
                );
              })()}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BIOMARKER HERO DISPLAY ───────────────────────────────────────────────────
function BiomarkerHero({ product, previousValue }: { product: Product; previousValue?: number }) {
  const { rangeZones, rangeMax, biomarkerValue, biomarkerUnit, biomarkerSignal, biomarkerContext } = product;
  if (!rangeZones || biomarkerValue === null) return null;

  const pct     = (v: number) => Math.min(Math.max((v / rangeMax) * 100, 0), 100);
  const vPct    = pct(biomarkerValue);
  const prevPct = previousValue != null ? pct(previousValue) : null;

  const zone = rangeZones.find((z: RangeZone, i: number) => {
    const prev = i === 0 ? 0 : rangeZones[i - 1].max;
    return biomarkerValue >= prev && biomarkerValue <= z.max;
  }) || rangeZones[0];

  const optRange = getOptimalRange(rangeZones, T.green);
  const delta    = optRange
    ? getBiomarkerDelta(biomarkerValue, optRange.optimalMin, optRange.optimalMax, biomarkerUnit)
    : null;

  const lineLeft   = prevPct !== null ? Math.min(vPct, prevPct) : 0;
  const lineWidth  = prevPct !== null ? Math.abs(vPct - prevPct) : 0;
  const lineOrigin = prevPct !== null && prevPct < vPct ? "left center" : "right center";

  return (
    <div style={{marginBottom:18}}>
      {/* Hero value — zone badge removed; dot position communicates zone */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <p style={{fontFamily:T.fontMono,fontSize:9,letterSpacing:"0.14em",color:T.textLo,textTransform:"uppercase",marginBottom:6}}>
            {biomarkerSignal}
          </p>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontFamily:T.fontMono,fontSize:44,fontWeight:700,lineHeight:1,color:zone.color,
              textShadow:`0 0 30px ${zone.color}50`}}>
              {biomarkerValue}
            </span>
            <span style={{fontFamily:T.fontMono,fontSize:13,color:zone.color,opacity:0.55,marginBottom:4}}>
              {biomarkerUnit}
            </span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontFamily:T.fontMono,fontSize:9,color:T.textLo}}>{biomarkerContext}</p>
        </div>
      </div>

      {/* Range bar — 16px wrapper so 14px dots aren't clipped by overflow:hidden */}
      <div style={{position:"relative",height:16,marginBottom:5}}>

        {/* Colored zones — own div with overflow:hidden for rounded corners */}
        <div style={{display:"flex",height:12,borderRadius:99,overflow:"hidden",
          position:"absolute",top:"50%",left:0,right:0,transform:"translateY(-50%)"}}>
          {rangeZones.map((z: RangeZone, i: number) => {
            const prev = i === 0 ? 0 : rangeZones[i - 1].max;
            return <div key={z.label} style={{width:`${pct(z.max)-pct(prev)}%`,height:"100%",background:z.color,opacity:0.18}}/>;
          })}
        </div>

        {/* Ghost dot — previous value */}
        {prevPct !== null && (
          <div style={{position:"absolute",left:`${prevPct}%`,top:"50%",width:10,height:10,
            borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.25)",
            transform:"translate(-50%,-50%)",zIndex:2}}/>
        )}

        {/* Connecting line — animated scaleX on mount */}
        {prevPct !== null && lineWidth > 0 && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            style={{position:"absolute",left:`${lineLeft}%`,width:`${lineWidth}%`,
              height:2,top:"calc(50% - 1px)",
              background:"rgba(255,255,255,0.12)",
              transformOrigin:lineOrigin,zIndex:2}}
          />
        )}

        {/* Current value — hairline + filled dot */}
        <div style={{position:"absolute",left:`${vPct}%`,top:0,bottom:0,width:2,background:"white",
          transform:"translateX(-50%)",boxShadow:"0 0 8px rgba(255,255,255,0.8)",borderRadius:99,zIndex:3}}/>
        <div style={{position:"absolute",left:`${vPct}%`,top:"50%",width:14,height:14,borderRadius:"50%",
          background:zone.color,border:"2px solid rgba(7,7,14,0.9)",transform:"translate(-50%,-50%)",
          zIndex:4,boxShadow:`0 0 12px ${zone.color}90`}}/>
      </div>

      {/* Zone labels */}
      <div style={{display:"flex",marginBottom:delta ? 5 : 0}}>
        {rangeZones.map((z: RangeZone, i: number) => {
          const prev = i === 0 ? 0 : rangeZones[i - 1].max;
          return (
            <div key={z.label} style={{width:`${pct(z.max)-pct(prev)}%`,fontFamily:T.fontMono,fontSize:8,
              color:z.color,opacity:0.4,overflow:"hidden",whiteSpace:"nowrap"}}>
              {z.label}
            </div>
          );
        })}
      </div>

      {/* Distance micro-stat */}
      {delta && (
        <p style={{fontFamily:T.fontMono,fontSize:11,color:T.textLo,letterSpacing:"0.01em"}}>
          {delta.status === "within"
            ? "Within optimal range"
            : `${delta.direction} ${delta.delta} ${delta.unit} to ${delta.status === "below" ? "reach" : "reduce to"} optimal`}
        </p>
      )}
    </div>
  );
}

// ─── SOURCE TABLE ─────────────────────────────────────────────────────────────
function SourceTable({ product, srcIdx, setSrcIdx }: { product: Product; srcIdx: number; setSrcIdx: (i: number) => void }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const [hoverIdx, setHoverIdx]       = useState(-1);
  const [bestLoading, setBestLoading] = useState(false);

  const sourceNotes = product.sourceNotes as unknown as Record<string, string> | undefined;
  const bestIdx    = product.sources.indexOf(product.sources.reduce((a: ProductSource, b: ProductSource) => a.price < b.price ? a : b));
  const bestSource = product.sources[bestIdx];
  const bestSrcSt  = SOURCE_STYLES[bestSource.name] || SOURCE_STYLES["iHerb"];

  const handleBestClick = () => {
    setBestLoading(true);
    const url = resolveSourceUrl(bestSource, product.name, product.brand);
    setTimeout(() => { window.open(url, "_blank", "noopener"); setBestLoading(false); }, 700);
  };

  return (
    <div style={{marginBottom:8}}>
      {/* Best-price CTA — primary purchase button */}
      <button
        onClick={handleBestClick}
        style={{width:"100%",padding:"11px 16px",
          background:bestLoading?"rgba(16,185,129,0.08)":bestSrcSt.bg,
          border:`1px solid ${bestLoading?"rgba(16,185,129,0.22)":bestSrcSt.border}`,
          borderRadius:10,fontFamily:T.fontDisplay,fontSize:12,fontWeight:600,
          color:bestLoading?T.green:bestSrcSt.color,
          cursor:"pointer",transition:"all 0.2s",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>{bestLoading ? "Opening…" : `Best: ${bestSource.name}`}</span>
        {!bestLoading && (
          <span style={{fontFamily:T.fontMono,fontSize:12,fontWeight:700}}>
            ${bestSource.price.toFixed(2)} →
          </span>
        )}
      </button>

      {/* Compare prices toggle — only shown when >1 retailer */}
      {product.sources.length > 1 && (
        <button
          onClick={() => setCompareOpen(o => !o)}
          style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.fontDisplay,
            fontSize:11,color:T.textLo,padding:"5px 0 0",display:"block",letterSpacing:"0.01em"}}>
          {compareOpen ? "Hide ▴" : "Compare prices ▾"}
        </button>
      )}

      {/* Expandable comparison rows */}
      <AnimatePresence>
        {compareOpen && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.22, ease:"easeInOut" }}
            style={{overflow:"hidden",marginTop:8}}>
            <div style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
              {product.sources.map((s: ProductSource, i: number) => {
                const ss    = SOURCE_STYLES[s.name] || SOURCE_STYLES["iHerb"];
                const isSel = srcIdx === i;
                const isBst = i === bestIdx;
                const isHov = hoverIdx === i && !isSel;
                return (
                  <button key={s.name} onClick={() => setSrcIdx(i)}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(-1)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                      padding:"11px 14px",cursor:"pointer",textAlign:"left",
                      background:isSel?ss.bg:isHov?"rgba(255,255,255,0.025)":"transparent",
                      borderBottom:i<product.sources.length-1?`1px solid ${T.border}`:"none",
                      border:"none",
                      borderLeft:isSel?`3px solid ${ss.color}`:isHov?`3px solid rgba(255,255,255,0.1)`:"3px solid transparent",
                      transition:"background 0.12s, border-color 0.12s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:8,height:8,borderRadius:"50%",
                        background:isSel?ss.color:isHov?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)",
                        boxShadow:isSel?`0 0 6px ${ss.color}`:"none",transition:"all 0.12s"}}/>
                      <span style={{fontFamily:T.fontDisplay,fontSize:12,fontWeight:isSel?700:500,
                        color:isSel?ss.color:isHov?T.textMid:"rgba(255,255,255,0.3)",transition:"color 0.12s"}}>
                        {s.name}
                      </span>
                      {isBst && (
                        <span style={{fontFamily:T.fontMono,fontSize:8,fontWeight:800,background:T.green,
                          color:"white",padding:"2px 6px",borderRadius:4,letterSpacing:"0.06em"}}>
                          BEST
                        </span>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {sourceNotes?.[s.name] && (
                        <span style={{fontFamily:T.fontDisplay,fontSize:10,
                          color:isSel?ss.color:"rgba(255,255,255,0.15)"}}>
                          {sourceNotes[s.name].split("·")[0].trim()}
                        </span>
                      )}
                      <span style={{fontFamily:T.fontMono,fontSize:13,fontWeight:700,
                        color:isSel?ss.color:isHov?T.textMid:"rgba(255,255,255,0.3)",transition:"color 0.12s"}}>
                        ${s.price.toFixed(2)}
                      </span>
                      {isSel && (
                        <span style={{fontFamily:T.fontMono,fontSize:9,color:ss.color,opacity:0.5}}>↗</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TAKING PILL TOGGLE ───────────────────────────────────────────────────────
// ─── TAG PILL ─────────────────────────────────────────────────────────────────
function TagWithTooltip({ tag, allProducts, onFilter }: { tag: string; allProducts: Product[]; onFilter: (t: string) => void }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = allProducts.filter(p=>p.tags.includes(tag)).length;
  const enter = () => { if (timer.current !== null) clearTimeout(timer.current); setShow(true); };
  const leave = () => { timer.current = setTimeout(()=>setShow(false),150); };
  return (
    <div style={{position:"relative",display:"inline-block"}} onMouseEnter={enter} onMouseLeave={leave}>
      <button onClick={()=>onFilter(tag)}
        style={{fontFamily:T.fontMono,fontSize:9,color:T.textLo,background:"rgba(255,255,255,0.025)",
          border:`1px solid ${T.border}`,padding:"3px 8px",borderRadius:6,
          letterSpacing:"0.04em",cursor:"pointer",transition:"all 0.15s"}}>
        {tag}
      </button>
      {show && (
        <div onMouseEnter={enter} onMouseLeave={leave}
          style={{position:"absolute",bottom:"calc(100% + 7px)",left:"50%",transform:"translateX(-50%)",
            background:T.surfaceUp,border:`1px solid ${T.borderMid}`,borderRadius:9,
            padding:"6px 12px",whiteSpace:"nowrap",zIndex:50}}>
          <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.textMid,fontWeight:600}}>
            {count} product{count!==1?"s":""} tagged &quot;{tag}&quot;
          </p>
          <div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%) rotate(45deg)",
            width:8,height:8,background:T.surfaceUp,
            borderRight:`1px solid ${T.borderMid}`,borderBottom:`1px solid ${T.borderMid}`}}/>
        </div>
      )}
    </div>
  );
}

// ─── BATCH DOSAGE MODAL ───────────────────────────────────────────────────────
type DosageResult = { confirmed: boolean; dose: string | null };
function BatchDosageModal({ products, dosageHistory, onComplete, onClose }: {
  products: Product[];
  dosageHistory: Record<string, string>;
  onComplete: (results: Record<string, DosageResult>) => void;
  onClose: () => void;
}) {
  const [idx, setIdx]     = useState(0);
  const [results, setResults] = useState<Record<string, DosageResult>>({});
  const [step, setStep]   = useState("confirm");
  const [dose, setDose]   = useState("");

  const product = products[idx];
  const isLast  = idx === products.length - 1;
  const prevDose = dosageHistory[product?.id];

  useEffect(() => {
    setStep("confirm");
    setDose(dosageHistory[products[idx]?.id] || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!product) return null;

  const advance = (result: DosageResult) => {
    const updated = {...results, [product.id]: result};
    if (isLast) onComplete(updated);
    else { setResults(updated); setIdx(i=>i+1); }
  };
  const goBack = () => { if (step==="correct") setStep("confirm"); else if (idx>0) setIdx(i=>i-1); };
  const showBack = step==="correct" || idx>0;

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(7,7,14,0.94)",
      backdropFilter:"blur(28px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={onClose}>
      <div style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:24,
        padding:28,width:"100%",maxWidth:420,animation:"fadeUp 0.3s ease"}}
        onClick={e=>e.stopPropagation()}>
        {products.length>1 && (
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <div style={{flex:1,height:2,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${((idx+1)/products.length)*100}%`,
                background:T.gradient,borderRadius:99,transition:"width 0.3s ease"}}/>
            </div>
            <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo,flexShrink:0}}>{idx+1} / {products.length}</span>
          </div>
        )}
        {step==="confirm" ? (
          <>
            <p style={{fontFamily:T.fontMono,fontSize:9,letterSpacing:"0.16em",color:T.green,textTransform:"uppercase",marginBottom:10}}>
              {prevDose?"Re-confirm Dosage":"Confirm Dosage"}
            </p>
            <p style={{fontFamily:T.fontDisplay,fontSize:17,fontWeight:800,color:T.textHi,marginBottom:12}}>{product.name}</p>
            {prevDose && (
              <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:10,padding:"9px 12px",marginBottom:12}}>
                <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.amber,fontWeight:600,marginBottom:2}}>Previously noted</p>
                <p style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>{prevDose}</p>
              </div>
            )}
            <p style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,lineHeight:1.6,marginBottom:12}}>
              {prevDose?"Still taking:":"Are you currently taking:"}
            </p>
            <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.15)",borderRadius:12,padding:"13px 15px",marginBottom:18}}>
              <p style={{fontFamily:T.fontMono,fontSize:11,color:T.green,lineHeight:1.7}}>{product.dosageCheck}</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:showBack?8:0}}>
              <button onClick={()=>advance({confirmed:true,dose:null})}
                style={{flex:1,padding:12,background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",
                  borderRadius:10,fontFamily:T.fontDisplay,fontSize:12,fontWeight:700,color:T.green,cursor:"pointer"}}>
                Yes, confirmed ✓
              </button>
              <button onClick={()=>setStep("correct")}
                style={{padding:"12px 15px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
                  borderRadius:10,fontFamily:T.fontDisplay,fontSize:12,color:T.amber,cursor:"pointer"}}>
                Not exactly
              </button>
            </div>
            {showBack && (
              <button onClick={goBack} style={{width:"100%",padding:7,background:"none",border:"none",
                cursor:"pointer",fontFamily:T.fontDisplay,fontSize:11,color:T.textLo}}>← Back</button>
            )}
          </>
        ) : (
          <>
            <p style={{fontFamily:T.fontMono,fontSize:9,letterSpacing:"0.16em",color:T.amber,textTransform:"uppercase",marginBottom:10}}>Protocol Discrepancy</p>
            <p style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.textHi,marginBottom:10}}>{product.name}</p>
            <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.12)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
              <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.amber,fontWeight:700,marginBottom:3}}>Protocol requires</p>
              <p style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo,lineHeight:1.6}}>{product.dosageCheck}</p>
            </div>
            <p style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,marginBottom:8}}>What are you currently taking?</p>
            <input value={dose} onChange={e=>setDose(e.target.value)} placeholder='e.g. "2.5g daily"'
              style={{width:"100%",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.borderMid}`,
                borderRadius:10,padding:"11px 14px",fontFamily:T.fontMono,fontSize:11,color:T.textHi,
                marginBottom:10,outline:"none"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>advance({confirmed:false,dose:dose||"unspecified"})}
                style={{flex:1,padding:12,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",
                  borderRadius:10,fontFamily:T.fontDisplay,fontSize:12,fontWeight:700,color:T.amber,cursor:"pointer"}}>
                Save discrepancy
              </button>
              <button onClick={goBack}
                style={{padding:"12px 15px",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,
                  borderRadius:10,fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,cursor:"pointer"}}>
                ← Revise
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SHARE MODAL ─────────────────────────────────────────────────────────────
function ShareModal({ activeStackProds, takingProds, dosageFlags, activeCost, onClose }: {
  activeStackProds: Product[];
  takingProds: Product[];
  dosageFlags: Record<string, string>;
  activeCost: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const allShown = Array.from(new Map([...takingProds,...activeStackProds].map(p=>[p.id,p] as [string, Product])).values());
  const hasDiscrepancies = allShown.some(p=>dosageFlags[p.id]);
  const getDose = (p: Product) => dosageFlags[p.id] || p.protocolNote;
  const copy = () => {
    const txt = ["My Blue Zone Competition Prep Stack",
      `${allShown.length} products · ~$${Math.round(activeCost)}/mo`,"",
      ...allShown.map(p=>`• ${p.name}${dosageFlags[p.id]?" ⚠":""} (${getDose(p)})`),
      "",hasDiscrepancies?"⚠ Some doses are below protocol threshold.":"",
      "Generated via Blue Zone"].filter(l=>l!==undefined).join("\n");
    navigator.clipboard?.writeText(txt).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2200);
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(7,7,14,0.94)",
      backdropFilter:"blur(28px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
      onClick={onClose}>
      <div style={{width:"100%",maxWidth:480,animation:"fadeUp 0.3s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:"linear-gradient(145deg,#0C0C18,#111120)",border:`1px solid ${T.borderMid}`,
          borderRadius:24,overflow:"hidden",marginBottom:10}}>
          <div style={{background:"linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))",
            borderBottom:`1px solid ${T.border}`,padding:"22px 24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:10,background:T.gradient,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:T.fontDisplay,fontWeight:800,fontSize:12,color:"white"}}>BZ</div>
                <div>
                  <p style={{fontFamily:T.fontDisplay,fontSize:11,fontWeight:700,color:T.textHi}}>Blue Zone</p>
                  <p style={{fontFamily:T.fontDisplay,fontSize:9,color:T.textLo}}>Longevity Intelligence</p>
                </div>
              </div>
              <div style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.18)",
                borderRadius:99,padding:"4px 11px"}}>
                <span style={{fontFamily:T.fontMono,fontSize:9,color:T.blue,fontWeight:600}}>Mar 2025</span>
              </div>
            </div>
            <h2 style={{fontFamily:T.fontDisplay,fontSize:20,fontWeight:800,color:T.textHi,marginBottom:3}}>
              Or&apos;s Competition Prep Stack
            </h2>
            <p style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textLo}}>{allShown.length} biomarker-matched products</p>
          </div>
          {hasDiscrepancies && (
            <div style={{background:"rgba(245,158,11,0.05)",borderBottom:`1px solid rgba(245,158,11,0.12)`,
              padding:"10px 24px",display:"flex",gap:8,alignItems:"center"}}>
              <span>⚠</span>
              <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.amber,lineHeight:1.5}}>
                Some doses are below protocol threshold.
              </p>
            </div>
          )}
          <div style={{padding:"16px 24px"}}>
            {allShown.map((p,i)=>{
              const flag = dosageFlags[p.id];
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                  borderBottom:i<allShown.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`${p.iconColor}12`,
                    border:`1px solid ${p.iconColor}20`,display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:T.fontMono,fontSize:10,fontWeight:700,color:p.iconColor,flexShrink:0}}>
                    {p.icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                      <p style={{fontFamily:T.fontDisplay,fontSize:12,fontWeight:700,
                        color:flag?T.amber:T.textMid}}>{p.name}</p>
                      {flag && <span style={{fontSize:9,color:T.amber}}>⚠</span>}
                    </div>
                    <p style={{fontFamily:T.fontMono,fontSize:9,color:flag?T.amber:T.textLo}}>{getDose(p)}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontFamily:T.fontMono,fontSize:12,color:T.green,fontWeight:600}}>${bestPrice(p).toFixed(2)}</p>
                    <p style={{fontFamily:T.fontDisplay,fontSize:9,color:T.textLo}}>{bestSource(p)?.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,padding:"12px 24px",display:"flex",
            justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.01)"}}>
            <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.textLo}}>From biomarker analysis</p>
            <p style={{fontFamily:T.fontMono,fontSize:13,fontWeight:700,color:T.textHi}}>
              ~${Math.round(activeCost)}<span style={{fontSize:9,color:T.textLo,fontWeight:400}}>/mo</span>
            </p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={copy}
            style={{flex:1,padding:13,background:copied?"rgba(16,185,129,0.1)":"rgba(59,130,246,0.1)",
              border:`1px solid ${copied?"rgba(16,185,129,0.25)":"rgba(59,130,246,0.25)"}`,
              borderRadius:12,fontFamily:T.fontDisplay,fontSize:12,fontWeight:700,
              color:copied?T.green:T.blue,cursor:"pointer",transition:"all 0.2s"}}>
            {copied?"✓ Copied":"Copy as text"}
          </button>
          <button onClick={onClose}
            style={{padding:"13px 18px",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`,
              borderRadius:12,fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,cursor:"pointer"}}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STICKY HEADER ────────────────────────────────────────────────────────────
function StickyHeader({ activeCost, addedCount, total, scrolled, onShare, canShare }: { activeCost: number; addedCount: number; total: number; scrolled: boolean; onShare: () => void; canShare: boolean }) {
  if (!scrolled) return null;
  return (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(7,7,14,0.96)",
      backdropFilter:"blur(28px)",borderBottom:`1px solid ${T.border}`,
      padding:"10px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",
      animation:"slideFromTop 0.25s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:28,height:28,borderRadius:8,background:T.gradient,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:T.fontDisplay,fontWeight:800,fontSize:11,color:"white"}}>BZ</div>
        <span style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:14,color:T.textHi}}>
          Or&apos;s Competition Prep Stack
        </span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {addedCount>0 ? <>
          <div style={{height:3,width:80,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(addedCount/total)*100}%`,background:T.gradient,
              borderRadius:99,transition:"width 0.4s ease"}}/>
          </div>
          <span style={{fontFamily:T.fontMono,fontSize:10,color:T.blue,fontWeight:600}}>{addedCount}/{total}</span>
          <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>
            $<AnimatedNumber value={Math.round(activeCost)}/>/mo
          </span>
          {canShare && (
            <button onClick={onShare}
              style={{padding:"5px 12px",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",
                borderRadius:99,fontFamily:T.fontDisplay,fontSize:10,fontWeight:700,color:T.purple,cursor:"pointer"}}>
              ↗ Share
            </button>
          )}
        </> : <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>No products active</span>}
      </div>
    </div>
  );
}

// ─── GRADUATION STATE ─────────────────────────────────────────────────────────
function GraduationState({ allActiveProds, takingProds, activeCost, onShare }: { allActiveProds: Product[]; takingProds: Product[]; activeCost: number; onShare: () => void }) {
  const primaryFromTaking = takingProds.length >= allActiveProds.length/2;
  return (
    <div style={{background:"linear-gradient(135deg,rgba(59,130,246,0.06),rgba(139,92,246,0.06))",
      border:"1px solid rgba(59,130,246,0.18)",borderRadius:24,padding:"40px 32px",textAlign:"center",
      marginBottom:20,animation:"fadeUp 0.5s ease both",position:"relative",overflow:"visible"}}>
      <div style={{position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:240,height:240,
        borderRadius:"50%",border:"1px solid rgba(59,130,246,0.05)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",width:170,height:170,
        borderRadius:"50%",border:"1px solid rgba(59,130,246,0.035)",pointerEvents:"none"}}/>
      <div style={{position:"relative",width:68,height:68,margin:"0 auto 20px"}}>
        <div style={{position:"absolute",inset:-6,borderRadius:"50%",border:"1px dashed rgba(59,130,246,0.22)",animation:"spinSlow 12s linear infinite"}}/>
        <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.18))",
          border:"1px solid rgba(59,130,246,0.28)",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 0 32px rgba(59,130,246,0.14)"}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke={T.blue} strokeWidth="1.5" fill="rgba(59,130,246,0.14)" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <p style={{fontFamily:T.fontMono,fontSize:9,fontWeight:700,letterSpacing:"0.18em",color:T.blue,textTransform:"uppercase",marginBottom:8}}>Protocol Complete</p>
      {primaryFromTaking ? (
        <>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:800,color:T.textHi,marginBottom:8,lineHeight:1.2}}>You&apos;re already running the protocol.</h2>
          <p style={{fontFamily:T.fontDisplay,fontSize:13,color:T.textLo,lineHeight:1.75,maxWidth:400,margin:"0 auto 26px"}}>
            All {allActiveProds.length} supplements confirmed active. Log your first check-in to establish a baseline.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button style={{padding:"12px 24px",background:T.gradient,border:"none",borderRadius:12,
              fontFamily:T.fontDisplay,fontSize:13,fontWeight:700,color:"white",cursor:"pointer"}}>
              Log First Check-in →
            </button>
            <button onClick={onShare} style={{padding:"12px 24px",background:"rgba(255,255,255,0.04)",
              border:`1px solid ${T.border}`,borderRadius:12,fontFamily:T.fontDisplay,
              fontSize:13,fontWeight:600,color:T.textLo,cursor:"pointer"}}>
              ↗ Share Protocol
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{fontFamily:T.fontDisplay,fontSize:24,fontWeight:800,color:T.textHi,marginBottom:8,lineHeight:1.2}}>Full stack committed.</h2>
          <p style={{fontFamily:T.fontDisplay,fontSize:13,color:T.textLo,lineHeight:1.75,maxWidth:400,margin:"0 auto 26px"}}>
            All {allActiveProds.length} supplements planned at ~$<AnimatedNumber value={Math.round(activeCost)}/>/mo.
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onShare} style={{padding:"12px 24px",background:T.gradient,border:"none",borderRadius:12,
              fontFamily:T.fontDisplay,fontSize:13,fontWeight:700,color:"white",cursor:"pointer"}}>
              ↗ Share My Protocol
            </button>
            <button style={{padding:"12px 24px",background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,
              borderRadius:12,fontFamily:T.fontDisplay,fontSize:13,fontWeight:600,color:T.textLo,cursor:"pointer"}}>
              View Check-in →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({
  product, index, isFirstRender, isDefaultExpanded,
  activeStack, alreadyTaking, dosageFlags,
  onToggleStack, onRequestTaking,
  partnerActive, onTagFilter, cardRef, highlighted,
}: {
  product: Product; index: number; isFirstRender: boolean; isDefaultExpanded?: boolean;
  activeStack: string[]; alreadyTaking: string[]; dosageFlags: Record<string, string>;
  onToggleStack: (id: string, intent?: "starting" | "already_taking") => void; onRequestTaking: (id: string, shake: () => void) => void;
  partnerActive: boolean; onTagFilter: (tag: string) => void;
  cardRef: (el: HTMLDivElement | null) => void; highlighted: boolean;
}) {
  const [open, setOpen]             = useState(isDefaultExpanded ?? false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addIntent, setAddIntent]   = useState<"starting" | "already_taking" | null>(null);
  const [srcIdx, setSrcIdx]         = useState(()=>product.sources.indexOf(product.sources.reduce((a: ProductSource,b: ProductSource)=>a.price<b.price?a:b)));
  const [whyOpen, setWhyOpen]       = useState(false);
  const [pulse, setPulse]           = useState(false);
  const [hovered, setHovered]       = useState(false);
  const [affState, setAffState]     = useState("idle");
  const [icsState, setIcsState]     = useState("idle");
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = activeStack.includes(product.id);
  const isTaking = alreadyTaking.includes(product.id);
  const hasFlag  = dosageFlags[product.id];
  const src      = product.sources[srcIdx];
  const srcSt    = SOURCE_STYLES[src.name] || SOURCE_STYLES["iHerb"];
  const ev             = resolveEvidence(product.id, product.evidenceCitations);
  const firstSentence  = extractFirstSentence(product.whyShort);
  const remainingShort = remainingAfterFirstSentence(product.whyShort) || product.whyShort;
  const remainingFull  = remainingAfterFirstSentence(product.whyFull)  || product.whyFull;

  useEffect(()=>()=>clearTimeout(shakeTimer.current ?? undefined), []);

  // Open intent modal when adding (skip modal when removing from stack)
  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      onToggleStack(product.id);
      return;
    }
    setAddModalOpen(true);
  };

  const handleConfirmAdd = () => {
    if (!addIntent) return;
    if (addIntent === "starting") {
      setPulse(true); setTimeout(()=>setPulse(false), 350);
      onToggleStack(product.id, "starting");
    } else {
      onRequestTaking(product.id, () => {});
    }
    toast.success("Added to stack");
    setAddModalOpen(false);
    setAddIntent(null);
  };

  const handleAffiliate = () => {
    setAffState("opening");
    const url = resolveSourceUrl(src, product.name, product.brand);
    setTimeout(()=>{ window.open(url,"_blank","noopener"); setAffState("idle"); },700);
  };

  const activeColor = isTaking&&hasFlag?T.amber:isTaking?T.green:product.urgencyColor;

  const borderColor = highlighted?"rgba(99,102,241,0.55)"
    : isTaking?(hasFlag?"rgba(245,158,11,0.3)":"rgba(16,185,129,0.3)")
    : isActive?`${product.urgencyColor}30`
    : hovered?"rgba(255,255,255,0.09)"
    : T.border;

  const topAccent  = (isActive||isTaking||highlighted)?`inset 0 3px 0 ${highlighted?"#6366F1":activeColor}`:"";
  const glowShadow = isActive||isTaking?`0 -4px 20px ${activeColor}22`:"";
  const hlShadow   = highlighted?"0 0 0 2px rgba(99,102,241,0.3),0 0 28px rgba(99,102,241,0.15)":"";
  const pulseSh    = pulse?`0 0 0 2px ${product.urgencyColor}35`:"";
  const finalShadow= [topAccent,hlShadow||glowShadow||pulseSh].filter(Boolean).join(",");

  const animName  = isFirstRender?"fadeUp":"fadeIn";
  const animDelay = isFirstRender?`${Math.min(index*0.05,0.2)}s`:"0s";

  return (
    <div ref={cardRef} style={{animation:`${animName} 0.4s ease both`,animationDelay:animDelay}}>
      <div
        onClick={() => { if (!open) setOpen(true); }}
        onMouseEnter={()=>setHovered(true)}
        onMouseLeave={()=>setHovered(false)}
        style={{
          background: isTaking?"rgba(16,185,129,0.03)":isActive?product.cardTint:T.surface,
          border:`1px solid ${borderColor}`,
          boxShadow:finalShadow||"none",
          borderRadius:20,overflow:"hidden",
          transition:"border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease",
          transform:pulse?"scale(1.016)":(!open&&hovered)?"translateY(-2px)":"none",
          display:"flex",flexDirection:"column",
          cursor:open?"default":"pointer",
        }}
      >
        {/* ── ALWAYS VISIBLE: badge + identity + first sentence ──────────── */}
        <div style={{padding:"20px 20px 16px"}}>

          {/* Urgency badge + rank + chevron */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontSize:9,fontWeight:700,fontFamily:T.fontDisplay,letterSpacing:"0.1em",
              textTransform:"uppercase",
              color:isTaking?(hasFlag?T.amber:T.green):product.urgencyColor,
              background:isTaking?(hasFlag?"rgba(245,158,11,0.08)":"rgba(16,185,129,0.08)"):`${product.urgencyColor}10`,
              border:`1px solid ${isTaking?(hasFlag?"rgba(245,158,11,0.2)":"rgba(16,185,129,0.2)"):product.urgencyColor+"22"}`,
              padding:"3px 10px",borderRadius:99}}>
              {isTaking?(hasFlag?"⚠ Dosage mismatch":"✓ Active in protocol"):product.urgencyLabel}
            </span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo,fontWeight:600}}>#{product.rank}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(o=>!o); }}
                style={{background:"none",border:"none",cursor:"pointer",padding:4,
                  display:"flex",alignItems:"center",color:T.textLo,
                  transition:"color 0.2s",lineHeight:0}}>
                <ChevronDown size={16} style={{
                  transform:open?"rotate(180deg)":"rotate(0deg)",
                  transition:"transform 0.25s ease"}}/>
              </button>
            </div>
          </div>

          {/* Synergy banners */}
          {partnerActive && !isActive && !isTaking && product.synergyNote && (
            <div style={{display:"flex",alignItems:"flex-start",gap:8,background:"rgba(16,185,129,0.05)",
              border:"1px solid rgba(16,185,129,0.14)",borderRadius:10,padding:"9px 12px",marginBottom:12}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:2}}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                  stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <p style={{fontFamily:T.fontDisplay,fontSize:10,fontWeight:700,color:T.green,marginBottom:2}}>
                  Synergy available
                </p>
                <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.textLo,lineHeight:1.5}}>{product.synergyNote}</p>
              </div>
            </div>
          )}
          {partnerActive && (isActive||isTaking) && (
            <div style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(16,185,129,0.07)",
              border:"1px solid rgba(16,185,129,0.18)",borderRadius:99,padding:"3px 10px",marginBottom:10}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                  stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontFamily:T.fontDisplay,fontSize:9,fontWeight:700,color:T.green,
                letterSpacing:"0.06em",textTransform:"uppercase"}}>Synergy active</span>
            </div>
          )}

          {/* Icon + name + brand + first sentence */}
          <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:open?0:16}}>
            <div style={{width:52,height:52,borderRadius:14,flexShrink:0,
              background:`${product.iconColor}10`,border:`1px solid ${product.iconColor}22`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:T.fontMono,fontSize:product.icon.length>2?11:product.icon.length===2?14:18,
              fontWeight:700,color:product.iconColor}}>
              {product.icon}
            </div>
            <div style={{flex:1}}>
              <p style={{fontFamily:T.fontDisplay,fontSize:17,fontWeight:800,color:T.textHi,marginBottom:2,lineHeight:1.15}}>
                {product.name}
              </p>
              <p style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textLo,marginBottom:firstSentence?6:0}}>
                {product.brand} · {product.category}
              </p>
              {firstSentence && (
                <p style={{fontFamily:T.fontDisplay,fontSize:13,color:T.textMid,lineHeight:1.55,
                  display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                  {firstSentence}
                </p>
              )}
            </div>
          </div>

          {/* Closed-state primary CTA */}
          {!open && (
            <button
              onClick={handleAddButtonClick}
              style={{width:"100%",marginTop:14,padding:"11px 16px",
                background:isActive?"rgba(59,130,246,0.1)":T.gradient,
                border:isActive?"1px solid rgba(59,130,246,0.28)":"none",
                borderRadius:12,fontFamily:T.fontDisplay,fontSize:13,fontWeight:700,
                color:isActive?T.blue:"white",cursor:"pointer",transition:"all 0.2s",
                boxShadow:isActive?"none":"0 4px 16px rgba(59,130,246,0.2)",
                letterSpacing:"0.01em"}}>
              {isActive?"✓ In my stack":"+ Add to stack"}
            </button>
          )}
        </div>

        {/* ── EXPANDED CONTENT ───────────────────────────────────────────── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="expanded"
              initial={{ height:0, opacity:0 }}
              animate={{ height:"auto", opacity:1 }}
              exit={{ height:0, opacity:0 }}
              transition={{ duration:0.28, ease:"easeInOut" }}
              style={{overflow:"hidden"}}>

              {/* Biomarker hero + unlock panel */}
              <div style={{padding:"4px 20px 0"}}>
                <BiomarkerHero product={product}/>
                {product.unlockMarkers && (
                  <div style={{background:"rgba(139,92,246,0.05)",border:"1px solid rgba(139,92,246,0.14)",
                    borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"
                          stroke={T.purple} strokeWidth="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"
                          stroke={T.purple} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <p style={{fontFamily:T.fontDisplay,fontSize:10,fontWeight:700,color:T.purple}}>
                        Upload panel to personalise dosage
                      </p>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {product.unlockMarkers.map((m: string)=>(
                        <span key={m} style={{fontFamily:T.fontMono,fontSize:9,color:T.purple,
                          background:"rgba(139,92,246,0.07)",border:"1px solid rgba(139,92,246,0.14)",
                          padding:"3px 8px",borderRadius:6}}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Zone 2: Intelligence */}
              <div style={{padding:"0 20px",flex:1}}>
                {/* Why box */}
                <div style={{background:`${product.iconColor}05`,border:`1px solid ${product.iconColor}12`,
                  borderLeft:`2px solid ${product.iconColor}45`,borderRadius:"0 10px 10px 0",
                  padding:"12px 14px",marginBottom:12}}>
                  <p style={{fontFamily:T.fontDisplay,fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.75,
                    display:"-webkit-box",WebkitLineClamp:whyOpen?"unset":3,WebkitBoxOrient:"vertical",
                    overflow:whyOpen?"visible":"hidden"}}>
                    {whyOpen ? remainingFull : remainingShort}
                  </p>
                  <button onClick={(e)=>{e.stopPropagation();setWhyOpen(o=>!o);}}
                    style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.fontDisplay,
                      fontSize:10,color:"rgba(255,255,255,0.28)",padding:"5px 0 0",display:"block",
                      letterSpacing:"0.01em"}}>
                    {whyOpen ? "↑ Show less" : "Read full reasoning"}
                  </button>
                  <div style={{borderTop:`1px solid ${product.iconColor}18`,marginTop:10,paddingTop:8}}>
                    <p style={{fontFamily:T.fontMono,fontSize:9,color:T.textLo,letterSpacing:"0.02em"}}>
                      Supported by{" "}
                      <span style={{color:STRENGTH_COLORS[ev.strength],fontWeight:600}}>
                        {ev.strength}
                      </span>
                      {" "}evidence · {ev.rctCount > 0 ? `${ev.rctCount} RCTs` : "limited data"}
                    </p>
                  </div>
                </div>

                {/* Protocol note */}
                <div style={{display:"flex",gap:8,padding:"10px 12px",background:"rgba(255,255,255,0.02)",
                  border:`1px solid ${T.border}`,borderRadius:10,marginBottom:12,alignItems:"flex-start"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:2,opacity:0.3}}>
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" stroke="white" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo,lineHeight:1.65,letterSpacing:"0.02em"}}>
                    {product.protocolNote}
                  </p>
                </div>

                {/* Dosage flag */}
                {hasFlag && (
                  <div style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.14)",
                    borderRadius:10,padding:"10px 13px",marginBottom:12}}>
                    <p style={{fontFamily:T.fontDisplay,fontSize:10,fontWeight:700,color:T.amber,marginBottom:3}}>
                      ⚠ Dosage below therapeutic threshold
                    </p>
                    <p style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo,lineHeight:1.5}}>Your dose: {hasFlag}</p>
                    <p style={{fontFamily:T.fontDisplay,fontSize:10,color:T.textLo,marginTop:4}}>
                      Coverage bars reflect planned, not confirmed, status.
                    </p>
                  </div>
                )}

                {/* Timeline — only when active */}
                {isActive && (
                  <div style={{marginBottom:12,background:"rgba(59,130,246,0.04)",
                    border:"1px solid rgba(59,130,246,0.13)",borderRadius:10,overflow:"hidden",
                    transformOrigin:"top",animation:"scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both"}}>
                    <div style={{display:"flex",gap:8,padding:"10px 13px",alignItems:"flex-start"}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:2}}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
                          stroke={T.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p style={{fontFamily:T.fontMono,fontSize:10,color:T.blue,lineHeight:1.65,flex:1}}>
                        {product.expectedTimeline}
                      </p>
                    </div>
                    {product.retestWeeks && (
                      <div style={{borderTop:"1px solid rgba(59,130,246,0.1)",padding:"8px 13px",
                        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontFamily:T.fontDisplay,fontSize:10,color:T.textLo}}>
                          Retest in {product.retestWeeks} weeks
                        </span>
                        <button onClick={(e)=>{e.stopPropagation();downloadICS(product,()=>{setIcsState("saved");setTimeout(()=>setIcsState("idle"),1800);});}}
                          style={{background:icsState==="saved"?"rgba(16,185,129,0.1)":"rgba(59,130,246,0.1)",
                            border:`1px solid ${icsState==="saved"?"rgba(16,185,129,0.22)":"rgba(59,130,246,0.2)"}`,
                            borderRadius:6,padding:"4px 10px",fontFamily:T.fontDisplay,fontSize:10,fontWeight:600,
                            color:icsState==="saved"?T.green:T.blue,cursor:"pointer",transition:"all 0.2s"}}>
                          {icsState==="saved"?"✓ Saved":"↓ Calendar"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
                  {product.tags.map((tag: string)=>(
                    <TagWithTooltip key={tag} tag={tag} allProducts={PRODUCTS} onFilter={onTagFilter}/>
                  ))}
                </div>
              </div>

              {/* Zone 3: Action */}
              <div style={{borderTop:`1px solid ${T.border}`,padding:"16px 20px",display:"flex",flexDirection:"column",gap:10}}>
                <SourceTable product={product} srcIdx={srcIdx} setSrcIdx={setSrcIdx}/>
                <button onClick={handleAddButtonClick}
                  style={{width:"100%",padding:"13px 16px",
                    background:isActive?"rgba(59,130,246,0.1)":T.gradient,
                    border:isActive?"1px solid rgba(59,130,246,0.28)":"none",
                    borderRadius:12,fontFamily:T.fontDisplay,fontSize:13,fontWeight:700,
                    color:isActive?T.blue:"white",cursor:"pointer",transition:"all 0.2s",
                    boxShadow:isActive?"none":"0 4px 20px rgba(59,130,246,0.25)",
                    letterSpacing:"0.01em"}}>
                  {isActive?"✓ In my stack":"+ Add to stack"}
                </button>
                <button onClick={(e)=>{e.stopPropagation();handleAffiliate();}}
                  style={{width:"100%",padding:"10px 14px",
                    background:affState==="opening"?"rgba(16,185,129,0.08)":srcSt.bg,
                    border:`1px solid ${affState==="opening"?"rgba(16,185,129,0.22)":srcSt.border}`,
                    borderRadius:10,fontFamily:T.fontDisplay,fontSize:11,fontWeight:600,
                    color:affState==="opening"?T.green:srcSt.color,cursor:"pointer",transition:"all 0.2s",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  {affState==="opening"?"✓ Opening…":(
                    <>{src.name}
                      <span style={{fontFamily:T.fontMono,fontSize:10,opacity:0.65}}>${src.price.toFixed(2)} →</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Intent Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(v) => { setAddModalOpen(v); if (!v) setAddIntent(null); }}
      >
        <DialogHeader>
          <DialogTitle>Add {product.name} to your stack</DialogTitle>
          <DialogDescription>Choose how you want to track this supplement.</DialogDescription>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "4px 0" }}>
          {(["starting", "already_taking"] as const).map((intent) => {
            const selected = addIntent === intent;
            return (
              <button
                key={intent}
                onClick={() => setAddIntent(intent)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                  gap: 3, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  textAlign: "left", transition: "all 0.15s",
                  background: selected ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${selected ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.07)"}`,
                  boxShadow: selected ? "0 0 0 1px rgba(59,130,246,0.15)" : "none",
                }}
              >
                <span style={{
                  fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 700,
                  color: selected ? T.blue : T.textHi,
                }}>
                  {intent === "starting" ? "I'm starting this" : "I'm already taking this"}
                </span>
                <span style={{ fontFamily: T.fontDisplay, fontSize: 11, color: T.textMid }}>
                  {intent === "starting"
                    ? "Blue Zone will track from today"
                    : "We'll backfill your adherence data"}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <button
            onClick={() => { setAddModalOpen(false); setAddIntent(null); }}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10, cursor: "pointer",
              background: "transparent", border: `1px solid ${T.borderMid}`,
              fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 600, color: T.textMid,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAdd}
            disabled={!addIntent}
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 10, cursor: addIntent ? "pointer" : "not-allowed",
              background: addIntent ? T.gradient : "rgba(255,255,255,0.05)",
              border: "none",
              fontFamily: T.fontDisplay, fontSize: 13, fontWeight: 700,
              color: addIntent ? "white" : T.textLo,
              transition: "all 0.15s",
              boxShadow: addIntent ? "0 4px 16px rgba(59,130,246,0.25)" : "none",
            }}
          >
            Confirm
          </button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ProductStackPage() {
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<FilterTab>("all");
  const [tagFilter, setTagFilter]       = useState<string | null>(null);
  const [activeStack, setActiveStack]   = useState<string[]>([]);
  const [alreadyTaking, setAlreadyTaking] = useState<string[]>([]);
  const [dosageFlags, setDosageFlags]   = useState<Record<string, string>>({});
  const [dosageHistory, setDosageHistory] = useState<Record<string, string>>({});
  const [scrolled, setScrolled]         = useState(false);
  const [showActivateSheet, setShowActivateSheet] = useState(false);
  const [showShare, setShowShare]       = useState(false);
  const [showReengage, setShowReengage] = useState(false);
  const [reengageDismissed, setReengageDismissed] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [dosageQueue, setDosageQueue]   = useState<string[]>([]);
  const [showDosageModal, setShowDosageModal] = useState(false);
  const [scrollToast, setScrollToast]   = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const [isMobile, setIsMobile]         = useState(false);

  const cardRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  const isFirstLoad = useRef(true);
  // Fix #4: pendingDismissRef before handleRequestTaking
  const pendingDismissRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check, {passive:true});
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fix #1: flip isFirstLoad after stagger completes
  useEffect(() => {
    const t = setTimeout(() => { isFirstLoad.current = false; }, 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 160);
    window.addEventListener("scroll", fn, {passive:true});
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const hasLeft = useRef(false);
  useEffect(() => {
    const fn = () => {
      if (document.hidden) { hasLeft.current = true; }
      else if (hasLeft.current && !reengageDismissed && (activeStack.length+alreadyTaking.length)>0) {
        setShowReengage(true); hasLeft.current = false;
      }
    };
    document.addEventListener("visibilitychange",fn);
    return ()=>document.removeEventListener("visibilitychange",fn);
  },[activeStack,alreadyTaking,reengageDismissed]);

  // Fix #5: alreadyTaking in dep array; confirmed supersedes planned
  const toggleStack = useCallback((id: string) => {
    if (alreadyTaking.includes(id)) return;
    setActiveStack(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  }, [alreadyTaking]);

  // Fix #6: only queue activeStack items
  const confirmStackAsTaking = () => {
    const toConfirm = activeStack.filter(id => !alreadyTaking.includes(id) || dosageFlags[id]);
    if (!toConfirm.length) return;
    setDosageQueue(toConfirm);
    setShowDosageModal(true);
  };

  const handleRequestTaking = useCallback((id: string, onDismiss: () => void) => {
    if (alreadyTaking.includes(id)) {
      setAlreadyTaking(s=>s.filter(x=>x!==id));
      setDosageFlags(f=>{ const n={...f}; delete n[id]; return n; });
      return;
    }
    setDosageQueue([id]);
    setShowDosageModal(true);
    pendingDismissRef.current = onDismiss;
  }, [alreadyTaking]);

  const handleDosageComplete = useCallback((results: Record<string, DosageResult>) => {
    setShowDosageModal(false);
    pendingDismissRef.current = null;
    const ids = Object.keys(results);
    setAlreadyTaking(s=>Array.from(new Set([...s,...ids])));
    setActiveStack(s=>s.filter(id=>!ids.includes(id)));
    const newFlags: Record<string,string>={}, newHistory={...dosageHistory};
    ids.forEach(id=>{
      const r=results[id];
      if(!r.confirmed&&r.dose){ newFlags[id]=r.dose; newHistory[id]=r.dose; }
      else { delete newFlags[id]; delete newHistory[id]; }
    });
    setDosageFlags(f=>({...f,...newFlags}));
    setDosageHistory(newHistory);
    setDosageQueue([]);
  },[dosageHistory]);

  const handleDosageClose = useCallback(()=>{
    setShowDosageModal(false);
    setDosageQueue([]);
    pendingDismissRef.current?.();
    pendingDismissRef.current = null;
  },[]);

  const confirmedTakingIds = alreadyTaking.filter(id=>!dosageFlags[id]);
  const graduatedIds       = uniqueIds(activeStack, confirmedTakingIds);
  const isGraduated        = graduatedIds.length === PRODUCTS.length;
  const allActive          = uniqueIds(activeStack, alreadyTaking);
  const confirmedProds     = PRODUCTS.filter(p=>confirmedTakingIds.includes(p.id));
  const plannedProds       = PRODUCTS.filter(p=>activeStack.includes(p.id)||(alreadyTaking.includes(p.id)&&dosageFlags[p.id]));
  const allActiveProds     = PRODUCTS.filter(p=>allActive.includes(p.id));
  const takingProds        = PRODUCTS.filter(p=>alreadyTaking.includes(p.id));
  const addedCount         = allActive.length;
  const totalCost          = PRODUCTS.reduce((s,p)=>s+bestPrice(p),0);
  const activeCost         = allActiveProds.reduce((s,p)=>s+bestPrice(p),0);
  const breakdown          = getRetailerBreakdown(allActiveProds);

  const filterPool = useMemo(()=>{
    if(filter==="all")          return PRODUCTS;
    if(filter==="critical")     return PRODUCTS.filter(p=>p.urgency==="critical");
    if(filter==="active")       return PRODUCTS.filter(p=>alreadyTaking.includes(p.id));
    /* recommended */           return PRODUCTS.filter(p=>p.urgency!=="critical"&&!alreadyTaking.includes(p.id));
  },[filter, alreadyTaking]);

  const filtered = useMemo(()=>{
    let l=filterPool;
    if(tagFilter) l=l.filter(p=>p.tags.includes(tagFilter));
    return l;
  },[filterPool,tagFilter]);

  const criticalItem    = filtered.find(p => p.urgency === "critical") ?? null;
  const secondaryItems  = filtered.filter(p => p.urgency !== "critical");

  // Fix #7: deterministic scroll
  const scrollToProduct = useCallback((id: string) => {
    const el = cardRefs.current[id];
    if (!el) {
      setFilter("all"); setTagFilter(null); setPendingScrollId(id);
      setScrollToast("Switched to All to show this product");
      setTimeout(()=>setScrollToast(null),2500);
      return;
    }
    el.scrollIntoView({behavior:"smooth",block:"center"});
    setHighlightedId(id);
    setTimeout(()=>setHighlightedId(null),1600);
  },[]);

  useEffect(()=>{
    if(!pendingScrollId) return;
    const el = cardRefs.current[pendingScrollId];
    if(el){
      el.scrollIntoView({behavior:"smooth",block:"center"});
      setHighlightedId(pendingScrollId);
      setTimeout(()=>setHighlightedId(null),1600);
      setPendingScrollId(null);
    }
  },[pendingScrollId, filtered]);

  // Filter tab counts — live from stack data
  const tabCount = useMemo((): Record<FilterTab, number> => ({
    all:         PRODUCTS.length,
    critical:    PRODUCTS.filter(p=>p.urgency==="critical").length,
    active:      alreadyTaking.length,
    recommended: PRODUCTS.filter(p=>p.urgency!=="critical"&&!alreadyTaking.includes(p.id)).length,
  }), [alreadyTaking]);

  const allAddressedInFilter = (key: FilterTab) => {
    if(key==="all"||key==="active") return false;
    const pool = key==="critical"
      ? PRODUCTS.filter(p=>p.urgency==="critical")
      : PRODUCTS.filter(p=>p.urgency!=="critical"&&!alreadyTaking.includes(p.id));
    return pool.length>0 && pool.every(p=>allActive.includes(p.id));
  };

  const clearFilters = () => { setFilter("all"); setTagFilter(null); };
  const handleTagFilter = (t: string) => { setTagFilter(x=>x===t?null:t); setFilter("all"); };
  type ActiveFilter = { type: string; label: string | undefined };
  const activeFilters = (
    [
      filter !== "all" ? { type: "tab", label: FILTER_TABS.find(f => f.key === filter)?.label } : null,
      tagFilter        ? { type: "tag", label: tagFilter } : null,
    ] as (ActiveFilter | null)[]
  ).filter((f): f is ActiveFilter => f !== null);
  const noMatchForTag = tagFilter&&filterPool.every(p=>!p.tags.includes(tagFilter));
  const allInFilterActive = filtered.length>0&&filtered.every(p=>allActive.includes(p.id));

  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:T.fontDisplay,position:"relative"}}>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes slideFromTop{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes scaleIn{from{opacity:0;transform:scaleY(0);}to{opacity:1;transform:scaleY(1);}}
        @keyframes spinSlow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes shimmer{0%,100%{opacity:0.35;}50%{opacity:0.7;}}
        @keyframes shakeX{0%,100%{transform:translateX(0);}20%{transform:translateX(-5px);}40%{transform:translateX(5px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);}}
        ::-webkit-scrollbar{width:0;}
        input:focus{border-color:rgba(59,130,246,0.4)!important;outline:none;}
        button{font-family:inherit;}
      `}</style>

      {/* Ambient glow — system blue per design rules */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:"radial-gradient(ellipse 80% 40% at 50% 0%,rgba(59,130,246,0.04) 0%,transparent 65%)"}}/>
      {/* Film grain — baseFrequency 0.65 */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.014,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:"256px"}}/>

      <StickyHeader activeCost={activeCost} addedCount={addedCount} total={PRODUCTS.length}
        scrolled={scrolled} onShare={()=>setShowShare(true)} canShare={allActiveProds.length>0}/>

      {/* Scroll toast */}
      {scrollToast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:150,
          background:T.surfaceUp,border:`1px solid rgba(59,130,246,0.28)`,borderRadius:12,
          padding:"10px 20px",animation:"slideDown 0.25s ease",whiteSpace:"nowrap"}}>
          <span style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textMid}}>{scrollToast}</span>
        </div>
      )}

      <div style={{maxWidth:1280,margin:"0 auto",padding:"36px 28px 80px",position:"relative",zIndex:1}}>

        {/* Re-engagement banner */}
        {showReengage && !reengageDismissed && (
          <div style={{background:"rgba(16,185,129,0.04)",
            border:"1px solid rgba(16,185,129,0.15)",borderRadius:12,padding:"10px 16px",marginBottom:16,
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap",
            animation:"slideDown 0.3s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {/* SVG bell icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,opacity:0.5}}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                  stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textMid}}>
                Welcome back — {addedCount} of {PRODUCTS.length} active.
              </p>
            </div>
            <div style={{display:"flex",gap:7,flexShrink:0}}>
              <button onClick={()=>{const next=PRODUCTS.find(p=>!allActive.includes(p.id));if(next)scrollToProduct(next.id);setShowReengage(false);}}
                style={{padding:"5px 12px",background:"rgba(16,185,129,0.09)",border:"1px solid rgba(16,185,129,0.18)",
                  borderRadius:8,fontFamily:T.fontDisplay,fontSize:10,fontWeight:700,color:T.green,cursor:"pointer"}}>
                Continue →
              </button>
              <button onClick={()=>{setShowReengage(false);setReengageDismissed(true);}}
                style={{padding:"5px 9px",background:"none",border:"none",
                  fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        )}

        {/* Page header */}
        <div style={{marginBottom:24,animation:"fadeUp 0.4s ease both"}}>
          <p style={{fontFamily:T.fontMono,fontSize:9,fontWeight:700,letterSpacing:"0.18em",
            color:T.blue,textTransform:"uppercase",marginBottom:8}}>
            Product Stack
          </p>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:20,flexWrap:"wrap"}}>
            <div>
              <h1 style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:800,color:T.textHi,lineHeight:1.1,marginBottom:8}}>
                Or&apos;s Competition Prep Stack
              </h1>
              <p style={{fontSize:12,color:T.textLo,lineHeight:1.6}}>
                Every product is traceable to a specific biomarker gap or wearable signal.{" "}
                <span style={{fontFamily:T.fontMono,fontSize:10,color:"rgba(255,255,255,0.1)"}}>
                  Mar 2025 bloodwork
                </span>
              </p>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.18)",
                borderRadius:99,padding:"6px 13px",display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:T.red,
                  boxShadow:`0 0 5px ${T.red}`}}/>
                <span style={{fontFamily:T.fontMono,fontSize:11,color:T.red,fontWeight:600}}>1 critical gap</span>
              </div>
              {addedCount>0 && <>
                <div style={{background:"rgba(59,130,246,0.07)",border:"1px solid rgba(59,130,246,0.18)",
                  borderRadius:99,padding:"6px 13px",animation:"fadeIn 0.3s ease"}}>
                  <span style={{fontFamily:T.fontMono,fontSize:11,color:T.blue,fontWeight:600}}>
                    Active: $<AnimatedNumber value={Math.round(activeCost)}/>/mo
                  </span>
                </div>
                <button onClick={()=>setShowShare(true)}
                  style={{padding:"6px 14px",background:"rgba(139,92,246,0.08)",
                    border:"1px solid rgba(139,92,246,0.18)",borderRadius:99,
                    fontFamily:T.fontDisplay,fontSize:11,fontWeight:700,color:T.purple,cursor:"pointer"}}>
                  ↗ Share
                </button>
              </>}
            </div>
          </div>
        </div>

        {/* Graduation state */}
        {isGraduated && (
          <GraduationState allActiveProds={allActiveProds} takingProds={takingProds}
            activeCost={activeCost} onShare={()=>setShowShare(true)}/>
        )}

        {/* Protocol Intelligence Header — always visible */}
        <ProtocolHeader
          confirmedProds={confirmedProds}
          plannedProds={plannedProds}
          allProducts={PRODUCTS}
          allActive={allActive}
          activeCost={activeCost}
          totalCost={totalCost}
          onScrollToProduct={scrollToProduct}
        />

        {/* Filter bar — confirm button anchored here so it's contextually near the cards */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          marginBottom:activeFilters.length?8:16,flexWrap:"wrap",gap:10,
          animation:"fadeUp 0.4s ease both",animationDelay:"0.1s"}}>
          <div style={{display:"flex",gap:3,background:"rgba(255,255,255,0.025)",
            border:`1px solid ${T.border}`,borderRadius:12,padding:4,flexWrap:"wrap"}}>
            {FILTER_TABS.map(f=>{
              const cnt      = tabCount[f.key];
              const isActive = filter===f.key && !tagFilter;
              const done     = allAddressedInFilter(f.key);
              const isEmpty  = f.key==="active" && cnt===0;
              return (
                <button key={f.key} onClick={()=>{setFilter(f.key);setTagFilter(null);}}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",
                    borderRadius:8,border:"none",cursor:"pointer",
                    fontFamily:T.fontDisplay,fontSize:12,fontWeight:600,transition:"all 0.15s",
                    background:isActive?"#161624":"transparent",
                    color:isActive?T.textHi:T.textLo,
                    opacity:isEmpty&&!isActive?0.5:1,
                    boxShadow:isActive?"0 1px 4px rgba(0,0,0,0.4)":"none"}}>
                  {f.label}
                  <span style={{fontFamily:T.fontMono,fontSize:9,
                    color:done?T.green:isActive?"rgba(255,255,255,0.3)":T.textLo,
                    background:done?"rgba(16,185,129,0.1)":isActive?"rgba(255,255,255,0.05)":"transparent",
                    padding:(isActive||done)?"1px 5px":"0",borderRadius:4,
                    border:done?"1px solid rgba(16,185,129,0.18)":"none"}}>
                    {done?"✓":cnt}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>
              {loading?"–":filtered.length} products
            </span>
            {activeStack.length > 0 && (
              <button onClick={()=>setShowActivateSheet(true)}
                style={{padding:"6px 13px",background:"rgba(16,185,129,0.07)",
                  border:"1px solid rgba(16,185,129,0.18)",borderRadius:99,
                  fontFamily:T.fontDisplay,fontSize:11,fontWeight:700,color:T.green,cursor:"pointer",
                  whiteSpace:"nowrap",transition:"background 0.15s"}}>
                Confirm as taking →
              </button>
            )}
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilters.length>0 && (
          <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",animation:"slideDown 0.2s ease"}}>
            <span style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textLo}}>Filtering by:</span>
            {activeFilters.map(f=>(
              <div key={f.label} style={{display:"flex",alignItems:"center",gap:6,
                background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.22)",
                borderRadius:99,padding:"4px 10px"}}>
                <span style={{fontFamily:T.fontMono,fontSize:10,color:T.blue}}>{f.label}</span>
                <button onClick={f.type==="tab"?()=>setFilter("all"):()=>setTagFilter(null)}
                  style={{background:"none",border:"none",cursor:"pointer",color:T.blue,fontSize:11,lineHeight:1,padding:0}}>×</button>
              </div>
            ))}
            {activeFilters.length>1 && (
              <button onClick={clearFilters}
                style={{background:"none",border:"none",cursor:"pointer",
                  fontFamily:T.fontDisplay,fontSize:11,color:T.textLo,textDecoration:"underline"}}>
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Cards — Fix 11: align-items start prevents cross-axis stretching on unequal card heights */}
        {loading ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",
            gap:16,alignItems:"start"}}>
            {Array.from({length:filterPool.length}).map((_,i)=><SkeletonCard key={i} index={i}/>)}
          </div>
        ) : filtered.length===0 ? (
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,
            padding:"52px 28px",textAlign:"center",animation:"fadeIn 0.3s ease"}}>
            {noMatchForTag ? (
              <>
                <p style={{fontFamily:T.fontDisplay,fontSize:14,color:T.textLo,marginBottom:10}}>
                  No products tagged &quot;{tagFilter}&quot;
                </p>
                <button onClick={clearFilters} style={{background:"none",border:"none",
                  color:T.blue,cursor:"pointer",fontFamily:T.fontDisplay,fontSize:13}}>
                  Clear filter →
                </button>
              </>
            ) : filter==="active" ? (
              <>
                <p style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.textMid,marginBottom:6}}>
                  No products confirmed yet
                </p>
                <p style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,marginBottom:14}}>
                  No products confirmed yet — activate your stack to track adherence.
                </p>
                <button onClick={()=>setFilter("all")} style={{background:"none",border:"none",
                  color:T.blue,cursor:"pointer",fontFamily:T.fontDisplay,fontSize:13}}>
                  Browse all products →
                </button>
              </>
            ) : allInFilterActive ? (
              <>
                <div style={{width:44,height:44,borderRadius:14,background:"rgba(16,185,129,0.09)",
                  border:"1px solid rgba(16,185,129,0.18)",margin:"0 auto 16px",display:"flex",
                  alignItems:"center",justifyContent:"center"}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{fontFamily:T.fontDisplay,fontSize:16,fontWeight:700,color:T.textMid,marginBottom:6}}>
                  All {FILTER_TABS.find(f=>f.key===filter)?.label} gaps addressed
                </p>
                <p style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textLo,marginBottom:14}}>
                  Every product in this view is active in your stack.
                </p>
                <button onClick={clearFilters} style={{background:"none",border:"none",
                  color:T.blue,cursor:"pointer",fontFamily:T.fontDisplay,fontSize:13}}>
                  View all →
                </button>
              </>
            ) : (
              <>
                <p style={{fontFamily:T.fontDisplay,fontSize:14,color:T.textLo,marginBottom:10}}>
                  No products match this combination.
                </p>
                <button onClick={clearFilters} style={{background:"none",border:"none",
                  color:T.blue,cursor:"pointer",fontFamily:T.fontDisplay,fontSize:13}}>
                  Clear all filters →
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* ── Critical Gap — full-width spotlight ── */}
            {criticalItem && (
              <div style={{
                borderLeft:`3px solid ${criticalItem.urgencyColor}`,
                borderRadius:20,
              }}>
                <ProductCard
                  key={criticalItem.id}
                  product={criticalItem}
                  index={0}
                  isFirstRender={isFirstLoad.current}
                  isDefaultExpanded
                  activeStack={activeStack}
                  alreadyTaking={alreadyTaking}
                  dosageFlags={dosageFlags}
                  onToggleStack={toggleStack}
                  onRequestTaking={handleRequestTaking}
                  partnerActive={criticalItem.synergiesWith.some(id=>allActive.includes(id))}
                  onTagFilter={handleTagFilter}
                  cardRef={el=>{ cardRefs.current[criticalItem.id]=el; }}
                  highlighted={highlightedId===criticalItem.id}
                />
              </div>
            )}

            {/* ── Divider ── */}
            {criticalItem && secondaryItems.length > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0"}}>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.05)"}}/>
                <span style={{
                  fontFamily:T.fontDisplay,fontSize:11,fontWeight:600,
                  color:T.textLo,letterSpacing:"0.07em",textTransform:"uppercase",
                }}>
                  Also recommended
                </span>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.05)"}}/>
              </div>
            )}

            {/* ── Secondary grid ── */}
            {secondaryItems.length > 0 && (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",
                gap:16,alignItems:"start"}}>
                {secondaryItems.map((product,i)=>(
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={criticalItem ? i+1 : i}
                    isFirstRender={isFirstLoad.current}
                    isDefaultExpanded={false}
                    activeStack={activeStack}
                    alreadyTaking={alreadyTaking}
                    dosageFlags={dosageFlags}
                    onToggleStack={toggleStack}
                    onRequestTaking={handleRequestTaking}
                    partnerActive={product.synergiesWith.some(id=>allActive.includes(id))}
                    onTagFilter={handleTagFilter}
                    cardRef={el=>{ cardRefs.current[product.id]=el; }}
                    highlighted={highlightedId===product.id}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* Progress + breakdown */}
        {!loading && addedCount>0 && (
          <div style={{marginTop:28,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14,
            animation:"fadeUp 0.4s ease both"}}>
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 22px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textLo,fontWeight:600}}>
                  Protocol completion
                </span>
                <span style={{fontFamily:T.fontMono,fontSize:10,color:T.textLo}}>
                  {addedCount} / {PRODUCTS.length} active
                </span>
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.04)",borderRadius:99,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${(addedCount/PRODUCTS.length)*100}%`,background:T.gradient,
                  borderRadius:99,transition:"width 0.5s ease",boxShadow:"0 0 8px rgba(59,130,246,0.35)"}}/>
              </div>
              <div style={{display:"flex",gap:4}}>
                {PRODUCTS.map(p=>{const on=allActive.includes(p.id);return(
                  <div key={p.id} style={{flex:1,height:3,borderRadius:99,
                    background:on?p.urgencyColor:"rgba(255,255,255,0.04)",
                    transition:"background 0.3s",boxShadow:on?`0 0 4px ${p.urgencyColor}55`:"none"}}/>
                );})}
              </div>
            </div>
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"18px 22px"}}>
              <p style={{fontFamily:T.fontMono,fontSize:9,fontWeight:700,letterSpacing:"0.14em",
                color:T.textLo,textTransform:"uppercase",marginBottom:12}}>
                Order breakdown
              </p>
              {Object.entries(breakdown).map(([name,cost])=>{
                const ss=SOURCE_STYLES[name]||SOURCE_STYLES["iHerb"];
                return (
                  <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontFamily:T.fontDisplay,fontSize:11,color:ss.color,fontWeight:600}}>{name}</span>
                    <span style={{fontFamily:T.fontMono,fontSize:11,color:T.textLo}}>
                      $<AnimatedNumber value={Math.round(cost)}/>/mo
                    </span>
                  </div>
                );
              })}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:8,marginTop:2,
                display:"flex",justifyContent:"space-between"}}>
                <span style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textMid,fontWeight:700}}>Total</span>
                <span style={{fontFamily:T.fontMono,fontSize:13,color:T.textHi,fontWeight:700}}>
                  $<AnimatedNumber value={Math.round(activeCost)}/>/mo
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{marginTop:16,padding:"18px 24px",background:T.surface,
          border:`1px solid ${T.border}`,borderRadius:16,
          display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
          <p style={{fontFamily:T.fontDisplay,fontSize:11,color:T.textLo,lineHeight:1.7,maxWidth:520}}>
            Recommendations generated from peer-reviewed research cross-referenced against your specific
            biomarker values. Not medical advice — consult your physician before starting any new protocol.
          </p>
          <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
            {["iHerb","Amazon","Triathletes.com"].map(s=>{
              const ss=SOURCE_STYLES[s];
              return (
                <span key={s} style={{fontFamily:T.fontMono,fontSize:9,color:ss.color,
                  background:ss.bg,border:`1px solid ${ss.border}`,padding:"3px 9px",borderRadius:6}}>
                  {s}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {showDosageModal && dosageQueue.length>0 && (
        <BatchDosageModal
          products={PRODUCTS.filter(p=>dosageQueue.includes(p.id))}
          dosageHistory={dosageHistory}
          onComplete={handleDosageComplete}
          onClose={handleDosageClose}
        />
      )}

      {showShare && allActiveProds.length>0 && (
        <ShareModal
          activeStackProds={PRODUCTS.filter(p=>activeStack.includes(p.id))}
          takingProds={takingProds}
          dosageFlags={dosageFlags}
          activeCost={activeCost}
          onClose={()=>setShowShare(false)}
        />
      )}

      {/* ── Activate Stack confirmation sheet ── */}
      {(() => {
        const toConfirmProds = PRODUCTS.filter(
          p => activeStack.includes(p.id) && (!alreadyTaking.includes(p.id) || dosageFlags[p.id])
        );
        const sheetCost = toConfirmProds.reduce((s,p)=>s+bestPrice(p),0);
        return (
          <Sheet open={showActivateSheet} onOpenChange={setShowActivateSheet}>
            <SheetHeader>
              <SheetTitle>Activate your stack</SheetTitle>
              <SheetDescription>
                {toConfirmProds.length} product{toConfirmProds.length===1?"":"s"} · ${Math.round(sheetCost)}/mo
              </SheetDescription>
            </SheetHeader>

            <p style={{fontFamily:T.fontDisplay,fontSize:12,color:T.textMid,lineHeight:1.6,marginBottom:16}}>
              Blue Zone will track your adherence and update recommendations as new data arrives.
            </p>

            {/* Compact product list */}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:4}}>
              {toConfirmProds.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 14px",borderRadius:12,
                  background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{width:32,height:32,borderRadius:10,flexShrink:0,
                    background:`${p.iconColor}18`,border:`1px solid ${p.iconColor}30`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:T.fontMono,fontSize:9,fontWeight:700,color:p.iconColor}}>
                      {p.icon}
                    </span>
                  </div>
                  <span style={{fontFamily:T.fontDisplay,fontSize:13,fontWeight:600,color:T.textHi}}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>

            <SheetFooter>
              <button
                onClick={()=>{
                  confirmStackAsTaking();
                  setShowActivateSheet(false);
                  toast.success("Stack activated — we'll track your progress");
                }}
                style={{width:"100%",padding:"13px 16px",borderRadius:12,cursor:"pointer",
                  background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",border:"none",
                  fontFamily:T.fontDisplay,fontSize:14,fontWeight:700,color:"white",
                  boxShadow:"0 4px 20px rgba(59,130,246,0.3)"}}>
                Activate stack
              </button>
              <button
                onClick={()=>setShowActivateSheet(false)}
                style={{width:"100%",padding:"11px 16px",borderRadius:12,cursor:"pointer",
                  background:"transparent",border:"none",
                  fontFamily:T.fontDisplay,fontSize:13,fontWeight:600,color:T.textMid}}>
                Not yet
              </button>
            </SheetFooter>
          </Sheet>
        );
      })()}
    </div>
  );
}
