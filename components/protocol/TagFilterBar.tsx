'use client'

interface TagFilterBarProps {
  allTags: string[]
  activeTags: string[]
  onToggle: (tag: string) => void
  onClear: () => void
}

export default function TagFilterBar({
  allTags,
  activeTags,
  onToggle,
  onClear,
}: TagFilterBarProps) {
  if (allTags.length <= 3) return null

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Filter by tag"
    >
      {allTags.map((tag) => {
        const isActive = activeTags.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            aria-pressed={isActive}
            className={
              isActive
                ? 'shrink-0 rounded-full border border-[#3B82F6] bg-[#3B82F6]/20 px-3 py-1 text-xs text-[#3B82F6] transition-colors'
                : 'shrink-0 rounded-full bg-[#1A1A24] px-3 py-1 text-xs text-[#94A3B8] transition-colors hover:text-white'
            }
          >
            {tag}
          </button>
        )
      })}

      {activeTags.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs text-[#94A3B8] transition-colors hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  )
}
