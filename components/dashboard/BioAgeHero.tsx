// components/dashboard/BioAgeHero.tsx
import Link from 'next/link';

interface BioAgeHeroProps {
  isUnlocked: boolean;
  score: number | null;
  chronologicalAge: number | null;
}

export function BioAgeHero({ isUnlocked, score, chronologicalAge }: BioAgeHeroProps) {
  const delta = score !== null && chronologicalAge !== null
    ? chronologicalAge - score
    : null;

  return (
    <div className="relative rounded-2xl border border-white/5 bg-[#12121A] p-6 overflow-hidden">
      {/* Pulsing gradient overlay in locked state */}
      {!isUnlocked && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none
                        animate-pulse bg-gradient-to-r from-blue-500/20 to-violet-500/20" />
      )}

      <p className="text-[11px] font-medium tracking-[0.12em] text-slate-400 uppercase mb-4">
        Biological Age Score
      </p>

      {isUnlocked && score !== null ? (
        <div className="flex items-end gap-4">
          <span className="font-mono text-7xl tabular-nums font-bold
                           bg-gradient-to-r from-blue-400 to-violet-400
                           bg-clip-text text-transparent">
            {score}
          </span>
          <div className="mb-3">
            <span className="font-mono text-slate-400 text-lg">yrs</span>
            {delta !== null && delta !== 0 && (
              <p className={`font-mono text-sm ${delta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Math.abs(delta)} yrs {delta > 0 ? 'younger' : 'older'} than calendar age
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-lg font-medium mb-1">
              Your biological age is waiting.
            </p>
            <p className="text-slate-400 text-sm">
              Add lab results or connect a wearable to unlock your score.
            </p>
          </div>
          <Link
            href="/app/biomarkers"
            className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold
                       bg-gradient-to-r from-blue-500 to-violet-500
                       text-white hover:opacity-90 transition-opacity"
          >
            Unlock Score →
          </Link>
        </div>
      )}
    </div>
  );
}
