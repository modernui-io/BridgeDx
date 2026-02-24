export default function EmergencyBanner({ reasons }) {
  return (
    <section className="mb-5 rounded-2xl border border-red-300 bg-[var(--danger)]/20 px-4 py-4 text-[var(--text-primary)]">
      <h2 className="text-base font-bold">🚨 Emergency Criteria Detected</h2>
      <p className="mt-1 text-sm">
        One or more emergency signs are present. <strong>Refer immediately.</strong> Do not wait for full AI assessment.
      </p>
      {reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--text-primary)]/90">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
