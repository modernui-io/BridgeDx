function colorForConfidence(confidence) {
  if (confidence > 70) return 'var(--success)'
  if (confidence >= 40) return 'var(--warning)'
  return 'var(--danger)'
}

export default function ConfidenceBar({ confidence }) {
  const barColor = colorForConfidence(confidence)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>Confidence</span>
        <span className="font-mono text-sm text-[var(--text-primary)]">{confidence}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${confidence}%`, backgroundColor: barColor }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={confidence}
          aria-label={`Confidence ${confidence} percent`}
        />
      </div>
    </div>
  )
}
