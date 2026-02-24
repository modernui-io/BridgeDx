import { Link, useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'

function Field({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.1em] text-[var(--text-muted)]">{label.toUpperCase()}</p>
      <p className="mt-1 text-sm text-[var(--text-primary)]">{value || 'Not provided'}</p>
    </div>
  )
}

export default function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const intake = location.state?.intake
  const createdAt = location.state?.createdAt || new Date().toISOString()

  if (!intake) {
    return (
      <main className="min-h-screen">
        <TopBar title="Review" backLabel="Intake" />
        <section className="mx-auto w-full max-w-[720px] px-6 py-6 md:px-10">
          <div className="card p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No intake data found.</p>
            <Link to="/intake" className="btn-primary mt-3 inline-block">Return to intake</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <TopBar title="Review Summary" backLabel="Edit Patient" />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-10 md:px-10">
        <div className="fade-up card p-5">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">Review before analysis</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Confirm all details before running MedGemma inference.
          </p>
        </div>

        <div className="fade-up fade-up-d1 card mt-3 p-5">
          <p className="label">Chief complaint</p>
          <p className="font-display text-base italic leading-relaxed text-[var(--text-primary)]">"{intake.chiefComplaint}"</p>
        </div>

        <div className="fade-up fade-up-d2 card mt-3 p-5">
          <p className="label">Patient details</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" value={intake.age ? `${intake.age} ${intake.ageUnit}` : ''} />
            <Field label="Sex" value={intake.sex} />
            <Field label="Region" value={intake.region} />
            <Field label="Mode" value={intake.mode === 'rare' ? 'Rare Disease Investigation' : 'Standard Triage'} />
            <Field label="Temp" value={intake.temperature ? `${intake.temperature}°C` : ''} />
            <Field label="Heart Rate" value={intake.heartRate ? `${intake.heartRate} bpm` : ''} />
            <Field label="Resp Rate" value={intake.respiratoryRate ? `${intake.respiratoryRate}/min` : ''} />
            <Field label="Upload" value={intake.imageName} />
          </div>
        </div>

        <div className="fade-up fade-up-d2 mt-4 rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 px-4 py-3 text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Model selected:</strong>{' '}
          {intake.mode === 'rare'
            ? 'MedGemma 27B Text (RarePath) · Orphanet reasoning'
            : 'MedGemma 1.5 4B (Standard) · WHO IMCI + MSF protocols'}
        </div>

        <button
          className="btn-primary mt-5 w-full"
          onClick={() => navigate('/results', { state: { intake, createdAt } })}
        >
          Run Analysis →
        </button>
        <button
          className="btn-ghost mt-2 w-full"
          onClick={() => navigate('/intake', { state: { intake } })}
        >
          ← Edit Patient Information
        </button>
      </section>
    </main>
  )
}
