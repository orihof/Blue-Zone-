'use client'

import type { OutcomeSummary } from '@/lib/types/health'

interface ProtocolOutcomesProps {
  checkInsCompleted: number
  checkInsRequired: number
  recommendationsAdopted: number
  hasOutcomeData: boolean
  outcomeData?: OutcomeSummary
}

/* ── Step track ────────────────────────────────────────────────── */

interface Step {
  label: string
  completed: boolean
}

function StepTrack({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          {/* Connector line (before steps 2+) */}
          {i > 0 && (
            <div
              className={`h-0.5 w-8 sm:w-12 ${
                step.completed ? 'bg-emerald-500' : 'bg-[#1A1A24]'
              }`}
            />
          )}

          {/* Step circle + label */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step.completed
                  ? 'bg-emerald-500 text-white'
                  : 'border border-white/10 bg-[#1A1A24] text-[#94A3B8]'
              }`}
            >
              {step.completed ? '✓' : i + 1}
            </div>
            <span className="max-w-[100px] text-center text-[11px] leading-tight text-[#94A3B8]">
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Ghost preview metrics ─────────────────────────────────────── */

const GHOST_METRICS = ['Sleep score trend', 'Energy baseline', 'Recovery index']

function GhostPreview() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {GHOST_METRICS.map((label) => (
        <div key={label} className="space-y-1.5">
          <span className="block text-xs text-[#94A3B8]/40">{label}</span>
          <div className="h-16 w-full animate-pulse rounded-xl bg-[#0A0A0F] opacity-40" />
        </div>
      ))}
    </div>
  )
}

/* ── Outcome data display ──────────────────────────────────────── */

function OutcomeDataView({ data }: { data: OutcomeSummary }) {
  const metrics = [
    {
      label: 'Adherence',
      value: `${data.total_adherence_days}d`,
      sub: `${data.longest_streak_days}d streak`,
    },
    {
      label: 'Biomarkers normalized',
      value: String(data.biomarkers_normalized),
      sub: null,
    },
    {
      label: 'Bio age change',
      value:
        data.bio_age_change_years !== null
          ? `${data.bio_age_change_years > 0 ? '+' : ''}${data.bio_age_change_years}y`
          : '—',
      sub: null,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-[#0A0A0F] px-4 py-3">
            <span className="block text-xs text-[#94A3B8]">{m.label}</span>
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-lg text-white">
              {m.value}
            </span>
            {m.sub && (
              <span className="block text-[11px] text-[#94A3B8]">{m.sub}</span>
            )}
          </div>
        ))}
      </div>

      {data.summary_narrative && (
        <p className="text-sm leading-relaxed text-[#94A3B8]">
          {data.summary_narrative}
        </p>
      )}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────── */

export default function ProtocolOutcomes({
  checkInsCompleted,
  checkInsRequired,
  recommendationsAdopted,
  hasOutcomeData,
  outcomeData,
}: ProtocolOutcomesProps) {
  const remaining = Math.max(0, checkInsRequired - checkInsCompleted)
  const generating = checkInsCompleted >= checkInsRequired && !hasOutcomeData

  const subtext = generating
    ? 'Generating your first outcome summary...'
    : `Activates after ${remaining} more check-in${remaining === 1 ? '' : 's'}.`

  const steps: Step[] = [
    { label: 'Complete your first check-in', completed: checkInsCompleted >= 1 },
    { label: 'Adopt one recommendation', completed: recommendationsAdopted >= 1 },
    { label: 'Return tomorrow', completed: checkInsCompleted >= 2 },
  ]

  return (
    <section className="space-y-6 rounded-2xl bg-[#111118] p-6">
      <div>
        <h2 className="font-[family-name:var(--font-syne)] text-lg text-white">
          Your outcomes dashboard
        </h2>
        {!hasOutcomeData && (
          <p className="mt-1 text-sm text-[#94A3B8]">{subtext}</p>
        )}
      </div>

      {hasOutcomeData && outcomeData ? (
        <OutcomeDataView data={outcomeData} />
      ) : (
        <div className="space-y-8">
          <div className="flex justify-center">
            <StepTrack steps={steps} />
          </div>
          <GhostPreview />
        </div>
      )}
    </section>
  )
}
