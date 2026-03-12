'use client'

import { useEffect, useRef, useState } from 'react'

type Tab = 'all' | 'pending' | 'adopted' | 'deferred'

interface RecommendationTabsProps {
  total: number
  pending: number   // reserved — Pending tab intentionally removed
  adopted: number
  deferred: number
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-1 rounded-full bg-[#1A1A24] px-2 py-0.5 text-xs">
      {count}
    </span>
  )
}

export default function RecommendationTabs({
  total,
  adopted,
  deferred,
  activeTab,
  onTabChange,
}: RecommendationTabsProps) {
  const [adoptedSeen, setAdoptedSeen] = useState(adopted > 0)
  const prevAdopted = useRef(adopted)

  useEffect(() => {
    if (adopted > 0 && prevAdopted.current === 0) {
      setAdoptedSeen(false)
      const id = requestAnimationFrame(() => setAdoptedSeen(true))
      return () => cancelAnimationFrame(id)
    }
    prevAdopted.current = adopted
  }, [adopted])

  const base = 'pb-2 transition-colors cursor-pointer'
  const active = `${base} border-b-2 border-[#3B82F6] text-white`
  const inactive = `${base} text-[#94A3B8] hover:text-white`

  return (
    <div className="flex gap-6 border-b border-white/5">
      <button
        type="button"
        onClick={() => onTabChange('all')}
        className={activeTab === 'all' ? active : inactive}
      >
        All
        <CountBadge count={total} />
      </button>

      {adopted > 0 && (
        <button
          type="button"
          onClick={() => onTabChange('adopted')}
          className={`${activeTab === 'adopted' ? active : inactive} ${
            !adoptedSeen
              ? 'translate-x-2 opacity-0'
              : 'translate-x-0 opacity-100'
          } transition-all duration-[250ms] ease-out`}
        >
          Adopted
          <CountBadge count={adopted} />
        </button>
      )}

      {deferred > 0 && (
        <button
          type="button"
          onClick={() => onTabChange('deferred')}
          className={activeTab === 'deferred' ? active : inactive}
        >
          Skipped
          <CountBadge count={deferred} />
        </button>
      )}
    </div>
  )
}
