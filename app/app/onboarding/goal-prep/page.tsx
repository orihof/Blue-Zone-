/// app/app/onboarding/goal-prep/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GOAL_CATEGORIES, BUDGET_TIERS, getBudgetTier, type GoalPrepFormData } from "@/lib/db/goal-payload";
import { Suspense } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#3B82F6 0%,#7C3AED 55%,#A855F7 100%)";
const T    = { text: "#F1F5F9", muted: "#64748B", card: "#111827", border: "rgba(99,102,241,0.18)" };

// ── Loading steps ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  { id: "data",       label: "Reviewing your health data" },
  { id: "biomarkers", label: "Analyzing biomarker patterns" },
  { id: "mapping",    label: "Mapping to your goal" },
  { id: "stack",      label: "Building your supplement stack" },
  { id: "protocol",   label: "Personalizing your protocol" },
] as const;

// ── Chip component ────────────────────────────────────────────────────────────
function Chip({ label, active, onClick, multi }: { label: string; active: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
        fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s",
        background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
        color: active ? "#A5B4FC" : T.muted,
      }}
    >
      {multi && active ? "✓ " : ""}{label}
    </button>
  );
}

// ── Slider component ──────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{label}</span>
        <span style={{ fontSize: 14, color: T.text, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", fontWeight: 500 }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{min}{unit}</span>
        <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── YesNo component ───────────────────────────────────────────────────────────
function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>{label}</p>
      <div style={{ display: "flex", gap: 10 }}>
        {[true, false].map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, cursor: "pointer",
              fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s",
              background: value === v ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === v ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
              color: value === v ? "#A5B4FC" : T.muted,
            }}
          >{v ? "Yes" : "No"}</button>
        ))}
      </div>
    </div>
  );
}

