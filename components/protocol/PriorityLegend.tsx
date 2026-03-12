'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PRIORITY_CONFIG, type Priority } from '@/lib/constants/priority'

const DOT_COLOR: Record<Priority, string> = {
  high: 'bg-amber-400',
  medium: 'bg-blue-400',
  low: 'bg-slate-600',
}

const ENTRIES = (Object.keys(PRIORITY_CONFIG) as Priority[]).map((key) => ({
  key,
  ...PRIORITY_CONFIG[key],
  dot: DOT_COLOR[key],
}))

export default function PriorityLegend() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, handleClickOutside])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Priority level legend"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 text-xs text-[#94A3B8] transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#1A1A24] p-4 shadow-xl">
          <p className="mb-3 text-xs font-medium text-white">Priority levels</p>
          <div className="space-y-2.5">
            {ENTRIES.map((entry) => (
              <div key={entry.key} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${entry.dot}`}
                />
                <div>
                  <span className="text-sm text-white">{entry.label}</span>
                  <p className="text-xs text-[#94A3B8]">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
