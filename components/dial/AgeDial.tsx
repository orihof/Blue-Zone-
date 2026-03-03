/// components/dial/AgeDial.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue } from "framer-motion";

const MIN_AGE = 23;
const MAX_AGE = 60;
const TOTAL_ARC = 270; // degrees of rotation

function ageToRotation(age: number): number {
  const pct = (age - MIN_AGE) / (MAX_AGE - MIN_AGE);
  return -TOTAL_ARC / 2 + pct * TOTAL_ARC;
}

function rotationToAge(rot: number): number {
  const clamped = Math.max(-TOTAL_ARC / 2, Math.min(TOTAL_ARC / 2, rot));
  const pct = (clamped + TOTAL_ARC / 2) / TOTAL_ARC;
  return Math.round(MIN_AGE + pct * (MAX_AGE - MIN_AGE));
}

interface AgeDialProps {
  value: number;
  onChange: (age: number) => void;
}

const SIZE = 272;
const RADIUS = 108;
const CX = SIZE / 2;
const CY = SIZE / 2;

function polar(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(rad), y: CY + RADIUS * Math.sin(rad) };
}

function arcPath(start: number, end: number) {
  const s = polar(start);
  const e = polar(end);
  const large = Math.abs(end - start) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${e.x} ${e.y}`;
}

export function AgeDial({ value, onChange }: AgeDialProps) {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const accRot = useRef(ageToRotation(value));
  const rotation = useMotionValue(ageToRotation(value));

  // Sync when value changes externally (e.g. keyboard, scroll)
  useEffect(() => {
    const newRot = ageToRotation(value);
    accRot.current = newRot;
    rotation.set(newRot);
  }, [value, rotation]);

  const getPointerAngle = (e: PointerEvent) => {
    if (!dialRef.current) return 0;
    const r = dialRef.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastAngle.current = getPointerAngle(e.nativeEvent);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const angle = getPointerAngle(e.nativeEvent);
      let delta = angle - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      accRot.current = Math.max(-TOTAL_ARC / 2, Math.min(TOTAL_ARC / 2, accRot.current + delta));
      lastAngle.current = angle;
      rotation.set(accRot.current);
      onChange(rotationToAge(accRot.current));
    },
    [onChange, rotation]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Scroll wheel
  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onChange(Math.max(MIN_AGE, Math.min(MAX_AGE, value + (e.deltaY > 0 ? 1 : -1))));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [value, onChange]);

  // Keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(MIN_AGE, value - step));
    }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(MAX_AGE, value + step));
    }
  };

  const pct = (value - MIN_AGE) / (MAX_AGE - MIN_AGE);
  const trackStart = -135;
  const trackEnd = 135;
  const fillEnd = trackStart + pct * TOTAL_ARC;

  const minLabel = polar(trackStart - 8);
  const maxLabel = polar(trackEnd + 8);

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        ref={dialRef}
        className="relative cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuemin={MIN_AGE}
        aria-valuemax={MAX_AGE}
        aria-valuenow={value}
        aria-label={`Target age: ${value}`}
      >
        {/* SVG arcs */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          {/* Track */}
          <path d={arcPath(trackStart, trackEnd)} fill="none" stroke="#e2e8f0" strokeWidth={10} strokeLinecap="round" />
          {/* Fill */}
          {fillEnd > trackStart + 1 && (
            <path d={arcPath(trackStart, fillEnd)} fill="none" stroke="#0080cc" strokeWidth={10} strokeLinecap="round" />
          )}
          {/* Labels */}
          <text x={minLabel.x} y={minLabel.y + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">
            60
          </text>
          <text x={maxLabel.x} y={maxLabel.y + 4} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">
            23
          </text>
        </svg>

        {/* Rotating knob */}
        <motion.div
          className="absolute"
          style={{
            inset: 16,
            borderRadius: "50%",
            rotate: rotation,
            background: "radial-gradient(circle at 38% 34%, #1e40af 0%, #0f172a 70%)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          {/* Notch indicator */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
            <div className="w-0.5 h-5 rounded-full bg-blue-400/50" />
          </div>
        </motion.div>

        {/* Center static readout */}
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center"
          style={{
            inset: 48,
            borderRadius: "50%",
            background: "radial-gradient(circle, #f8fafc, #f1f5f9)",
            boxShadow: "inset 0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <span className="text-5xl font-bold text-slate-900 tabular-nums leading-none">{value}</span>
          <span className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">years</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Drag · Scroll · ←→ arrows (Shift = ×5)</p>
    </div>
  );
}