// ── Step 0 — Category-specific intake ────────────────────────────────────────
function Step0({ category, data, onChange }: { category: string; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const toggleMulti = (key: string, val: string) => {
    const arr = (data[key] as string[] | undefined) ?? [];
    onChange({ ...data, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  };

  switch (category) {
    case "weight_loss":
      return (
        <div>
          <Slider label="Current weight" value={(data.currentWeightLbs as number) || 180} min={100} max={350} unit=" lbs" onChange={(v) => set("currentWeightLbs", v)} />
          <Slider label="Target weight" value={(data.targetWeightLbs as number) || 160} min={100} max={350} unit=" lbs" onChange={(v) => set("targetWeightLbs", v)} />
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Height</p>
            <div style={{ display: "flex", gap: 10 }}>
              <select value={(data.heightFt as number) || 5} onChange={(e) => set("heightFt", Number(e.target.value))}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {[4,5,6,7].map((f) => <option key={f} value={f}>{f} ft</option>)}
              </select>
              <select value={(data.heightIn as number) ?? 10} onChange={(e) => set("heightIn", Number(e.target.value))}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: T.text, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
                {Array.from({length:12},(_,i)=>i).map((i) => <option key={i} value={i}>{i} in</option>)}
              </select>
            </div>
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Target timeframe</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{v:30,l:"30 days"},{v:60,l:"60 days"},{v:90,l:"3 months"},{v:180,l:"6 months"},{v:365,l:"1 year"}].map(({v,l}) => (
              <Chip key={v} label={l} active={(data.timeframeDays as number) === v} onClick={() => set("timeframeDays", v)} />
            ))}
          </div>
        </div>
      );

    case "anti_aging":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Focus areas (select all that apply)</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["skin_texture","Skin texture"],["fine_lines","Fine lines & wrinkles"],["energy","Energy & vitality"],["hair_nails","Hair & nails"],["metabolic_age","Metabolic age"]].map(([v,l]) => (
              <Chip key={v} label={l} active={((data.focusAreas as string[]) ?? []).includes(v)} onClick={() => toggleMulti("focusAreas", v)} multi />
            ))}
          </div>
          <Slider label="Goal: look younger by" value={(data.desiredYoungerBy as number) || 5} min={3} max={15} unit=" years" onChange={(v) => set("desiredYoungerBy", v)} />
        </div>
      );

    case "performance":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Primary activity</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["weightlifting","Weightlifting"],["running","Running"],["cycling","Cycling"],["crossfit","CrossFit"],["team_sports","Team sports"],["hiit","HIIT"],["yoga_mobility","Yoga / Mobility"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.primaryActivity === v} onClick={() => set("primaryActivity", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Performance goal</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["strength","Build strength"],["endurance","Increase endurance"],["speed_power","Speed & power"],["body_recomp","Body recomposition"],["injury_recovery","Injury recovery"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.performanceGoal === v} onClick={() => set("performanceGoal", v)} />
            ))}
          </div>
        </div>
      );

    case "cognition":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Primary concerns (select all that apply)</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["focus","Difficulty focusing"],["memory","Memory lapses"],["mental_fatigue","Mental fatigue"],["brain_fog","Brain fog"],["motivation","Low motivation"],["prevention","Cognitive prevention"]].map(([v,l]) => (
              <Chip key={v} label={l} active={((data.primaryIssues as string[]) ?? []).includes(v)} onClick={() => toggleMulti("primaryIssues", v)} multi />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Work type</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["creative","Creative"],["analytical","Analytical / Technical"],["leadership","Leadership / Executive"],["student","Student"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.workType === v} onClick={() => set("workType", v)} />
            ))}
          </div>
        </div>
      );

    case "sleep":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Primary sleep issue</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["cant_fall_asleep","Can't fall asleep"],["wake_during","Wake during night"],["early_waking","Wake too early"],["unrestorative","Unrestorative sleep"],["irregular","Irregular schedule"],["jet_lag","Jet lag / shift work"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.primaryIssue === v} onClick={() => set("primaryIssue", v)} />
            ))}
          </div>
          <Slider label="Average current sleep" value={(data.avgCurrentSleepHours as number) || 6} min={3} max={9} unit="h" onChange={(v) => set("avgCurrentSleepHours", v)} />
        </div>
      );

    case "hair":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Hair loss pattern</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["diffuse","Diffuse thinning"],["receding","Receding hairline"],["crown","Crown thinning"],["postpartum","Postpartum shedding"],["stress_related","Stress-related"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.hairLossPattern === v} onClick={() => set("hairLossPattern", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>How long has it been occurring?</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["just_started","Just started"],["six_months","~6 months"],["one_two_years","1–2 years"],["three_plus","3+ years"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.duration === v} onClick={() => set("duration", v)} />
            ))}
          </div>
        </div>
      );

    case "mood":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Primary mood pattern</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["low_energy","Low energy & motivation"],["anxiety","Anxiety & worry"],["irritability","Irritability"],["emotional_flatness","Emotional flatness"],["seasonal","Seasonal mood changes"],["grief_loss","Grief / loss"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.primaryPattern === v} onClick={() => set("primaryPattern", v)} />
            ))}
          </div>
          <Slider label="Current severity" value={(data.severity as number) || 5} min={1} max={10} unit="/10" onChange={(v) => set("severity", v)} />
        </div>
      );

    case "sexual_health":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Biological sex</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[["male","Male"],["female","Female"]].map(([v,l]) => (
              <button key={v} type="button" onClick={() => set("biologicalSex", v)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13, cursor: "pointer",
                  fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "all .15s",
                  background: data.biologicalSex === v ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${data.biologicalSex === v ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.1)"}`,
                  color: data.biologicalSex === v ? "#A5B4FC" : T.muted,
                }}>{l}</button>
            ))}
          </div>
          {!!data.biologicalSex && (
            <>
              <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Primary concern</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(data.biologicalSex === "male"
                  ? [["libido","Libido / desire"],["energy_fatigue","Energy & fatigue"],["hormonal","Hormonal imbalance"],["performance","Performance"],["fertility","Fertility"]]
                  : [["libido","Libido / desire"],["energy_fatigue","Energy & fatigue"],["hormonal","Hormonal imbalance"],["cycle_health","Cycle health"],["menopause","Menopause / perimenopause"]]
                ).map(([v,l]) => (
                  <Chip key={v} label={l} active={data.primaryConcern === v} onClick={() => set("primaryConcern", v)} />
                ))}
              </div>
            </>
          )}
        </div>
      );

    default: return null;
  }
}

