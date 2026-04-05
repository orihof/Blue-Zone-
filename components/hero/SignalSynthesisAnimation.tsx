// @ts-nocheck
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     '#090d1a',
  raised: '#121d30',
  b0:     'rgba(255,255,255,0.08)',
  blood:  '#06b6d4',
  train:  '#6366f1',
  slp:    '#f59e0b',
  emerge: '#10b981',
  p1:     '#dce1f0',
  p2:     '#6d7a9a',
  p3:     '#2a3350',
  mono:   'var(--font-dm-mono), "JetBrains Mono", monospace',
  sans:   'var(--font-inter), system-ui, sans-serif',
}

const W = 480, H = 430
const CORE_X = 300, CORE_Y = 215, CORE_D = 68

const BEZIER_PATHS = {
  blood:    [{ x:182,y:67  }, { x:244,y:67   }, { x:288,y:188 }, { x:CORE_X,y:CORE_Y }],
  training: [{ x:182,y:215 }, { x:228,y:215  }, { x:268,y:215 }, { x:CORE_X,y:CORE_Y }],
  sleep:    [{ x:182,y:363 }, { x:244,y:363  }, { x:288,y:242 }, { x:CORE_X,y:CORE_Y }],
}
const PCOLORS = { blood: C.blood, training: C.train, sleep: C.slp }
const STAGGER = [0, 0.167, 0.333, 0.5, 0.667, 0.833]
const P_SPEED = 0.0118

function evalBez(t, p) {
  const u = 1 - t
  return {
    x: u*u*u*p[0].x + 3*u*u*t*p[1].x + 3*u*t*t*p[2].x + t*t*t*p[3].x,
    y: u*u*u*p[0].y + 3*u*u*t*p[1].y + 3*u*t*t*p[2].y + t*t*t*p[3].y,
  }
}
function hexRgb(h) {
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]
}

const CSS = `
  @keyframes bz-breathe{0%,100%{opacity:.48;transform:scale(1)}50%{opacity:1;transform:scale(1.45)}}
  @keyframes bz-f0{0%,100%{transform:translateY(0px)}50%{transform:translateY(-3px)}}
  @keyframes bz-f1{0%,100%{transform:translateY(-2.5px)}50%{transform:translateY(2.5px)}}
  @keyframes bz-f2{0%,100%{transform:translateY(0px)}50%{transform:translateY(-4px)}}
  @keyframes bz-scan{0%{transform:translate(-50%,-50%) scale(1);opacity:.5}100%{transform:translate(-50%,-50%) scale(2.7);opacity:0}}
  @keyframes bz-pring{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.65}50%{transform:translate(-50%,-50%) scale(1.6);opacity:.28}}
  @keyframes bz-gpulse{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes bz-dot{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}
  @keyframes bz-card-in{
    from{clip-path:inset(0 100% 0 0 round 12px);opacity:0;transform:translateY(7px)}
    to  {clip-path:inset(0 0%   0 0 round 12px);opacity:1;transform:translateY(0)}
  }
  @keyframes bz-draw{from{stroke-dashoffset:200;opacity:0}to{stroke-dashoffset:0;opacity:.48}}
  .bz-grain{
    position:absolute;inset:0;pointer-events:none;z-index:20;
    opacity:.04;mix-blend-mode:overlay;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
    background-size:180px;
  }
  .bz-reveal{animation:bz-card-in .5s .15s cubic-bezier(.25,.1,.25,1) both}
`

const SIGNALS = [
  { id:'blood',    color:C.blood, label:'BLOOD PANEL',  metric:'Ferritin',      value:'62 ng/mL', status:'↓ Suboptimal', sc:'#f87171', top:28,  fa:'bz-f0', fd:3.7, sp:'0,10 10,8 20,11 30,5 40,9 52,6' },
  { id:'training', color:C.train, label:'TRAINING',     metric:'Weekly strain', value:'↑ High',   status:'Zone 4/5 load',sc:C.train,   top:176, fa:'bz-f1', fd:4.2, sp:'0,7 10,5 20,4 30,6 40,3 52,2'   },
  { id:'sleep',    color:C.slp,   label:'SLEEP / HRV',  metric:'HRV 14-day Δ', value:'−18%',     status:'↓ Declining',  sc:C.slp,     top:324, fa:'bz-f2', fd:3.3, sp:'0,4 10,6 20,5 30,8 40,9 52,11'  },
]

