import { useState } from 'react'
import ConfidenceBar from './ConfidenceBar'

function sourceBadgeColor(source) {
  if (source === 'WHO IMCI') return 'bg-[var(--success)]/20 text-[var(--success)]'
  if (source === 'Orphanet') return 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]'
  return 'bg-[var(--warning)]/20 text-[var(--warning)]'
}

export default function DifferentialCard({ diagnosis, defaultOpen, delay }) {
  const [open, setOpen] = useState(defaultOpen)
  const [openEvidence, setOpenEvidence] = useState(defaultOpen ? 0 : null)

  return (
    <article
      className="animate-fade-up rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-display text-3xl leading-none text-[var(--accent-gold)]">{diagnosis.rank}</span>
          <div>
            <h3 className="font-display text-2xl leading-tight text-[var(--text-primary)]">{diagnosis.condition}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {diagnosis.sources.map((source) => (
                <span
                  key={source}
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${sourceBadgeColor(source)}`}
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfidenceBar confidence={diagnosis.confidence} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-4 text-sm font-semibold text-[var(--accent-gold)]"
      >
        {open ? 'Hide why flagged' : 'Show why flagged'}
      </button>

      {open && (
        <div className="mt-3">
          {diagnosis.why.map((item, index) => {
            const evidenceOpen = openEvidence === index
            return (
              <div key={item.text} className="border-b border-[var(--border)]/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenEvidence((current) => (current === index ? null : index))
                  }
                  className="flex w-full items-start justify-between gap-2 py-2 text-left"
                >
                  <span className="text-sm text-[var(--text-primary)]">✓ {item.text}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {evidenceOpen ? '▲ Hide' : '▼ View source'}
                  </span>
                </button>
                {evidenceOpen && (
                  <div className="mb-2 ml-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
                    <p className="text-[11px] font-mono text-[var(--text-secondary)]">{item.citation}</p>
                    <p className="mt-1 text-xs text-[var(--text-primary)]">
                      Triggered from symptom-vitals matching against this protocol reference.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}
