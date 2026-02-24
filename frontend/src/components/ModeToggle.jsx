const modes = [
  {
    key: 'standard',
    icon: '🟢',
    title: 'Standard Triage',
    detail: 'Uses MedGemma 1.5 4B · WHO IMCI + MSF protocols · Best for acute presentations',
  },
  {
    key: 'rare',
    icon: '🔵',
    title: 'Rare Disease Investigation',
    detail: 'Uses MedGemma 27B · Orphanet database · Best for complex or long-duration cases',
  },
]

export default function ModeToggle({ value, onChange }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <p className="text-sm font-semibold text-[var(--text-primary)]">Assessment Mode</p>
      <div className="space-y-2">
        {modes.map((mode) => (
          <label
            key={mode.key}
            className={`block cursor-pointer rounded-xl border p-3 transition ${
              value === mode.key
                ? 'border-[var(--accent-gold)] bg-[var(--bg-elevated)]'
                : 'border-[var(--border)]'
            }`}
          >
            <input
              type="radio"
              name="assessment-mode"
              value={mode.key}
              checked={value === mode.key}
              onChange={(event) => onChange(event.target.value)}
              className="sr-only"
            />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {mode.icon} {mode.title}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{mode.detail}</p>
          </label>
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Use Rare Disease mode if symptoms have persisted &gt;3 months, multiple diagnoses were tried, or the presentation is unusual.
      </p>
    </div>
  )
}