const pause = ms => new Promise(r => setTimeout(r, ms))

export default function SignalSynthesis() {
  const [phase,   setPhase]   = useState('boot')
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion:reduce)')
    setReduced(mq.matches)
    const h = e => setReduced(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (reduced) { setPhase('resolved'); return }
    let alive = true
    ;(async () => {
      await pause(350)
      while (alive) {
        setPhase('idle');       await pause(1800); if (!alive) break
        setPhase('streaming');  await pause(1500); if (!alive) break
        setPhase('analyzing');  await pause(1100); if (!alive) break
        setPhase('resolved');   await pause(2100); if (!alive) break
        setPhase('resetting');  await pause(600);  if (!alive) break
      }
    })()
    return () => { alive = false }
  }, [reduced])

  const streaming   = ['streaming','analyzing'].includes(phase)
  const analyzing   = phase === 'analyzing'
  const resolved    = phase === 'resolved'
  const resetting   = phase === 'resetting'
  const showCard    = resolved || resetting
  const particlesOn = phase === 'streaming' || phase === 'analyzing'

  const ambRgb = resolved ? '16,185,129' : '99,102,241'
  const ambOp  = analyzing ? .075 : resolved ? .04 : streaming ? .05 : .03

  return (
    <div style={{
      position:'relative', width:W, height:H,
      background:C.bg, borderRadius:20, overflow:'hidden',
      fontFamily:C.sans, userSelect:'none',
    }}>
      <style>{CSS}</style>
      <div className="bz-grain" />
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:`radial-gradient(ellipse 58% 58% at ${(CORE_X/W*100).toFixed(0)}% 50%,
          rgba(${ambRgb},${ambOp}), transparent 70%)`,
        transition:'background .9s ease',
      }} />
      {SIGNALS.map(s => (
        <SignalCard key={s.id} {...s} dim={resolved} />
      ))}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                    pointerEvents:'none', overflow:'visible', zIndex:3 }}
           viewBox={`0 0 ${W} ${H}`}>
        {SIGNALS.map((s, i) => {
          const pts = Object.values(BEZIER_PATHS)[i]
          const glOp = resetting?.04 : resolved?.07 : analyzing?.18 : streaming?.28 : .10
          return (
            <path key={s.id}
              d={`M ${pts[0].x},${pts[0].y} C ${pts[1].x},${pts[1].y} ${pts[2].x},${pts[2].y} ${pts[3].x},${pts[3].y}`}
              fill="none" stroke={s.color} strokeWidth="1" strokeDasharray="3 9"
              strokeOpacity={glOp}
              style={{ transition:'stroke-opacity .65s ease' }}
            />
          )
        })}
        <ConnectorPath show={showCard} resolved={resolved} />
      </svg>
      <ParticleCanvas active={particlesOn} />
      <CoreOrb streaming={streaming} analyzing={analyzing} resolved={resolved} />
      <div style={{
        position:'absolute', top:281, left:278, width:192, height:104,
        borderRadius:12, border:'1px solid rgba(16,185,129,.065)',
        background:'rgba(16,185,129,.012)', pointerEvents:'none', zIndex:5,
      }} />
      <ProtocolCard show={showCard} fading={resetting} />
      <div style={{
        position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
        fontFamily:C.mono, fontSize:8.5, color:C.p3,
        letterSpacing:'.095em', whiteSpace:'nowrap', zIndex:15,
      }}>
        DERIVED FROM 3 SIGNALS · PERSONALIZED TO YOUR TRAINING PHASE
      </div>
    </div>
  )
}

