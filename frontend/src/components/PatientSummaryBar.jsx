function formatAge(age, ageUnit) {
  if (age === '' || age === null || typeof age === 'undefined') return 'Unknown age'
  if (ageUnit === 'months') return `${age}m`
  return `${age}y`
}

function timestamp(value) {
  const date = new Date(value)
  return date.toLocaleString()
}

export default function PatientSummaryBar({ intake, modeLabel, timestampValue }) {
  const topSymptom = (intake.chiefComplaint || 'No symptom provided')
    .split(/[.,]/)[0]
    .slice(0, 60)

  return (
    <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-full bg-[var(--bg-elevated)] px-3 py-1 text-sm text-[var(--text-primary)]">
          Age: {formatAge(intake.age, intake.ageUnit)} · {intake.sex} · {intake.region || 'Region unspecified'}
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            modeLabel.includes('Rare')
              ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
              : 'bg-[var(--success)]/20 text-[var(--success)]'
          }`}
        >
          {modeLabel}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Top symptom: {topSymptom}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{timestamp(timestampValue)}</p>
    </section>
  )
}