// ── Step 1 — Category-specific details ───────────────────────────────────────
function Step1({ category, data, onChange }: { category: string; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const toggleMulti = (key: string, val: string) => {
    const arr = (data[key] as string[] | undefined) ?? [];
    onChange({ ...data, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  };

  switch (category) {
    case "weight_loss":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Previous approaches tried (select all)</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["keto","Keto"],["calorie_counting","Calorie counting"],["intermittent_fasting","Intermittent fasting"],["low_carb","Low carb"],["none","None / first time"]].map(([v,l]) => (
              <Chip key={v} label={l} active={((data.previousApproaches as string[]) ?? []).includes(v)} onClick={() => toggleMulti("previousApproaches", v)} multi />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Biggest obstacle</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["hunger","Hunger & cravings"],["energy","Low energy"],["habits","Habits & consistency"],["metabolism","Slow metabolism"],["schedule","Busy schedule"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.mainObstacle === v} onClick={() => set("mainObstacle", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Exercise level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["sedentary","Sedentary"],["light","Light (1–2×/week)"],["moderate","Moderate (3–4×/week)"],["active","Active (5+×/week)"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.exerciseLevel === v} onClick={() => set("exerciseLevel", v)} />
            ))}
          </div>
        </div>
      );

    case "anti_aging":
      return (
        <div>
          <YesNo label="Do you have a daily skincare routine?" value={(data.hasSkincarRoutine as boolean | null) ?? null} onChange={(v) => set("hasSkincarRoutine", v)} />
          <YesNo label="Do you use daily sun protection (SPF 30+)?" value={(data.hasSunProtection as boolean | null) ?? null} onChange={(v) => set("hasSunProtection", v)} />
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Sleep quality</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["poor","Poor"],["fair","Fair"],["good","Good"],["excellent","Excellent"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.sleepQuality === v} onClick={() => set("sleepQuality", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Stress level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["low","Low"],["moderate","Moderate"],["high","High"],["very_high","Very high"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.stressLevel === v} onClick={() => set("stressLevel", v)} />
            ))}
          </div>
        </div>
      );

    case "performance":
      return (
        <div>
          <Slider label="Weekly training hours" value={(data.weeklyTrainingHours as number) || 6} min={1} max={20} unit="h" onChange={(v) => set("weeklyTrainingHours", v)} />
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Experience level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.experienceLevel === v} onClick={() => set("experienceLevel", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Target timeframe</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{v:30,l:"30 days"},{v:60,l:"60 days"},{v:90,l:"3 months"},{v:180,l:"6 months"}].map(({v,l}) => (
              <Chip key={v} label={l} active={(data.timeframeDays as number) === v} onClick={() => set("timeframeDays", v)} />
            ))}
          </div>
        </div>
      );

    case "cognition":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Daily caffeine intake</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["none","None"],["one_cup","1 cup"],["two_three","2–3 cups"],["four_plus","4+ cups"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.dailyCaffeine === v} onClick={() => set("dailyCaffeine", v)} />
            ))}
          </div>
          <Slider label="Average sleep hours" value={(data.avgSleepHours as number) || 7} min={4} max={10} unit="h" onChange={(v) => set("avgSleepHours", v)} />
          <YesNo label="Currently in a high-stress period?" value={(data.highStressPeriod as boolean | null) ?? null} onChange={(v) => set("highStressPeriod", v)} />
        </div>
      );

    case "sleep":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Typical bedtime</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["before_10pm","Before 10 pm"],["ten_to_eleven","10–11 pm"],["eleven_to_one","11 pm–1 am"],["after_one","After 1 am"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.typicalBedtime === v} onClick={() => set("typicalBedtime", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Screen use at bedtime</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["none","None"],["fifteen_thirty","15–30 min"],["one_hour_plus","1+ hour"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.screenTimeAtBed === v} onClick={() => set("screenTimeAtBed", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Sleep environment issues (select all)</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["noise","Noise"],["light","Light"],["temperature","Temperature"],["partner","Partner disturbance"]].map(([v,l]) => (
              <Chip key={v} label={l} active={((data.environmentIssues as string[]) ?? []).includes(v)} onClick={() => {
                const arr = (data.environmentIssues as string[] | undefined) ?? [];
                onChange({ ...data, environmentIssues: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
              }} multi />
            ))}
          </div>
        </div>
      );

    case "hair":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Family history of hair loss</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["yes","Yes"],["no","No"],["unsure","Unsure"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.familyHistory === v} onClick={() => set("familyHistory", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Previous treatments tried (select all)</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["minoxidil","Minoxidil"],["dht_blockers","DHT blockers"],["prp","PRP injections"],["biotin","Biotin supplements"],["none","None"]].map(([v,l]) => (
              <Chip key={v} label={l} active={((data.previousTreatments as string[]) ?? []).includes(v)} onClick={() => toggleMulti("previousTreatments", v)} multi />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Current stress level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["low","Low"],["moderate","Moderate"],["high","High"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.stressLevel === v} onClick={() => set("stressLevel", v)} />
            ))}
          </div>
        </div>
      );

    case "mood":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Main stress source</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["work","Work"],["relationships","Relationships"],["health","Health"],["financial","Financial"],["multiple","Multiple areas"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.stressSource === v} onClick={() => set("stressSource", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Exercise habits</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["none","None"],["light","Light"],["moderate","Moderate"],["regular","Regular"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.exerciseLevel === v} onClick={() => set("exerciseLevel", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Sleep quality</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["poor","Poor"],["fair","Fair"],["good","Good"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.sleepQuality === v} onClick={() => set("sleepQuality", v)} />
            ))}
          </div>
        </div>
      );

    case "sexual_health":
      return (
        <div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Stress level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["low","Low"],["moderate","Moderate"],["high","High"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.stressLevel === v} onClick={() => set("stressLevel", v)} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Exercise level</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[["sedentary","Sedentary"],["light","Light"],["active","Active"],["very_active","Very active"]].map(([v,l]) => (
              <Chip key={v} label={l} active={data.exerciseLevel === v} onClick={() => set("exerciseLevel", v)} />
            ))}
          </div>
          <YesNo label="Do you have sleep issues affecting recovery?" value={(data.hasSleepIssues as boolean | null) ?? null} onChange={(v) => set("hasSleepIssues", v)} />
        </div>
      );

    default: return null;
  }
}

