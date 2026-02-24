import { useState } from 'react'

const impressionOptions = [
  'Agree with top suggestion',
  'Partially agree',
  'Disagree — my assessment differs',
  'Unsure — referring regardless',
]

export default function ConfirmationGate({ onConfirm, disabled }) {
  const [checked, setChecked] = useState(false)
  const [impression, setImpression] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <h2 className="font-display text-2xl text-[var(--text-primary)]">Your Assessment</h2>

      <label className="mt-4 flex items-start gap-2 text-sm text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        I have reviewed the AI reasoning and understand this is clinical decision support, not a diagnosis.
      </label>

      <div className="mt-4">
        <label htmlFor="impression" className="mb-1 block text-sm text-[var(--text-primary)]">
          My clinical impression
        </label>
        <select
          id="impression"
          disabled={!checked || disabled}
          value={impression}
          onChange={(event) => setImpression(event.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
        >
          <option value="">Select one</option>
          {impressionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="notes" className="mb-1 block text-sm text-[var(--text-primary)]">
          Additional notes (optional)
        </label>
        <textarea
          id="notes"
          rows="3"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Document your clinical reasoning or referral details"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      <button
        type="button"
        disabled={!checked || !impression || disabled}
        onClick={() => onConfirm({ impression, notes })}
        className="mt-5 w-full rounded-xl bg-[var(--accent-gold)] px-4 py-3 text-sm font-bold text-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirm & Log Case
      </button>
    </section>
  )
}
