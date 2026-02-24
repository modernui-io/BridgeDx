import { useNavigate } from 'react-router-dom'
import Logo from './Logo'

export default function TopBar({ title, backLabel = 'Back', hideBack = false, rightSlot = null }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 -mx-6 mb-5 border-b border-[var(--border)] bg-[var(--bg-surface)]/90 px-6 py-3 backdrop-blur md:-mx-10 md:px-10">
      <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-2">
        {hideBack ? (
          <Logo size="sm" />
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <span className="text-lg">‹</span>
            {backLabel}
          </button>
        )}

        {title ? (
          <span className="font-sans text-sm font-medium text-[var(--text-secondary)]">{title}</span>
        ) : (
          <Logo size="sm" />
        )}

        <div className="min-w-[76px] text-right text-xs text-[var(--text-muted)]">{rightSlot}</div>
      </div>
    </header>
  )
}
