'use client'

import { useState } from 'react'

type Provider =
  | 'whoop' | 'oura' | 'strava'
  | 'apple_health' | 'samsung_health'

interface Props {
  initialConnected: string[]
}

const LIVE: Provider[] = ['whoop', 'oura', 'strava']
const IMPORT: Provider[] = ['apple_health', 'samsung_health']

const LABELS: Record<Provider, string> = {
  whoop:          'WHOOP',
  oura:           'Oura Ring',
  strava:         'Strava',
  apple_health:   'Apple Health',
  samsung_health: 'Samsung Health',
}

const CAPS: Record<Provider, string> = {
  whoop:          'HRV · Strain · Sleep · Recovery',
  oura:           'Sleep · Readiness · HRV · Activity',
  strava:         'Workouts · Training load · Routes',
  apple_health:   'Steps · Heart rate · Sleep · Workouts',
  samsung_health: 'Steps · Heart rate · Sleep · Stress',
}

export function WearablesClient({ initialConnected }: Props) {
  const [connected, setConnected] = useState<Set<Provider>>(
    new Set(initialConnected as Provider[])
  )
  const [loading, setLoading] = useState<Provider | null>(null)

  const isConnected = (p: Provider) => connected.has(p)
  const connectedCount = connected.size
  async function handleConnect(provider: Provider) {
    setLoading(provider)
    try {
      const res = await fetch('/api/wearables/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (res.ok) {
        setConnected(prev => new Set([...Array.from(prev), provider]))
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleDisconnect(provider: Provider) {
    setLoading(provider)
    try {
      const res = await fetch('/api/wearables/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (res.ok) {
        setConnected(prev => {
          const next = new Set(prev)
          next.delete(provider)
          return next
        })
      }
    } finally {
      setLoading(null)
    }
  }

  const showCTA = connectedCount >= 1

  return (
    <div className="min-h-screen bg-[var(--abyss)] text-[var(--stellar)]
                    font-sans px-6 py-10 max-w-2xl mx-auto">

      {/* Chip */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5
                      rounded-full bg-[rgba(99,102,241,0.08)]
                      border border-[rgba(99,102,241,0.22)]
                      text-[10px] font-semibold tracking-widest
                      uppercase text-[var(--aurora-mid)] mb-6">
        <span className="w-1.5 h-1.5 rounded-full
                         bg-[var(--aurora-mid)] animate-pulse" />
        Competition Prep — 14 days to race day
      </div>

      {/* Hero */}
      <div className="mb-8">
        <p className="text-[10.5px] font-medium text-[var(--dust)]
                      tracking-[0.1em] uppercase mb-4 font-mono">
          Step 3 · Biometric connection
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight
                       leading-tight mb-4">
          Your body holds<br />
          <span className="bg-gradient-to-r from-[var(--aurora-mid)]
                           to-[var(--biolum)] bg-clip-text
                           text-transparent">
            the real answer.
          </span>
        </h1>
        <p className="text-sm text-[var(--dust)] leading-relaxed max-w-md">
          Without biometric data, Blue Zone is guessing. With it,
          it adapts to how your body is actually responding —
          every single day.
        </p>
      </div>

      {/* Live sync */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--biolum)]" />
          <span className="text-[11px] font-semibold tracking-[0.1em]
                           uppercase font-mono text-[var(--biolum)]">
            Live sync
          </span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          <span className="text-[10.5px] text-[var(--dust)]">
            Automatic · always current
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {LIVE.map(provider => (
            <DeviceCard
              key={provider}
              provider={provider}
              label={LABELS[provider]}
              cap={CAPS[provider]}
              connected={isConnected(provider)}
              loading={loading === provider}
              isImport={false}
              onConnect={() => handleConnect(provider)}
              onDisconnect={() => handleDisconnect(provider)}
            />
          ))}
        </div>
      </div>

      {/* Manual import */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--dust)]" />
          <span className="text-[11px] font-semibold tracking-[0.1em]
                           uppercase font-mono text-[var(--dust)]">
            Manual import
          </span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          <span className="text-[10.5px] text-[var(--dust)]">
            You control when to sync
          </span>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl
                        bg-[rgba(255,255,255,0.03)]
                        border border-[rgba(255,255,255,0.07)]
                        text-xs text-[var(--dust)] leading-relaxed mb-2">
          <svg className="shrink-0 mt-0.5 opacity-70"
               width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          These require a manual export from your device app.
          Blue Zone won&apos;t auto-update — re-upload periodically
          to keep your protocol accurate.
        </div>
        <div className="flex flex-col gap-2">
          {IMPORT.map(provider => (
            <DeviceCard
              key={provider}
              provider={provider}
              label={LABELS[provider]}
              cap={CAPS[provider]}
              connected={isConnected(provider)}
              loading={loading === provider}
              isImport={true}
              onConnect={() => handleConnect(provider)}
              onDisconnect={() => handleDisconnect(provider)}
            />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <svg width="12" height="12" viewBox="0 0 24 24"
               fill="none" stroke="var(--aurora-mid)" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-[11px] font-semibold tracking-[0.1em]
                           uppercase font-mono text-[var(--aurora-mid)]">
            Coming soon
          </span>
          <div className="flex-1 h-px"
               style={{ background:
                 'linear-gradient(90deg,rgba(91,33,255,.3),transparent)'
               }} />
          <span className="text-[10.5px] text-[var(--aurora-mid)]">
            Integrations in development
          </span>
        </div>

        {/* Garmin */}
        <div className="flex items-center p-4 rounded-2xl mb-2
                        bg-[var(--card)]
                        border border-[rgba(255,255,255,0.044)]
                        opacity-80">
          <div className="w-12 h-12 rounded-xl bg-[#0e1128]
                          border border-[rgba(99,102,241,0.32)]
                          flex items-center justify-center
                          shrink-0 mr-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M 25 12 A 10 10 0 1 0 24.5 20 L 18 20 L 18 16 L 26 16"
                    stroke="rgba(162,155,254,0.85)" strokeWidth="2.4"
                    strokeLinecap="round" strokeLinejoin="round"
                    fill="none"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold
                            text-[var(--stellar)]">
              Garmin
              <span className="text-[9px] font-bold tracking-[0.08em]
                               uppercase font-mono text-[var(--aurora-mid)]
                               bg-[rgba(99,102,241,0.18)]
                               border border-[rgba(99,102,241,0.35)]
                               rounded-full px-2 py-0.5">
                Soon
              </span>
            </div>
            <div className="text-[10.5px] text-[var(--dust)] mt-0.5
                            font-mono tracking-[0.04em]">
              GPS · Performance · Multisport
            </div>
          </div>
          <button className="text-[10.5px] font-medium font-mono
                             text-[var(--aurora-mid)]
                             bg-[rgba(99,102,241,0.1)]
                             border border-[rgba(99,102,241,0.28)]
                             rounded-lg px-3.5 py-1.5
                             hover:bg-[rgba(99,102,241,0.18)]
                             transition-colors shrink-0 w-[152px]
                             flex items-center justify-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notify me
          </button>
        </div>

        {/* Polar */}
        <div className="flex items-center p-4 rounded-2xl
                        bg-[var(--card)]
                        border border-[rgba(255,255,255,0.044)]
                        opacity-80">
          <div className="w-12 h-12 rounded-xl bg-[#0e1128]
                          border border-[rgba(99,102,241,0.32)]
                          flex items-center justify-center
                          shrink-0 mr-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M 10 8 L 10 24 M 10 8 Q 20 8 20 13 Q 20 18 10 18"
                    stroke="rgba(162,155,254,0.85)" strokeWidth="2.4"
                    strokeLinecap="round" strokeLinejoin="round"
                    fill="none"/>
              <circle cx="20" cy="20" r="4.5"
                      stroke="rgba(162,155,254,0.5)"
                      strokeWidth="1.6" fill="none"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold
                            text-[var(--stellar)]">
              Polar
              <span className="text-[9px] font-bold tracking-[0.08em]
                               uppercase font-mono text-[var(--aurora-mid)]
                               bg-[rgba(99,102,241,0.18)]
                               border border-[rgba(99,102,241,0.35)]
                               rounded-full px-2 py-0.5">
                Soon
              </span>
            </div>
            <div className="text-[10.5px] text-[var(--dust)] mt-0.5
                            font-mono tracking-[0.04em]">
              Heart rate · Training zones · Recovery
            </div>
          </div>
          <button className="text-[10.5px] font-medium font-mono
                             text-[var(--aurora-mid)]
                             bg-[rgba(99,102,241,0.1)]
                             border border-[rgba(99,102,241,0.28)]
                             rounded-lg px-3.5 py-1.5
                             hover:bg-[rgba(99,102,241,0.18)]
                             transition-colors shrink-0 w-[152px]
                             flex items-center justify-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notify me
          </button>
        </div>
      </div>

      {/* Continue CTA */}
      {showCTA && (
        <div className="relative overflow-hidden p-5 rounded-2xl
                        border border-[rgba(99,102,241,0.32)]
                        flex items-center justify-between mb-6"
             style={{ background:
               'linear-gradient(148deg,rgba(99,102,241,0.12) 0%,rgba(0,255,179,0.07) 100%)'
             }}>
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{
                 background:
                   'linear-gradient(90deg,transparent,#5B21FF 30%,#00FFB3 70%,transparent)',
                 opacity: 0.8,
               }} />
          <div>
            <div className="font-display text-[15px] font-bold
                            text-[var(--stellar)] mb-0.5">
              Your wearable is connected
            </div>
            <div className="text-[11.5px] text-[var(--dust)]">
              Blue Zone is ready to adapt to your recovery.
              Next: set your protocol.
            </div>
          </div>
          <a href="/onboarding/protocol"
             className="flex items-center gap-2 text-sm font-semibold
                        text-white px-5 py-2.5 rounded-xl shrink-0
                        hover:brightness-110 hover:-translate-y-0.5
                        transition-all"
             style={{
               background:
                 'linear-gradient(148deg,#7264ed 0%,#4c3dd4 70%,#1eada9 100%)',
               boxShadow: '0 4px 22px rgba(99,102,241,0.38)',
             }}>
            Continue to Protocol
            <svg width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      )}

      {/* Skip footer */}
      <div className="pt-7 border-t border-[rgba(255,255,255,0.08)]
                      flex items-center justify-between">
        <div>
          <p className="text-[11.5px] text-[var(--dust)] mb-1.5">
            {showCTA
              ? 'Connected. Ready to continue whenever you are.'
              : 'Not ready yet? No problem.'}
          </p>
          <a href="/onboarding/protocol"
             className="inline-flex items-center gap-1.5 text-[13px]
                        text-[var(--dust)] border-b
                        border-[rgba(255,255,255,0.08)] pb-px
                        hover:text-[var(--stellar)]
                        hover:border-[rgba(255,255,255,0.2)]
                        transition-colors">
            {showCTA ? 'Go to next step' : 'Continue without connecting'}
            <svg width="11" height="11" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
        <div className="text-right text-[11px] text-[var(--dust)]
                        leading-relaxed">
          <strong className="text-[var(--stellar)] font-semibold">
            {showCTA
              ? 'You can manage wearables anytime'
              : 'You can connect anytime'}
          </strong>
          <br />
          Track → Wearables in the sidebar
        </div>
      </div>
    </div>
  )
}

// ─── Device Card ──────────────────────────────────────────────────────────────

interface CardProps {
  provider:     Provider
  label:        string
  cap:          string
  connected:    boolean
  loading:      boolean
  isImport:     boolean
  onConnect:    () => void
  onDisconnect: () => void
}

function DeviceCard({
  provider, label, cap,
  connected, loading, isImport,
  onConnect, onDisconnect,
}: CardProps) {
  return (
    <div className={[
      'flex items-center p-4 rounded-2xl transition-all border',
      connected
        ? 'border-[rgba(0,255,179,0.28)] bg-[rgba(0,255,179,0.06)]'
        : 'border-[rgba(255,255,255,0.044)] bg-[var(--card)]',
      'hover:bg-[var(--card-hover)]',
    ].join(' ')}>

      <div className="w-12 h-12 rounded-xl shrink-0 mr-4
                      flex items-center justify-center overflow-hidden
                      bg-[var(--deep)]">
        <ProviderIcon provider={provider} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[var(--stellar)]">
          {label}
        </div>
        <div className="text-[10.5px] text-[var(--dust)] mt-0.5
                        font-mono tracking-[0.04em]">
          {cap}
        </div>
      </div>

      <div className="ml-5 shrink-0">
        {connected ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[10px]
                            font-semibold font-mono
                            text-[var(--biolum)]
                            bg-[rgba(0,255,179,0.09)]
                            border border-[rgba(0,255,179,0.22)]
                            rounded-full px-2.5 py-1">
              <svg width="11" height="11" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2.8">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {isImport ? 'Imported' : 'Connected'}
            </div>
            <div className="text-[10px] text-[var(--dust)] font-mono
                            text-right">
              {isImport ? 'Re-upload to refresh' : 'Synced just now'}
            </div>
            <button
              onClick={onDisconnect}
              disabled={loading}
              className="text-[11.5px] font-medium text-[var(--dust)]
                         border border-[rgba(255,255,255,0.09)]
                         rounded-xl py-2 w-[152px]
                         flex items-center justify-center
                         hover:border-[rgba(255,255,255,0.16)]
                         hover:text-[var(--stellar)]
                         transition-colors disabled:opacity-50">
              {loading
                ? 'Removing…'
                : isImport ? 'Remove' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className={[
              'flex items-center justify-center gap-1.5',
              'text-sm font-semibold w-[152px] py-2.5 rounded-xl',
              'transition-all disabled:opacity-60',
              isImport
                ? 'bg-transparent border border-[rgba(99,102,241,0.3)] text-[var(--aurora-mid)] hover:bg-[rgba(99,102,241,0.1)]'
                : 'text-white hover:brightness-110 hover:-translate-y-px',
            ].join(' ')}
            style={!isImport ? {
              background:
                'linear-gradient(148deg,#7264ed 0%,#4c3dd4 70%,#1eada9 100%)',
              boxShadow: '0 4px 18px rgba(99,102,241,0.32)',
            } : undefined}>
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5"
                     viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10"
                          stroke="currentColor"
                          strokeOpacity=".25" strokeWidth="4"/>
                  <path d="M22 12a10 10 0 0 0-10-10"
                        stroke="currentColor" strokeWidth="4"
                        strokeLinecap="round"/>
                </svg>
                {isImport ? 'Importing…' : 'Connecting…'}
              </>
            ) : (
              <>
                {isImport ? 'Import' : `Connect ${label}`}
                <svg width="12" height="12" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Provider icons ───────────────────────────────────────────────────────────

function ProviderIcon({ provider }: { provider: Provider }) {
  switch (provider) {
    case 'whoop':
      return (
        <svg width="36" height="36" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="210" fill="#000"/>
          <g transform="rotate(180 250 250)">
            <polygon points="148,145 172,145 155,310 131,310"
                     fill="#fff"/>
            <polygon points="192,145 216,145 248,310 224,310"
                     fill="#fff"/>
            <polygon points="284,145 308,145 272,310 248,310"
                     fill="#fff"/>
            <polygon points="328,145 352,145 369,310 345,310"
                     fill="#fff"/>
          </g>
        </svg>
      )
    case 'oura':
      return (
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <line x1="11" y1="8" x2="23" y2="8"
                stroke="white" strokeWidth="2.1"
                strokeLinecap="round"/>
          <circle cx="17" cy="21" r="8"
                  stroke="white" strokeWidth="2.2" fill="none"/>
        </svg>
      )
    case 'strava':
      return (
        <div className="w-12 h-12 rounded-xl bg-[#fc4c02]
                        flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polygon points="24,5 40,36 32,20 16,20 8,36"
                     fill="white"/>
            <polygon points="16,20 32,20 24,36" fill="#f5a07a"/>
          </svg>
        </div>
      )
    case 'apple_health':
      return (
        <div className="w-12 h-12 rounded-xl bg-white
                        flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="hg2" x1="24" y1="9" x2="24" y2="40"
                              gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ff375f"/>
                <stop offset="100%" stopColor="#ff3a30"/>
              </linearGradient>
            </defs>
            <path d="M24 38 C24 38 8 27.5 8 17.5 C8 12.8 11.8 9
                     16.5 9 C19.5 9 22.1 10.6 24 13 C25.9 10.6
                     28.5 9 31.5 9 C36.2 9 40 12.8 40 17.5
                     C40 27.5 24 38 24 38Z"
                  fill="url(#hg2)"/>
          </svg>
        </div>
      )
    case 'samsung_health':
      return (
        <div className="w-12 h-12 rounded-xl overflow-hidden">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="samsg2" x1="0" y1="0"
                              x2="48" y2="48"
                              gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#5bc8d0"/>
                <stop offset="40%"  stopColor="#44c4a8"/>
                <stop offset="100%" stopColor="#aedf3a"/>
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14"
                  fill="url(#samsg2)"/>
            <circle cx="28" cy="10" r="3.8" fill="white"/>
            <path d="M 25.5 8.5 Q 30 5 29 2"
                  stroke="white" strokeWidth="2.8"
                  strokeLinecap="round" fill="none"/>
            <line x1="28" y1="13.5" x2="22" y2="22"
                  stroke="white" strokeWidth="3.2"
                  strokeLinecap="round"/>
            <line x1="22" y1="22" x2="24" y2="28"
                  stroke="white" strokeWidth="3.2"
                  strokeLinecap="round"/>
            <path d="M 26 17 L 20 21 L 22 26"
                  stroke="white" strokeWidth="2.8"
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"/>
            <path d="M 24 18 L 30 23 L 28 27"
                  stroke="white" strokeWidth="2.8"
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"/>
            <path d="M 24 28 L 19 35 L 22 43"
                  stroke="white" strokeWidth="3.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"/>
            <path d="M 24 28 L 29 34 L 26 43"
                  stroke="white" strokeWidth="3.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  fill="none"/>
          </svg>
        </div>
      )
  }
}
