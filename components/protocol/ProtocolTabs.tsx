'use client'

type Tab = 'protocol' | 'sources'

interface ProtocolTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  hasWearableConnected: boolean
  hasBloodTestUploaded: boolean
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'protocol', label: 'Daily Protocol' },
  { id: 'sources', label: 'Data & Sources' },
]

export default function ProtocolTabs({
  activeTab,
  onTabChange,
  hasWearableConnected,
  hasBloodTestUploaded,
}: ProtocolTabsProps) {
  const needsAttention = !hasWearableConnected && !hasBloodTestUploaded

  return (
    <div className="mb-6">
      <div className="flex gap-6 border-b border-white/5">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative pb-2 transition-colors ${
              activeTab === id
                ? 'border-b-2 border-[#3B82F6] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            {label}
            {id === 'sources' && needsAttention && (
              <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'sources' && (
        <p className="mb-4 mt-3 text-sm text-[#94A3B8]">
          The inputs that power your protocol — connect more to increase
          confidence.
        </p>
      )}
    </div>
  )
}
