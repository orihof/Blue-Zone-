/// components/results/Skeletons.tsx
function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export function RecommendationCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex justify-between">
        <Pulse className="h-4 w-40" />
        <Pulse className="h-6 w-6 rounded-lg" />
      </div>
      <Pulse className="h-3 w-full" />
      <Pulse className="h-3 w-5/6" />
      <Pulse className="h-3 w-3/4" />
      <div className="flex gap-2 mt-2">
        <Pulse className="h-5 w-16 rounded-full" />
        <Pulse className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex gap-2 pt-2">
        <Pulse className="h-8 flex-1 rounded-md" />
        <Pulse className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}

export function ResultsTabsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Pulse key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <RecommendationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ClinicCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5 flex-1">
          <Pulse className="h-4 w-48" />
          <Pulse className="h-3 w-32" />
        </div>
        <Pulse className="h-6 w-6 rounded-lg" />
      </div>
      <Pulse className="h-3 w-40" />
      <div className="flex justify-between items-center pt-1">
        <Pulse className="h-3 w-24" />
        <Pulse className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
