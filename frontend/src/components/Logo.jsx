export default function Logo({ size = 'md' }) {
  const textSize = size === 'sm' ? 'text-lg' : 'text-2xl'
  const icon = size === 'sm' ? 20 : 28

  return (
    <div className="flex items-center gap-2">
      <svg width={icon * 1.3} height={icon} viewBox="0 0 28 20" fill="none" role="img" aria-label="BridgeDx logo">
        <path d="M2 17 Q7 4 14 4 Q21 4 26 17" stroke="var(--accent-gold)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="2" y1="17" x2="26" y2="17" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="17" x2="9" y2="11" stroke="var(--accent-gold)" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="14" y1="17" x2="14" y2="7" stroke="var(--accent-gold)" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="19" y1="17" x2="19" y2="11" stroke="var(--accent-gold)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={`font-display ${textSize} tracking-[0.02em] text-[var(--text-primary)]`}>
        Bridge<span className="text-[var(--accent-gold)]">Dx</span>
      </span>
    </div>
  )
}
