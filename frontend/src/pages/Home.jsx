import { Link, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useAppContext } from '../context/AppContext'

function triageStyle(level) {
  if (level === 'emergency') return 'text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10'
  if (level === 'local') return 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/10'
  return 'text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10'
}

export default function Home() {
  const navigate = useNavigate()
  const { cases } = useAppContext()

  const total = cases.length
  const emergency = cases.filter((item) => item.triage.level === 'emergency').length
  const agree = cases.filter((item) => item.impression?.startsWith('Agree')).length
  const agreementRate = total ? Math.round((agree / total) * 100) : 0
  const rare = cases.filter((item) => item.mode === 'rare').length

  const stats = [
    { value: total, label: 'Cases Logged', color: 'text-[var(--text-primary)]' },
    { value: emergency, label: 'Emergencies', color: 'text-[var(--danger)]' },
    { value: `${agreementRate}%`, label: 'AI Agreement', color: 'text-[var(--success)]' },
    { value: rare, label: 'Rare Cases', color: 'text-[var(--accent-blue)]' },
  ]

  return (
    <main className="min-h-screen">
      <TopBar hideBack rightSlot={<Link to="/history">History</Link>} />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-10 md:px-10">
        <header className="fade-up mb-6">
          <p className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-muted)]">FIELD MODE · SAT, 21 FEB 2026</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-[var(--text-primary)]">
            Good afternoon,
            <br />
            <span className="text-[var(--accent-gold)]">Health Worker.</span>
          </h1>
        </header>

        <article className="card fade-up fade-up-d1 mb-3 overflow-hidden p-6">
          <span className="tag border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">New Assessment</span>
          <h2 className="mt-3 font-display text-2xl text-[var(--text-primary)]">Start Patient Assessment</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Enter symptoms, vitals, and optional image data for protocol-grounded differential support.
          </p>
          <button className="btn-primary mt-5 w-full" onClick={() => navigate('/intake')}>
            Begin Assessment →
          </button>
        </article>

        <section className="fade-up fade-up-d1 mb-5 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <article key={stat.label} className="card card-hover p-4">
              <p className={`font-display text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-[var(--text-muted)]">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="fade-up fade-up-d2">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--text-muted)]">RECENT CASES</p>
            <Link to="/history" className="text-xs text-[var(--text-secondary)]">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {cases.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                to="/history"
                className="card card-hover block p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.topDiagnosis}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {item.age}{item.ageUnit === 'months' ? 'm' : 'y'} · {item.sex} · {item.region}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${triageStyle(item.triage.level)}`}>
                    {item.triage.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
