'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { PRIORITY_CONFIG } from '@/lib/constants/priority'

type AdoptionState = 'pending' | 'adopted' | 'existing' | 'deferred'

interface RecommendationCardProps {
  id: string
  title: string
  category: 'supplement' | 'nutrition' | 'lifestyle'
  priority: 'high' | 'medium' | 'low'
  detectedSignal: string
  mechanism: string
  dosageInstruction: string
  tags: string[]
  evidenceLabel: string
  adoptionState: AdoptionState
  safetyNote?: string
  onAdopt: (id: string) => Promise<void>
  onExisting: (id: string) => Promise<void>
  onDefer: (id: string) => Promise<void>
  onViewEvidence: (id: string) => void
  onTagClick?: (tag: string) => void
}

const CATEGORY_LABEL: Record<RecommendationCardProps['category'], string> = {
  supplement: 'Supplement',
  nutrition: 'Nutrition',
  lifestyle: 'Lifestyle',
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="mb-1 block text-xs uppercase tracking-widest text-[#3B82F6]">
      {children}
    </span>
  )
}

export default function RecommendationCard({
  id,
  title,
  category,
  priority,
  detectedSignal,
  mechanism,
  dosageInstruction,
  tags,
  evidenceLabel,
  adoptionState: initialState,
  safetyNote,
  onAdopt,
  onExisting,
  onDefer,
  onViewEvidence,
  onTagClick,
}: RecommendationCardProps) {
  const [state, setState] = useState<AdoptionState>(initialState)
  const [pulsing, setPulsing] = useState(false)
  const pulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (pulseTimeout.current) clearTimeout(pulseTimeout.current)
    }
  }, [])
  const handleAdopt = useCallback(async () => {
    const prev = state
    setState('adopted')
    setPulsing(true)
    pulseTimeout.current = setTimeout(() => setPulsing(false), 400)

    try {
      await onAdopt(id)
    } catch {
      setState(prev)
      toast.error('Failed to add recommendation. Please try again.')
    }
  }, [id, state, onAdopt])

  const handleExisting = useCallback(async () => {
    const prev = state
    setState('existing')
    try {
      await onExisting(id)
    } catch {
      setState(prev)
      toast.error('Something went wrong. Please try again.')
    }
  }, [id, state, onExisting])

  const handleDefer = useCallback(async () => {
    const prev = state
    setState('deferred')
    try {
      await onDefer(id)
    } catch {
      setState(prev)
      toast.error('Something went wrong. Please try again.')
    }
  }, [id, state, onDefer])

  const handleUndo = useCallback(() => {
    setState('pending')
  }, [])

  const pc = PRIORITY_CONFIG[priority]
  const borderColor = pulsing ? 'border-l-emerald-400' : pc.border

  return (
    <article
      aria-label={title}
      className={`rounded-2xl border-l-4 bg-[#111118] p-6 transition-colors duration-[400ms] ${borderColor}`}
    >
      <div className="space-y-4">
        {/* 1. Priority badge + category tag */}
        <div className="flex items-center gap-2">
        <span title={pc.description} className={`rounded-full bg-[#1A1A24] px-3 py-1 text-xs ${pc.badge}`}>
            {pc.label}
          </span>
          <span className="rounded-full bg-[#1A1A24] px-3 py-1 text-xs text-[#94A3B8]">
            {CATEGORY_LABEL[category]}
          </span>
        </div>

        {/* 2. Title */}
        <h3 className="font-[family-name:var(--font-syne)] text-xl font-semibold text-white">
          {title}
        </h3>

        {/* 3. WHY */}
        <div>
          <SectionLabel>Why this for you</SectionLabel>
          <p className="text-sm text-[#94A3B8]">{detectedSignal}</p>
        </div>

        {/* 4. WHAT */}
        <div>
          <SectionLabel>How it works</SectionLabel>
          <p className="text-sm text-[#94A3B8]">{mechanism}</p>
        </div>

        {/* 5. HOW */}
        <div className="rounded-lg bg-[#0A0A0F] px-4 py-2 font-mono text-sm text-white">
          {dosageInstruction}
        </div>

        {/* 6. Safety note */}
        {safetyNote && (
          <p className="text-xs text-amber-400">
            ⚠ {safetyNote}
          </p>
        )}

        {/* 7. Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-full bg-[#1A1A24] px-3 py-1 text-xs text-[#94A3B8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* 8. Evidence */}
        <button
          type="button"
          onClick={() => onViewEvidence(id)}
          className="text-xs text-[#94A3B8] underline underline-offset-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          aria-label={`View evidence for ${title}`}
        >
          {evidenceLabel}
        </button>

        {/* 9. Actions */}
        <div>
          {state === 'pending' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAdopt}
                className="rounded-xl border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                aria-label={`Add ${title} to protocol`}
              >
                Add to protocol
              </button>
              <button
                type="button"
                onClick={handleExisting}
                className="rounded-xl bg-[#1A1A24] px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                aria-label={`Mark ${title} as already doing`}
              >
                Already doing this
              </button>
              <button
                type="button"
                onClick={handleDefer}
                className="text-sm text-[#94A3B8] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                aria-label={`Skip ${title} for now`}
              >
                Skip for now
              </button>
            </div>
          )}

          {state === 'adopted' && (
            <div className="rounded-xl bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
              ✓ Added to your protocol
            </div>
          )}

          {state === 'existing' && (
            <p className="text-sm text-[#94A3B8]">
              ✓ You already do this
            </p>
          )}

          {state === 'deferred' && (
            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <span>Skipped for now</span>
              <span>·</span>
              <button
                type="button"
                onClick={handleUndo}
                className="text-[#94A3B8] underline underline-offset-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
                aria-label={`Undo skip for ${title}`}
              >
                Undo?
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