// ── Step 2 — Shared constraints ───────────────────────────────────────────────
function Step2({ form, onChange }: { form: GoalPrepFormData; onChange: (f: GoalPrepFormData) => void }) {
  const CONDITIONS = ["Hypertension", "High LDL", "Diabetes", "Sleep Apnea"];
  const toggleCondition = (c: string) => {
    const current = form.knownConditions ?? [];
    const updated  = current.includes(c) ? current.filter((x) => x !== c) : [...current, c];
    const withNone = c === "None" ? ["None"] : updated.filter((x) => x !== "None");
    onChange({ ...form, knownConditions: withNone });
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Known conditions (select all that apply)</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {[...CONDITIONS, "None"].map((c) => (
          <Chip key={c} label={c} active={(form.knownConditions ?? []).includes(c)} onClick={() => toggleCondition(c)} multi />
        ))}
      </div>
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Current medications (optional)</p>
        <input
          type="text"
          placeholder="e.g. Metformin, Statins, SSRIs..."
          value={form.medications}
          onChange={(e) => onChange({ ...form, medications: e.target.value })}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", boxSizing: "border-box",
          }}
        />
      </div>
      <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 8 }}>Stimulant tolerance</p>
      <div style={{ display: "flex", gap: 8 }}>
        {[["Low","Low"],["Moderate","Moderate"],["High","High"]].map(([v,l]) => (
          <Chip key={v} label={l} active={form.stimulantTolerance === v} onClick={() => onChange({ ...form, stimulantTolerance: v })} />
        ))}
      </div>
    </div>
  );
}

