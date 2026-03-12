'use client'

import { useState, useEffect, useCallback } from 'react'

interface ProtocolDisclaimerProps {
  isQuestionnaireBased: boolean
  hasBloodTestData: boolean
}

const STORAGE_KEY = 'bz-disclaimer-dismissed'
const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  const ts = Number(raw)
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < TTL_MS
}

export default function ProtocolDisclaimer({
  isQuestionnaireBased,
  hasBloodTestData,
}: ProtocolDisclaimerProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    setDismissed(isDismissed())
  }, [])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  if (dismissed) return null

  const showUploadCta = isQuestionnaireBased && !hasBloodTestData

  return (
    <div className="sticky bottom-20 z-30 md:static md:bottom-auto">
      <div
      className={`relative rounded-xl p-4 ${
          showUploadCta
            ? 'border border-amber-500/20 bg-amber-500/5'
            : 'border border-white/5 bg-[#111118]'
        }`}
      >
        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 text-[#94A3B8] transition-colors hover:text-white"
          aria-label="Dismiss disclaimer"
        >
          ×
        </button>

        <div className="space-y-2 pr-6">
          {showUploadCta && (
            <p className="text-sm text-amber-400">
              This protocol is based on your questionnaire only. Upload blood
              test results for a higher-confidence protocol.{' '}
              <a
                href="/app/onboarding/upload"
                className="text-amber-400 underline underline-offset-2 transition-colors hover:text-amber-300"
              >
                Upload results →
              </a>
            </p>
          )}

          <p className="text-xs text-[#94A3B8]">
            Blue Zone provides educational health information only. Always
            consult a clinician before beginning any supplement or dietary
            protocol.
          </p>
        </div>
      </div>
    </div>
  )
}
