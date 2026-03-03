/// components/common/StepProgress.tsx
import { Check } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { n: 1, label: "Upload", href: "/app/onboarding/upload" },
  { n: 2, label: "Dial", href: "/app/onboarding/dial" },
  { n: 3, label: "Results", href: null },
];

export function StepProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map(({ n, label, href }, i) => {
        const done = n < step;
        const active = n === step;
        const content = (
          <div className={`flex items-center gap-1.5 ${active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : active
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 text-slate-400"
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : n}
            </div>
            <span className={`text-xs font-medium ${active ? "" : done ? "" : "text-slate-400"}`}>{label}</span>
          </div>
        );

        return (
          <div key={n} className="flex items-center">
            {done && href ? (
              <Link href={href}>{content}</Link>
            ) : (
              <div>{content}</div>
            )}
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 mx-2 ${n < step ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