// ── Step 3 — Shared budget ────────────────────────────────────────────────────
function Step3({ form, onChange }: { form: GoalPrepFormData; onChange: (f: GoalPrepFormData) => void }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>Monthly investment</span>
          <span style={{ fontSize: 18, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)", color: T.text, fontWeight: 600 }}>
            ${form.budgetValue.toLocaleString()}
          </span>
        </div>
        <input
          type="range" min={1} max={20000} step={50} value={form.budgetValue}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange({ ...form, budgetValue: v, budgetTier: getBudgetTier(v) });
          }}
          style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BUDGET_TIERS.map((t) => (
          <div key={t.tier}
            onClick={() => onChange({ ...form, budgetValue: t.min, budgetTier: t.tier })}
            style={{
              padding: "14px 16px", borderRadius: 10, cursor: "pointer", transition: "all .15s",
              background: form.budgetTier === t.tier ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${form.budgetTier === t.tier ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: form.budgetTier === t.tier ? "#A5B4FC" : T.text, fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500 }}>
                Tier {t.tier} — {t.label}
              </span>
              <span style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-mono,'JetBrains Mono',monospace)" }}>{t.range}</span>
            </div>
            <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", margin: 0 }}>{t.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen({ form, onComplete, onError, preWarmedId }: {
  form: GoalPrepFormData;
  onComplete: (id: string) => void;
  onError: (e: string) => void;
  preWarmedId?: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [typedMsg, setTypedMsg]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const category = GOAL_CATEGORIES[form.category];
  const MESSAGE  = `Analyzing your ${category?.label.toLowerCase() ?? "goal"} data and building your personalized protocol`;

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTypedMsg(MESSAGE.slice(0, i));
      if (i >= MESSAGE.length) clearInterval(t);
    }, 22);
    return () => clearInterval(t);
  }, [MESSAGE]);

  useEffect(() => {
    const STEP_TIMINGS = [1500, 4000, 7000, 10000];
    const timers = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => setCurrentStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  function startPolling(id: string) {
    const POLL_INTERVAL_MS = 1500;
    const TIMEOUT_MS       = 120_000;
    const timeoutId = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      onError("Generation is taking longer than expected. Please try again.");
    }, TIMEOUT_MS);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/goal-prep/status/${id}`);
        if (!res.ok) return;
        const { status, error: errMsg } = await res.json() as { status: string; error: string | null };
        if (status === "ready") {
          clearTimeout(timeoutId);
          clearInterval(pollRef.current!);
          setCurrentStep(LOADING_STEPS.length);
          console.log("[analytics] goal_prep_protocol_ready", { category: form.category, tier: form.budgetTier });
          setTimeout(() => onComplete(id), 600);
        } else if (status === "failed") {
          clearTimeout(timeoutId);
          clearInterval(pollRef.current!);
          onError(errMsg ?? "Protocol generation failed. Please try again.");
        }
      } catch { /* network hiccup — keep polling */ }
    }, POLL_INTERVAL_MS);
  }

  useEffect(() => {
    if (preWarmedId) {
      console.log("[goal-prep] pre-warm hit, skipping POST for id:", preWarmedId);
      startPolling(preWarmedId);
    } else {
      fetch("/api/goal-prep/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
        .then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            throw new Error((body as { error?: string }).error ?? `Server error ${r.status}`);
          }
          return r.json() as Promise<{ goalPrepId: string }>;
        })
        .then(({ goalPrepId }) => startPolling(goalPrepId))
        .catch((err) => onError(err instanceof Error ? err.message : "Something went wrong"));
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 24, boxShadow: "0 8px 32px rgba(99,102,241,0.4)" }}>
        {category?.icon ?? "⚡"}
      </div>
      <p style={{ fontSize: 13, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", textAlign: "center", maxWidth: 360, lineHeight: 1.7, marginBottom: 32, minHeight: 44 }}>
        {typedMsg}<span style={{ animation: "blink 1s infinite" }}>|</span>
      </p>
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        {LOADING_STEPS.map((s, i) => {
          const done   = currentStep > i;
          const active = currentStep === i;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, opacity: done ? 1 : active ? 1 : 0.35, transition: "opacity .4s" }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                background: done ? "rgba(16,185,129,.15)" : active ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.05)",
                border: `1px solid ${done ? "rgba(16,185,129,.5)" : active ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)"}`,
                color: done ? "#34D399" : active ? "#A5B4FC" : T.muted,
              }}>
                {done ? "✓" : active ? "→" : "●"}
              </div>
              <span style={{ fontSize: 13, color: done ? "#34D399" : active ? T.text : T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)", transition: "color .4s" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ── Step labels ───────────────────────────────────────────────────────────────
function getStepLabel(category: string, step: number): string {
  const labels: Record<string, string[]> = {
    weight_loss:   ["Body metrics", "Your approach", "Health profile", "Investment"],
    anti_aging:    ["Focus areas", "Current habits", "Health profile", "Investment"],
    performance:   ["Activity & goal", "Training details", "Health profile", "Investment"],
    cognition:     ["Your concerns", "Lifestyle", "Health profile", "Investment"],
    sleep:         ["Sleep issue", "Sleep habits", "Health profile", "Investment"],
    hair:          ["Hair loss type", "Background", "Health profile", "Investment"],
    mood:          ["Mood pattern", "Context", "Health profile", "Investment"],
    sexual_health: ["Primary concern", "Lifestyle", "Health profile", "Investment"],
  };
  return labels[category]?.[step] ?? ["Step 1", "Step 2", "Step 3", "Step 4"][step];
}

function canAdvance(step: number, category: string, form: GoalPrepFormData): boolean {
  const cd = form.categoryData;
  switch (step) {
    case 0:
      switch (category) {
        case "weight_loss":   return !!(cd.currentWeightLbs && cd.targetWeightLbs && cd.timeframeDays);
        case "anti_aging":    return !!((cd.focusAreas as string[] | undefined)?.length && cd.desiredYoungerBy);
        case "performance":   return !!(cd.primaryActivity && cd.performanceGoal);
        case "cognition":     return !!((cd.primaryIssues as string[] | undefined)?.length && cd.workType);
        case "sleep":         return !!(cd.primaryIssue && cd.avgCurrentSleepHours);
        case "hair":          return !!(cd.hairLossPattern && cd.duration);
        case "mood":          return !!(cd.primaryPattern && cd.severity);
        case "sexual_health": return !!(cd.biologicalSex && cd.primaryConcern);
        default: return true;
      }
    case 1:
      switch (category) {
        case "weight_loss":   return !!(cd.mainObstacle && cd.exerciseLevel);
        case "anti_aging":    return !!(cd.sleepQuality && cd.stressLevel);
        case "performance":   return !!(cd.weeklyTrainingHours && cd.experienceLevel && cd.timeframeDays);
        case "cognition":     return !!(cd.dailyCaffeine && cd.avgSleepHours);
        case "sleep":         return !!(cd.typicalBedtime && cd.screenTimeAtBed);
        case "hair":          return !!(cd.familyHistory && cd.stressLevel);
        case "mood":          return !!(cd.stressSource && cd.exerciseLevel && cd.sleepQuality);
        case "sexual_health": return !!(cd.stressLevel && cd.exerciseLevel);
        default: return true;
      }
    case 2: return !!form.stimulantTolerance;
    case 3: return form.budgetValue > 0;
    default: return false;
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
function GoalPrepContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const category     = searchParams.get("category") ?? "";

  const categoryMeta = GOAL_CATEGORIES[category];
  if (!categoryMeta) {
    if (typeof window !== "undefined") router.replace("/app/goals");
    return null;
  }

  const STORAGE_KEY = `bz_goal_prep_v1_${category}`;

  const defaultForm: GoalPrepFormData = {
    category,
    age: 35, gender: "Male",
    knownConditions: [], medications: "", stimulantTolerance: "",
    budgetValue: 100, budgetTier: 1,
    categoryData: {},
  };

  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<GoalPrepFormData>(defaultForm);
  const [phase, setPhase]           = useState<"form" | "loading" | "error">("form");
  const [errorMsg, setErrorMsg]     = useState("");
  const [preWarmedId, setPreWarmedId] = useState<string | undefined>();
  const preWarmFiredRef             = useRef(false);

  // Restore from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setForm(JSON.parse(saved) as GoalPrepFormData);
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(updated: GoalPrepFormData) {
    setForm(updated);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }

  // Pre-warm when budget step (step 3) becomes visible
  useEffect(() => {
    if (step !== 3 || preWarmFiredRef.current) return;
    preWarmFiredRef.current = true;
    fetch("/api/goal-prep/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { goalPrepId?: string } | null) => {
        if (data?.goalPrepId) {
          setPreWarmedId(data.goalPrepId);
          console.log("[goal-prep] pre-warm fired, id:", data.goalPrepId);
        }
      })
      .catch(() => { /* pre-warm failure is silent */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (phase === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bz-midnight, #06080F)", display: "flex", flexDirection: "column" }}>
        <LoadingScreen
          form={form}
          preWarmedId={preWarmedId}
          onComplete={(id) => {
            try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
            router.push(`/app/results/goal/${id}`);
          }}
          onError={(msg) => { setErrorMsg(msg); setPhase("error"); }}
        />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bz-midnight, #06080F)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: T.text, fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: 22, marginBottom: 10 }}>Generation failed</h2>
          <p style={{ color: T.muted, fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)", marginBottom: 24 }}>{errorMsg}</p>
          <button onClick={() => { preWarmFiredRef.current = false; setPreWarmedId(undefined); setPhase("form"); setStep(3); }}
            style={{ padding: "12px 24px", borderRadius: 10, background: GRAD, color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const TOTAL_STEPS = 4;
  const progressPct = ((step) / TOTAL_STEPS) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bz-midnight, #06080F)", display: "flex", flexDirection: "column" }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ height: "100%", background: GRAD, width: `${progressPct}%`, transition: "width .4s" }} />
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px 80px", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: ".1em", color: "#6366F1", fontFamily: "var(--font-ui,'Inter',sans-serif)", textTransform: "uppercase", marginBottom: 8 }}>
            ⬡ {categoryMeta.icon} {categoryMeta.label} PREP PACK
          </div>
          <h1 style={{ fontFamily: "var(--font-serif,'Syne',sans-serif)", fontWeight: 400, fontSize: "clamp(22px,3vw,30px)", letterSpacing: "-.02em", lineHeight: 1.2, color: T.text, marginBottom: 6 }}>
            {getStepLabel(category, step)}
          </h1>
          <p style={{ fontSize: 12, color: T.muted, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}>
            Step {step + 1} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Step content */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: "24px 22px", marginBottom: 24 }}>
          {step === 0 && (
            <Step0
              category={category}
              data={form.categoryData}
              onChange={(d) => updateForm({ ...form, categoryData: d })}
            />
          )}
          {step === 1 && (
            <Step1
              category={category}
              data={form.categoryData}
              onChange={(d) => updateForm({ ...form, categoryData: d })}
            />
          )}
          {step === 2 && <Step2 form={form} onChange={updateForm} />}
          {step === 3 && <Step3 form={form} onChange={updateForm} />}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.push("/app/goals")}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: T.muted, cursor: "pointer", padding: "10px 18px", fontSize: 13, fontFamily: "var(--font-ui,'Inter',sans-serif)" }}
          >
            ← {step === 0 ? "Back" : "Previous"}
          </button>
          {step < TOTAL_STEPS - 1 ? (
            <button
              disabled={!canAdvance(step, category, form)}
              onClick={() => setStep(step + 1)}
              style={{
                padding: "10px 24px", borderRadius: 8, fontSize: 13,
                fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, cursor: "pointer", border: "none",
                background: canAdvance(step, category, form) ? GRAD : "rgba(255,255,255,0.08)",
                color: canAdvance(step, category, form) ? "#fff" : T.muted,
                opacity: canAdvance(step, category, form) ? 1 : 0.7,
                transition: "all .15s",
              }}
            >
              Next →
            </button>
          ) : (
            <button
              disabled={!canAdvance(step, category, form)}
              onClick={() => setPhase("loading")}
              style={{
                padding: "10px 24px", borderRadius: 8, fontSize: 13,
                fontFamily: "var(--font-ui,'Inter',sans-serif)", fontWeight: 500, cursor: "pointer", border: "none",
                background: canAdvance(step, category, form) ? GRAD : "rgba(255,255,255,0.08)",
                color: canAdvance(step, category, form) ? "#fff" : T.muted,
                opacity: canAdvance(step, category, form) ? 1 : 0.7,
                boxShadow: canAdvance(step, category, form) ? "0 0 20px rgba(99,102,241,0.4)" : "none",
                transition: "all .15s",
              }}
            >
              Generate my pack ✦
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoalPrepPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bz-midnight,#06080F)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(124,58,237,.2)", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <GoalPrepContent />
    </Suspense>
  );
}
