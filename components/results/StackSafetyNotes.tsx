/// components/results/StackSafetyNotes.tsx
import { AlertTriangle } from "lucide-react";

interface StackSafetyNotesProps {
  notes: string[];
}

export function StackSafetyNotes({ notes }: StackSafetyNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-800">Stack Safety Notes</h3>
      </div>
      <div className="space-y-2">
        {notes.map((note, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
