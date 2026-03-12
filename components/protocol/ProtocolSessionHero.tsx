'use client'

import { useState, useCallback } from 'react'

type EnergyLevel = 'low' | 'okay' | 'energized'

interface ProtocolSessionHeroProps {
  topRecommendation: {
    title: string
    detectedSignal: string
    category: 'supplement' | 'nutrition' | 'lifestyle'
  }
  checkInState: 'pending' | 'complete'
  onCheckInSubmit: (energy: EnergyLevel) => Promise<void>
  onStartRecommendation: () => void
  onCheckInComplete?: () => void
}

const ENERGY_OPTIONS: {
  value: EnergyLevel
  label: string
  dotClass: string
}[] = [
  { value: 'low', label: 'Low energy', dotClass: 'bg-red-500' },
  { value: 'okay', label: 'Feeling okay', dotClass: 'bg-amber-400' },
  { value: 'energized', label: 'Energized', dotClass: 'bg-emerald-400' },
]

export default function ProtocolSessionHero({
  topRecommendation,
  checkInState,
  onCheckInSubmit,
  onStartRecommendation,
  onCheckInComplete,
}: ProtocolSessionHeroProps) {
  const [selected, setSelected] = useState<EnergyLevel | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showHero, setShowHero] = useState(checkInState === 'complete')

  const handleSubmit = useCallback(async () => {
    if (!selected || submitting) return
    setSubmitting(true)
    setShowHero(true)
    onCheckInComplete?.()
    try {
      await onCheckInSubmit(selected)
    } catch {
      setShowHero(false)
    } finally {
      setSubmitting(false)
    }
  }, [selected, submitting, onCheckInSubmit, onCheckInComplete])

  return (
    <div
      role="region"
      aria-label="Today's protocol focus"
      className="rounded-2xl border border-white/5 bg-[#111118] p-6"
    >
      {!showHero ? (
        <div className="space-y-5">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold text-white">
              How are you feeling today?
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Your answer adjusts today&apos;s protocol priority.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {ENERGY_OPTIONS.map((option) => {
              const isSelected = selected === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelected(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-sm font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border border-[#3B82F6] bg-[#3B82F6]/10 text-white'
                      : 'border border-white/5 bg-[#1A1A24] text-[#94A3B8] hover:border-white/10'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${option.dotClass}`}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="w-full rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Updating…' : 'Submit check-in'}
          </button>
        </div>
      ) : (
        <div className="animate-hero-fade-in space-y-4">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-white">
              Your move today: {topRecommendation.title}
            </h2>
            <p className="mt-2 text-sm text-[#94A3B8]">
              {topRecommendation.detectedSignal}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartRecommendation}
            className="rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start this now &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