function SignalCard({ color, label, metric, value, status, sc, top, fa, fd, sp, dim }) {
  return (
    <div style={{
      position:'absolute', top, left:14, width:168, height:78,
      background:C.raised, borderRadius:10,
      border:`1px solid ${C.b0}`, borderLeft:`2px solid ${color}`,
      padding:'9px 12px', boxSizing:'border-box',
      opacity: dim ? .33 : 1,
      transition:'opacity .95s ease',
      animation:`${fa} ${fd}s ease-in-out infinite`,
      willChange:'transform',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontFamily:C.mono, fontSize:8.5, color, letterSpacing:'.1em', opacity:.85 }}>{label}</span>
        <div style={{
          width:5, height:5, borderRadius:'50%', background:color,
          boxShadow:`0 0 8px ${color}`,
          animation:'bz-breathe 2.1s ease-in-out infinite',
          willChange:'transform,opacity',
        }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
        <span style={{ fontSize:10.5, color:C.p2 }}>{metric}</span>
        <span style={{ fontFamily:C.mono, fontSize:12, color, fontWeight:500 }}>{value}</span>
      </div>
      <div style={{ fontFamily:C.mono, fontSize:9.5, color:sc, opacity:.9 }}>{status}</div>
      <svg width={54} height={14} viewBox="0 0 52 12"
           style={{ position:'absolute', bottom:7, right:10, opacity:.22 }}
           preserveAspectRatio="none">
        <polyline points={sp} fill="none" stroke={color}
          strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function ConnectorPath({ show, resolved }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (resolved) {
      el.style.strokeDashoffset = ''
      el.style.opacity          = ''
      el.style.animation        = 'none'
      void el.getBoundingClientRect()
      el.style.animation = 'bz-draw .4s 0s ease forwards'
    } else {
      el.style.animation        = 'none'
      el.style.strokeDashoffset = ''
      el.style.opacity          = '0'
    }
  }, [resolved])
  if (!show) return null
  return (
    <path ref={ref}
      d="M 300,251 C 300,262 374,267 374,281"
      fill="none" stroke={C.emerge} strokeWidth="1.5"
      strokeDasharray="200" strokeDashoffset="200"
      opacity="0"
    />
  )
}

function ParticleCanvas({ active }) {
  const cvRef    = useRef(null)
  const ctxRef   = useRef(null)
  const rafRef   = useRef(null)
  const stateRef = useRef([])
  const runRef   = useRef(false)

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width  = Math.round(W * dpr)
    cv.height = Math.round(H * dpr)
    cv.style.width  = `${W}px`
    cv.style.height = `${H}px`
    ctxRef.current = cv.getContext('2d')
    ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const initState = useCallback(() => {
    stateRef.current = []
    Object.entries(BEZIER_PATHS).forEach(([name, pts]) => {
      const rgb = hexRgb(PCOLORS[name])
      STAGGER.forEach(offset => {
        stateRef.current.push({ pts, rgb, t: offset })
      })
    })
  }, [])

  const loop = useCallback(() => {
    if (!runRef.current || !ctxRef.current) return
    const ctx = ctxRef.current
    ctx.clearRect(0, 0, W, H)
    stateRef.current.forEach(p => {
      p.t += P_SPEED
      if (p.t >= 1) p.t -= 1
      const t = p.t
      const op = t < 0.04 ? t / 0.04 : t > 0.85 ? (1 - t) / 0.15 : 1
      const pos = evalBez(t, p.pts)
      const [r, g, b] = p.rgb
      const gr = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 5)
      gr.addColorStop(0, `rgba(${r},${g},${b},${+(0.32*op).toFixed(3)})`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.beginPath()
      ctx.fillStyle = gr
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.fillStyle = `rgba(${r},${g},${b},${+Math.min(1,op).toFixed(3)})`
      ctx.arc(pos.x, pos.y, 2.4, 0, Math.PI * 2)
      ctx.fill()
    })
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => {
    if (active) {
      if (runRef.current) return
      runRef.current = true
      initState()
      loop()
    } else {
      runRef.current = false
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      ctxRef.current?.clearRect(0, 0, W, H)
    }
  }, [active, initState, loop])

  useEffect(() => () => {
    runRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={cvRef}
      style={{ position:'absolute', inset:0, zIndex:4, pointerEvents:'none' }} />
  )
}

function CoreOrb({ streaming, analyzing, resolved }) {
  const scanAnim    = resolved  ? 'bz-pring 2.8s ease-in-out infinite'
                    : analyzing ? 'bz-pring .95s ease-in-out infinite'
                    : streaming ? 'bz-scan 1.6s ease-out infinite'
                    : 'none'
  const scanBorder  = resolved  ? 'rgba(16,185,129,.35)'
                    : analyzing ? 'rgba(99,102,241,.58)'
                    :             'rgba(99,102,241,.42)'
  const scanBW      = (analyzing && !resolved) ? '1.5px' : '1px'
  const glowBg      = resolved  ? 'radial-gradient(circle,rgba(16,185,129,.14),transparent 70%)'
                    : analyzing ? 'radial-gradient(circle,rgba(99,102,241,.28),transparent 70%)'
                    : streaming ? 'radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)'
                    :             'radial-gradient(circle,rgba(99,102,241,.04),transparent 70%)'
  const glowAnim    = resolved  ? 'bz-gpulse 2.8s ease-in-out infinite'
                    : analyzing ? 'bz-gpulse 1.1s ease-in-out infinite'
                    : 'none'
  const sphBg       = resolved  ? 'radial-gradient(circle at 33% 30%,#14342a,#0d2820 55%,#081812)'
                    : analyzing ? 'radial-gradient(circle at 33% 30%,#818cf8,#6366f1 55%,#3730a3)'
                    : streaming ? 'radial-gradient(circle at 33% 30%,#3b4bdb,#1e2d8a 55%,#141e60)'
                    :             'radial-gradient(circle at 33% 30%,#1a2545,#111c3a 55%,#0c1428)'
  const sphBorder   = resolved  ? 'rgba(16,185,129,.32)'
                    : analyzing ? 'rgba(129,140,248,.55)'
                    : streaming ? 'rgba(99,102,241,.3)'
                    :             'rgba(255,255,255,.07)'
  const sphShadow   = resolved  ? '0 0 16px rgba(16,185,129,.22),inset 0 1px 0 rgba(16,185,129,.08)'
                    : analyzing ? '0 0 24px rgba(99,102,241,.55),inset 0 1px 0 rgba(255,255,255,.18)'
                    : streaming ? '0 0 12px rgba(99,102,241,.22),inset 0 1px 0 rgba(255,255,255,.1)'
                    :             'inset 0 1px 0 rgba(255,255,255,.06)'
  return (
    <div style={{
      position:'absolute', left:CORE_X, top:CORE_Y,
      transform:'translate(-50%,-50%)',
      width:CORE_D, height:CORE_D,
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:10,
    }}>
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        width:CORE_D, height:CORE_D, borderRadius:'50%',
        border:`${scanBW} solid ${scanBorder}`,
        opacity: (streaming || analyzing || resolved) ? 1 : 0,
        animation: scanAnim,
        willChange:'transform,opacity',
        transition:'opacity .4s ease',
      }} />
      <div style={{
        position:'absolute', inset:-22, borderRadius:'50%',
        background: glowBg,
        animation: glowAnim,
        transition:'background .75s ease',
        willChange:'opacity',
      }} />
      <div style={{
        position:'relative', zIndex:1,
        width:CORE_D, height:CORE_D, borderRadius:'50%',
        background: sphBg,
        border: `1px solid ${sphBorder}`,
        boxShadow: sphShadow,
        transition:'background .7s ease, border-color .7s ease, box-shadow .7s ease',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {resolved ? (
          <div style={{
            width:20, height:20, borderRadius:'50%',
            border:'1.5px solid rgba(16,185,129,.72)',
            boxShadow:'0 0 8px rgba(16,185,129,.36)',
          }} />
        ) : analyzing ? (
          <div style={{ display:'flex', gap:4 }}>
            {[0, .17, .34].map((d, i) => (
              <div key={i} style={{
                width:4.5, height:4.5, borderRadius:'50%', background:'#a5b4fc',
                animation:`bz-dot 1s ${d}s ease-in-out infinite`,
                willChange:'transform,opacity',
              }} />
            ))}
          </div>
        ) : streaming ? (
          <svg width={22} height={22} viewBox="0 0 22 22" fill="none">
            <line x1="11" y1="2"  x2="11" y2="20" stroke="rgba(99,102,241,.48)" strokeWidth="1"/>
            <line x1="2"  y1="11" x2="20" y2="11" stroke="rgba(99,102,241,.48)" strokeWidth="1"/>
            <circle cx="11" cy="11" r="3.2" stroke="rgba(99,102,241,.38)" strokeWidth="1"/>
          </svg>
        ) : (
          <div style={{ width:20, height:20, borderRadius:'50%', border:'1px solid rgba(255,255,255,.14)' }} />
        )}
      </div>
      <div style={{
        position:'absolute', top:'100%', marginTop:10, left:'50%',
        fontFamily:C.mono, fontSize:8.5, color:'#818cf8',
        letterSpacing:'.12em', whiteSpace:'nowrap',
        opacity: analyzing ? 1 : 0,
        transform: analyzing ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(5px)',
        transition:'opacity .35s ease, transform .35s ease',
      }}>
        ANALYZING...
      </div>
    </div>
  )
}

function ProtocolCard({ show, fading }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !show) return
    if (!fading) {
      el.classList.remove('bz-reveal')
      el.style.opacity  = ''
      el.style.clipPath = ''
      void el.offsetWidth
      el.classList.add('bz-reveal')
    } else {
      el.classList.remove('bz-reveal')
      el.style.opacity = '0'
    }
  }, [show, fading])
  useEffect(() => {
    const el = ref.current
    if (!el || show) return
    el.classList.remove('bz-reveal')
    el.style.opacity  = '0'
    el.style.clipPath = 'inset(0 100% 0 0 round 12px)'
  }, [show])
  return (
    <div ref={ref} style={{
      position:'absolute', top:281, left:278, width:192,
      borderRadius:12, overflow:'hidden',
      border:'1px solid rgba(255,255,255,.115)',
      background:'rgba(9,16,33,.97)',
      boxShadow:'0 14px 44px rgba(0,0,0,.5), 0 0 0 1px rgba(16,185,129,.1)',
      opacity:0, clipPath:'inset(0 100% 0 0 round 12px)',
      transition:'opacity .45s ease',
      zIndex:6, willChange:'clip-path,opacity,transform',
    }}>
      <div style={{ height:2, background:`linear-gradient(90deg,${C.emerge},${C.blood})` }} />
      <div style={{ padding:'10px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:7 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:C.mono, fontSize:7.5, color:C.emerge, letterSpacing:'.1em', marginBottom:3 }}>YOUR PROTOCOL</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.p1, letterSpacing:'-.012em', whiteSpace:'nowrap' }}>Iron bisglycinate</div>
          </div>
          <div style={{ fontFamily:C.mono, fontSize:20, color:C.blood, fontWeight:500, lineHeight:1, marginLeft:6, flexShrink:0 }}>
            25<span style={{ fontSize:9, marginLeft:1, opacity:.72 }}>mg</span>
          </div>
        </div>
        <div style={{ fontFamily:C.mono, fontSize:8, color:C.p2, marginBottom:8, lineHeight:1.45 }}>
          With Vitamin C · Away from training window
        </div>
        <div style={{ display:'flex', gap:3, alignItems:'center', flexWrap:'nowrap' }}>
          {[
            { c:C.blood, l:'Ferritin' },
            { c:C.train, l:'Strain'   },
            { c:C.slp,   l:'HRV\u2009\u0394' },
          ].map(({ c, l }) => (
            <div key={l} style={{
              display:'flex', alignItems:'center', gap:3,
              background:`${c}14`, border:`1px solid ${c}28`,
              borderRadius:4, padding:'3px 5px', flexShrink:0,
            }}>
              <div style={{ width:4, height:4, borderRadius:'50%', background:c, flexShrink:0 }} />
              <span style={{
                fontFamily:C.mono, fontSize:7, color:c,
                letterSpacing:'.05em', whiteSpace:'nowrap',
              }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
