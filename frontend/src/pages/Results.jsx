import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ConfirmationGate from '../components/ConfirmationGate'
import DifferentialCard from '../components/DifferentialCard'
import EmergencyBanner from '../components/EmergencyBanner'
import LoadingScreen from '../components/LoadingScreen'
import PatientSummaryBar from '../components/PatientSummaryBar'
import Toast from '../components/Toast'
import TopBar from '../components/TopBar'
import TriageBadge from '../components/TriageBadge'
import { useAppContext } from '../context/AppContext'
import { pickScenario } from '../data/mockScenarios'
import { evaluateEmergencyCriteria } from '../data/redFlagRules'

const loadingMessages = [
  'Parsing symptom description…',
  'Retrieving WHO IMCI protocol sections…',
  'Scanning Orphanet disease profiles…',
  'Running MedGemma inference…',
  'Applying safety checks…',
]

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logCase } = useAppContext()
  const intake = location.state?.intake
  const createdAt = location.state?.createdAt || new Date().toISOString()

  const [loading, setLoading] = useState(true)
  const [messageIndex, setMessageIndex] = useState(0)
  const [loggedCaseId, setLoggedCaseId] = useState('')
  const [showToast, setShowToast] = useState(false)

  const scenario = useMemo(() => (intake ? pickScenario(intake.chiefComplaint, intake.mode) : null), [intake])
  const emergencyResult = useMemo(() => {
    if (!intake || !scenario) return { emergency: false, reasons: [] }
    return evaluateEmergencyCriteria(intake, scenario)
  }, [intake, scenario])

  useEffect(() => {
    const rotate = setInterval(() => setMessageIndex((idx) => (idx + 1) % loadingMessages.length), 620)
    const timer = setTimeout(() => setLoading(false), 2800)
    return () => {
      clearInterval(rotate)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!showToast) return undefined
    const timer = setTimeout(() => setShowToast(false), 3200)
    return () => clearTimeout(timer)
  }, [showToast])

  if (!intake || !scenario) {
    return (
      <main className="min-h-screen">
        <TopBar title="Results" backLabel="Intake" />
        <section className="mx-auto w-full max-w-[720px] px-6 py-6 md:px-10">
          <div className="card p-6 text-center">
            <p className="text-[var(--text-primary)]">No intake data found. Start a new assessment.</p>
            <button type="button" onClick={() => navigate('/intake')} className="btn-primary mt-3">
              Start New Assessment
            </button>
          </div>
        </section>
      </main>
    )
  }

  const topConfidence = scenario.differential[0]?.confidence || 0
  const showConfidenceWarning = topConfidence < 50 || scenario.oodFlag || scenario.showConfidenceWarning

  const handleConfirm = ({ impression, notes }) => {
    const saved = logCase({
      age: intake.age,
      ageUnit: intake.ageUnit,
      sex: intake.sex,
      region: intake.region,
      mode: intake.mode,
      modeLabel: scenario.modeLabel,
      chiefComplaint: intake.chiefComplaint,
      topDiagnosis: scenario.differential[0].condition,
      triage: scenario.triage,
      impression,
      notes,
      differential: scenario.differential,
      emergency: emergencyResult.emergency,
    })
    setLoggedCaseId(saved.id)
    setShowToast(true)
  }

  return (
    <main className="min-h-screen">
      <TopBar
        title="Assessment Results"
        backLabel="New Assessment"
        rightSlot={<span className="font-mono text-[10px]">{intake.mode === 'rare' ? 'RAREPATH' : 'STANDARD'}</span>}
      />

      <section className="mx-auto w-full max-w-[720px] px-6 pb-10 md:px-10">
        {loading ? (
          <LoadingScreen message={loadingMessages[messageIndex]} />
        ) : (
          <>
            <PatientSummaryBar intake={intake} modeLabel={scenario.modeLabel} timestampValue={createdAt} />

            {emergencyResult.emergency && <EmergencyBanner reasons={emergencyResult.reasons} />}

            {showConfidenceWarning && (
              <section className="mb-4 rounded-xl border border-[var(--warning)]/35 bg-[var(--warning)]/10 px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--warning)]">⚠ Low AI Confidence</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Presentation is unusual. Prioritize clinical judgment and physician referral.
                </p>
              </section>
            )}

            <section className="mb-4">
              <TriageBadge triage={scenario.triage} />
            </section>

            <section className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl text-[var(--text-primary)]">AI Differential Diagnosis</h2>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--text-muted)]" title="Decision support only">
                  info
                </span>
              </div>
              {scenario.differential.map((diagnosis, index) => (
                <DifferentialCard key={diagnosis.condition} diagnosis={diagnosis} defaultOpen={index === 0} delay={index * 160} />
              ))}
            </section>

            {scenario.rareDiseaseNote && (
              <section className="mb-4 rounded-xl border border-[var(--accent-blue)]/35 bg-[var(--accent-blue)]/10 px-4 py-3 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--accent-blue)]">🔬 Rare Disease Pathway Activated</p>
                <p className="mt-1">Specialist confirmation is required before treatment decisions.</p>
              </section>
            )}

            <ConfirmationGate onConfirm={handleConfirm} disabled={Boolean(loggedCaseId)} />

            {loggedCaseId && (
              <section className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                <Link to="/intake" className="btn-ghost text-center">
                  New Assessment
                </Link>
                <Link to="/history" className="btn-primary text-center">
                  Case History
                </Link>
              </section>
            )}
          </>
        )}
      </section>

      {showToast && <Toast message="Case logged to history" />}
    </main>
  )
}
