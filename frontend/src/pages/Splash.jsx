import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Splash() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(76,175,120,0.08),transparent_45%),radial-gradient(circle_at_95%_85%,rgba(200,169,110,0.08),transparent_35%)]" />

      <section className="fade-up relative z-10 w-full max-w-[420px] text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-4xl leading-tight text-[var(--text-primary)]">
          Diagnostic support for the hardest cases, in the hardest places.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          WHO IMCI + Orphanet + MSF grounded clinical support for low-resource settings.
        </p>

        <button className="btn-primary mt-8 w-full" onClick={() => navigate('/home')}>
          Enter BridgeDx
        </button>
        <Link to="/history" className="btn-ghost mt-3 block w-full text-center">
          Open Case History
        </Link>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {['WHO IMCI', 'Orphanet', 'MSF 2023', 'MedGemma 1.5'].map((tag) => (
            <span key={tag} className="tag border border-[var(--border)] text-[var(--text-muted)]">
              {tag}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}
