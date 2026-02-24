import Logo from './Logo'

export default function LoadingScreen({ message }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10 text-center">
      <div className="mb-5 flex justify-center">
        <Logo compact={false} />
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full w-1/2 animate-scan rounded-full bg-[var(--accent-gold)]" />
      </div>
      <p className="animate-pulse-soft text-base text-[var(--text-primary)]">{message}</p>
      <p className="mt-4 text-xs text-[var(--text-secondary)]">This typically takes 3–8 seconds in production.</p>
    </section>
  )
}
