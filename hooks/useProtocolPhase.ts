/// hooks/useProtocolPhase.ts
import { useCallback, useState } from 'react'

const STORAGE_KEY = 'bz-protocol-phase'

function readPhase(): 1 | 2 {
  if (typeof window === 'undefined') return 1
  return localStorage.getItem(STORAGE_KEY) === '2' ? 2 : 1
}

export function useProtocolPhase(): { phase: 1 | 2; advancePhase: () => void } {
  const [phase, setPhase] = useState<1 | 2>(readPhase)

  const advancePhase = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '2')
    setPhase(2)
  }, [])

  return { phase, advancePhase }
}