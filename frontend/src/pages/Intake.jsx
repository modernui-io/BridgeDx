import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { spokenMocks } from '../data/mockScenarios'
import { ageToYears } from '../data/redFlagRules'

const sexOptions = ['Male', 'Female', 'Other']

function Divider({ label }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  )
}

export default function Intake() {
  const navigate = useNavigate()
  const location = useLocation()
  const [recording, setRecording] = useState(false)
  const [form, setForm] = useState({
    age: '',
    ageUnit: 'years',
    sex: 'Female',
    region: '',
    chiefComplaint: '',
    temperature: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    mode: 'standard',
    imageName: '',
    fileType: '',
  })

  useEffect(() => {
    const existing = location.state?.intake
    if (!existing) return
    setForm((current) => ({ ...current, ...existing }))
  }, [location.state])

  const emergencyThreshold = useMemo(() => {
    const ageYears = ageToYears(form.age, form.ageUnit)
    return ageYears !== null && Number(form.temperature) > 40 && ageYears < 0.25
  }, [form.age, form.ageUnit, form.temperature])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSpeak = () => {
    setRecording(true)
    setTimeout(() => {
      setField('chiefComplaint', form.mode === 'rare' ? spokenMocks.rare : spokenMocks.standard)
      setRecording(false)
    }, 2500)
  }

  const canContinue = form.chiefComplaint.trim().length > 8

  return (
    <main className="min-h-screen">
      <TopBar title="New Assessment" backLabel="Home" />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-10 md:px-10">
        {emergencyThreshold && (
          <div className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--text-secondary)]">
            <strong className="text-[var(--danger)]">Emergency threshold:</strong> Temperature &gt;40°C in infant &lt;3 months. Refer immediately.
          </div>
        )}

        <Divider label="ASSESSMENT MODE" />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setField('mode', 'standard')}
            className={`card w-full p-4 text-left ${form.mode === 'standard' ? 'border-[var(--success)]/50 bg-[var(--success)]/10' : ''}`}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">⚡ Standard Triage</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">MedGemma 1.5 4B · WHO IMCI + MSF · Acute presentations</p>
          </button>
          <button
            type="button"
            onClick={() => setField('mode', 'rare')}
            className={`card w-full p-4 text-left ${form.mode === 'rare' ? 'border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/10' : ''}`}
          >
            <p className="text-sm font-semibold text-[var(--text-primary)]">🔬 Rare Disease Investigation</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">MedGemma 27B · Orphanet profiles · Complex/long-duration cases</p>
          </button>
        </div>

        <Divider label="PATIENT BASICS" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Age</label>
            <div className="flex gap-2">
              <input className="input-field w-20" type="number" min="0" value={form.age} onChange={(event) => setField('age', event.target.value)} />
              <select className="input-field" value={form.ageUnit} onChange={(event) => setField('ageUnit', event.target.value)}>
                <option value="years">years</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Region</label>
            <input className="input-field" value={form.region} placeholder="e.g. Kisumu County, Kenya" onChange={(event) => setField('region', event.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
          {sexOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setField('sex', option)}
              className={`flex-1 py-2 text-sm ${form.sex === option ? 'bg-[var(--accent-gold)] font-semibold text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              {option}
            </button>
          ))}
        </div>

        <Divider label="CHIEF COMPLAINT" />
        <label className="label">Describe the patient's main symptoms</label>
        <textarea
          rows="5"
          className="input-field"
          value={form.chiefComplaint}
          placeholder="e.g. 5-year-old with fever for 14 days, swollen abdomen, weight loss..."
          onChange={(event) => setField('chiefComplaint', event.target.value)}
        />
        <button type="button" onClick={handleSpeak} disabled={recording} className="btn-ghost mt-2">
          {recording ? '🔴 Recording… (MedASR)' : '🎤 Speak symptoms — MedASR'}
        </button>

        <Divider label="VITALS · OPTIONAL" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="label">Temp (°C)</label>
            <input className="input-field" type="number" value={form.temperature} onChange={(event) => setField('temperature', event.target.value)} />
          </div>
          <div>
            <label className="label">Heart Rate</label>
            <input className="input-field" type="number" value={form.heartRate} onChange={(event) => setField('heartRate', event.target.value)} />
          </div>
          <div>
            <label className="label">Resp Rate</label>
            <input className="input-field" type="number" value={form.respiratoryRate} onChange={(event) => setField('respiratoryRate', event.target.value)} />
          </div>
        </div>

        <Divider label="IMAGE UPLOAD · OPTIONAL" />
        <label className="card block cursor-pointer border-dashed p-6 text-center">
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setField('imageName', file.name)
              setField('fileType', file.type)
            }}
          />
          <p className="text-sm text-[var(--text-secondary)]">{form.imageName || 'Upload photo or lab report (JPG, PNG, PDF)'}</p>
        </label>

        <button
          type="button"
          disabled={!canContinue}
          className="btn-primary mt-7 w-full"
          onClick={() => navigate('/review', { state: { intake: form, createdAt: new Date().toISOString() } })}
        >
          Review Patient Summary →
        </button>
      </section>
    </main>
  )
}
