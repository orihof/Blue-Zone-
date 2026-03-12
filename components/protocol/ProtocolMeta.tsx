interface ProtocolMetaProps {
  generatedAt: Date
  focusAreas: string[]
  adoptionStats?: {
    cohortSize: number
    outcomePercent: number
    outcomeWeeks: number
    outcomeMeasure: string
  }
}

export default function ProtocolMeta({
  focusAreas,
  adoptionStats,
}: ProtocolMetaProps) {
  const joinedAreas =
    focusAreas.length > 1
      ? `${focusAreas.slice(0, -1).join(', ')} and ${focusAreas[focusAreas.length - 1]}`
      : focusAreas[0] ?? ''

  const showTrust = adoptionStats && adoptionStats.cohortSize >= 50

  return (
    <div className="mb-6">
      <p className="text-sm text-[#94A3B8]">
        Tailored to your {joinedAreas} profile.
      </p>
      {showTrust && (
        <p className="mt-1 text-xs text-[#94A3B8]">
          Among {adoptionStats.cohortSize} users with your profile who adopted
          2+ recommendations, {adoptionStats.outcomePercent}% reported{' '}
          {adoptionStats.outcomeMeasure} by week {adoptionStats.outcomeWeeks}.
        </p>
      )}
    </div>
  )
}
