/// components/common/Disclaimer.tsx
import { ShieldAlert } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700 leading-relaxed">
        Blue Zone is not a medical service. All insights, supplement suggestions, and recommendations are for
        informational and educational purposes only. They do not constitute medical advice. Always consult a
        qualified healthcare professional before making any changes to your health regimen.
      </p>
    </div>
  );
}
