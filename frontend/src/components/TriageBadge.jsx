function triageTheme(level) {
  if (level === 'local') {
    return 'border-[var(--success)] bg-[var(--success)]/15'
  }
  if (level === 'emergency') {
    return 'border-[var(--danger)] bg-[var(--danger)]/15'
  }
  return 'border-[var(--warning)] bg-[var(--warning)]/15'
}

export default function TriageBadge({ triage }) {
  return (
    <section className={`rounded-2xl border p-4 ${triageTheme(triage.level)}`}>
      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        {triage.icon} {triage.title}
      </h2>
      <p className="mt-2 text-sm text-[var(--text-primary)]">{triage.recommendation}</p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">Applicable protocol: {triage.protocol}</p>
    </section>
  )
}
