/// hooks/useTagFilter.ts
import { useState, useCallback, useMemo } from 'react'

export interface UseTagFilterReturn {
  activeTags: string[]
  toggleTag: (tag: string) => void
  clearTags: () => void
  filterRecommendations: <T extends { tags: string[] }>(items: T[]) => T[]
}

export function useTagFilter(): UseTagFilterReturn {
  const [activeTags, setActiveTags] = useState<string[]>([])

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  const clearTags = useCallback(() => {
    setActiveTags([])
  }, [])

  const filterRecommendations = useCallback(
    <T extends { tags: string[] }>(items: T[]): T[] => {
      if (activeTags.length === 0) return items
      return items.filter((item) =>
        activeTags.every((tag) => item.tags.includes(tag)),
      )
    },
    [activeTags],
  )

  return useMemo(
    () => ({ activeTags, toggleTag, clearTags, filterRecommendations }),
    [activeTags, toggleTag, clearTags, filterRecommendations],
  )
}
