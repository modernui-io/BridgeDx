import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useAppContext } from '../context/AppContext'

function displayAge(age, ageUnit) {
  return ageUnit === 'months' ? `${age}m` : `${age}y`
}

function triageLabel(level) {
  if (level === 'emergency') return 'Emergency'
  if (level === 'local') return 'Local'
  return 'Refer'
}

function triageTone(level) {
  if (level === 'emergency') return 'text-[var(--danger)]'
  if (level === 'local') return 'text-[var(--success)]'
  return 'text-[var(--warning)]'
}

function impressionToAgreement(impression) {
  if (impression?.startsWith('Agree')) return 'agree'
  if (impression?.startsWith('Partially')) return 'partial'
  if (impression?.startsWith('Disagree')) return 'disagree'
  return 'unsure'
}

export default function History() {
  const { cases } = useAppContext()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState('')
  const [filter, setFilter] = useState('all')

  const stats = useMemo(() => {
    const total = cases.length
    const emergency = cases.filter((item) => item.triage.level === 'emergency').length
    const rare = cases.filter((item) => item.mode === 'rare').length
    const agreementCount = cases.filter((item) => impressionToAgreement(item.impression) === 'agree').length
    const rate = total === 0 ? 0 : Math.round((agreementCount / total) * 100)
    return { total, emergency, rare, rate }
  }, [cases])

  const filteredCases = useMemo(() => {
    if (filter === 'all') return cases
    if (filter === 'rare') return cases.filter((item) => item.mode === 'rare')
    return cases.filter((item) => item.triage.level === filter)
  }, [cases, filter])

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-[var(--text-primary)]' },
    { label: 'Emergencies', value: stats.emergency, color: 'text-[var(--danger)]' },
    { label: 'Agreement', value: `${stats.rate}%`, color: 'text-[var(--success)]' },
    { label: 'Rare Disease', value: stats.rare, color: 'text-[var(--accent-blue)]' },
  ]

  return (
    <main className="min-h-screen">
      <TopBar
        title="Case History"
        backLabel="Home"
        rightSlot={
          <button className="btn-primary px-3 py-1 text-xs" onClick={() => navigate('/intake')}>
            + New
          </button>
        }
      />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-10 md:px-10">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {statCards.map((stat) => (
            <article key={stat.label} className="card p-3 text-center">
              <p className={`font-display text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">{stat.label}</p>
            </article>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-xs leading-relaxed text-[var(--text-muted)]">
          De-identified logs only. No patient names or direct identifiers stored.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['emergency', 'Emergencies'],
            ['refer', 'Referrals'],
            ['rare', 'Rare Disease'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                filter === key
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]'
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="mt-3 space-y-2">
          {filteredCases.map((item) => (
            <article key={item.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId((current) => (current === item.id ? '' : item.id))}
                className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-4 text-left"
              >
                <div>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">{item.id}</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{item.topDiagnosis}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {displayAge(item.age, item.ageUnit)} · {item.sex} · {item.region}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${triageTone(item.triage.level)}`}>{triageLabel(item.triage.level)}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{item.impression || 'N/A'}</p>
                </div>
                <span className="text-[var(--text-muted)]">{expandedId === item.id ? '▲' : '▼'}</span>
              </button>

              {expandedId === item.id && (
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <p className="mb-2 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">
                    FULL DIFFERENTIAL · {new Date(item.timestamp).toLocaleString()}
                  </p>
                  <div className="space-y-2">
                    {item.differential.map((diagnosis) => (
                      <div key={diagnosis.condition} className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                        <p className="text-sm text-[var(--text-primary)]">
                          {diagnosis.rank}. {diagnosis.condition} ({diagnosis.confidence}%)
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Source: {diagnosis.sources.join(' + ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}
