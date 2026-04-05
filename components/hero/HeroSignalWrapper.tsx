'use client'
import dynamic from 'next/dynamic'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// ── Constants — must match SignalSynthesisAnimation's fixed canvas ─────────────
const ANIM_W = 480
const ANIM_H = 430

// ── Isomorphic layout effect ──────────────────────────────────────────────────
// React's SSR renderer ignores useLayoutEffect but emits a console warning when
// it encounters the hook in a server-rendered component — including 'use client'
// components, which Next.js still renders on the server for initial HTML.
// This pattern silences the warning by substituting useEffect on the server
// (a no-op during SSR) while preserving useLayoutEffect on the client, where it
// fires synchronously before paint. That synchronous firing is critical: it means
// the scale value is correct on the very first frame, preventing the one-frame
// flash of height: 430px on narrow viewports before the ResizeObserver corrects it.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

// ── Skeleton ──────────────────────────────────────────────────────────────────
// Defined here — before dynamic() — so the reference in the loading prop is not
// a forward reference. JavaScript hoisting would make this work either way, but
// defining it first makes the reading order unambiguous and prevents Claude Code
// from misreading the reference as undefined.
function AnimationSkeleton() {
  return (
    <div
      style={{
        width: ANIM_W,
        height: ANIM_H,
        borderRadius: 20,
        background: '#090d1a',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 0 0 1px rgba(99,102,241,0.055), 0 28px 72px rgba(0,0,0,0.7)',
      }}
    />
  )
}

// ── Lazy-loaded animation ─────────────────────────────────────────────────────
// ssr: false — SignalSynthesisAnimation uses requestAnimationFrame, canvas APIs,
// and window.matchMedia. None of these exist in Node.js.
// The loading prop renders a size-matched skeleton while the JS chunk fetches,
// so the column has a defined height from the first render (CLS = 0).
const SignalSynthesisAnimation = dynamic(
  () => import('./SignalSynthesisAnimation'),
  { ssr: false, loading: () => <AnimationSkeleton /> }
)

// ── Wrapper ───────────────────────────────────────────────────────────────────
export default function HeroSignalWrapper() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const compute = () => {
      // Scale DOWN only. Column ≥ 480px → scale 1.0 (no change).
      // Column < 480px → proportional reduction. Never scale up.
      setScale(Math.min(1, el.offsetWidth / ANIM_W))
    }

    compute() // run immediately so first-paint scale is correct

    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Explicit height collapses correctly as scale decreases.
  // At scale 1.0 → 430px. At scale 0.78 (375px mobile) → 335px.
  const scaledHeight = Math.round(ANIM_H * scale)

  return (
    // overflow: visible is required — the animation has a 28px bottom box-shadow
    // (0 28px 72px rgba(0,0,0,0.7)). overflow: hidden would clip it, making the
    // component look visually truncated at its lower edge.
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: scaledHeight, overflow: 'visible' }}
    >
      {/*
        Centering: left: calc(50% - 240px) places the left edge of the 480px
        component so its center aligns with the container's center axis.

        Do NOT combine translateX(-50%) and scale() on the same transform property.
        CSS applies transforms right-to-left (scale first, then translate). The
        translate distance is always 50% of the original width (240px), regardless
        of scale — so at scale 0.8, the element drifts 48px off-center.

        Separating centering (left: calc) from scaling (transform: scale) makes
        both operations fully independent and correct at every scale value.
      */}
      <div
        style={{
          position: 'absolute',
          left: `calc(50% - ${ANIM_W / 2}px)`,  // calc(50% - 240px)
          top: 0,
          width: ANIM_W,
          height: ANIM_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <SignalSynthesisAnimation />
      </div>
    </div>
  )
}
