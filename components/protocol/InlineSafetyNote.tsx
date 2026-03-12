'use client'

interface InlineSafetyNoteProps {
  note: string
}

export default function InlineSafetyNote({ note }: InlineSafetyNoteProps) {
  return (
    <div className="flex items-start gap-1.5 text-xs text-amber-400">
      <span aria-hidden="true">⚠</span>
      <span>{note}</span>
    </div>
  )
}
