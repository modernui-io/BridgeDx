export const scenarioA = {
  id: 'scenario-a',
  title: 'Tropical Fever',
  mode: 'standard',
  modeLabel: 'Standard Triage',
  modelLabel: 'MedGemma 1.5 4B',
  sourceSummary: 'WHO IMCI + Orphanet + MSF Field Guide',
  triggerKeywords: ['fever', 'malaria', 'fatigue', 'sweating', 'chills'],
  defaultComplaint:
    '28-year-old female with fever for 16 days, weakness, swollen belly, weight loss, and night sweats.',
  defaultPatient: {
    age: 28,
    ageUnit: 'years',
    sex: 'Female',
    region: 'Kisumu, Kenya',
    temperature: 38.9,
    heartRate: 104,
    respiratoryRate: 22,
    oxygenSaturation: 97,
  },
  differential: [
    {
      rank: 1,
      condition: 'Visceral Leishmaniasis (Kala-Azar)',
      confidence: 67,
      sources: ['WHO IMCI', 'Orphanet'],
      why: [
        {
          text: 'Prolonged fever >14 days',
          citation: 'WHO IMCI Fever Protocol §4.1',
        },
        {
          text: 'Hepatosplenomegaly noted',
          citation: 'WHO IMCI Fever Protocol §4.1',
        },
        {
          text: 'Progressive weight loss',
          citation: 'Orphanet Clinical Profile',
        },
        {
          text: 'Region endemic for Leishmania donovani',
          citation: 'WHO IMCI Endemic Risk Note',
        },
      ],
    },
    {
      rank: 2,
      condition: 'Typhoid Fever',
      confidence: 21,
      sources: ['WHO IMCI'],
      why: [
        { text: 'Sustained fever pattern', citation: 'WHO IMCI §3.7' },
        { text: 'Abdominal symptom profile', citation: 'WHO IMCI §3.7' },
        { text: 'Endemic region context', citation: 'WHO IMCI §3.7' },
      ],
    },
    {
      rank: 3,
      condition: 'Drug-Resistant Malaria',
      confidence: 12,
      sources: ['MSF Field Guide'],
      why: [
        { text: 'Fever with chills', citation: 'MSF 2023 §2.3' },
        { text: 'Sub-Saharan epidemiology', citation: 'MSF 2023 §2.3' },
        {
          text: 'Consider treatment resistance if prior antimalarial failed',
          citation: 'MSF 2023 §2.3',
        },
      ],
    },
  ],
  triage: {
    level: 'refer',
    title: 'Refer to Clinic',
    icon: '🟡',
    recommendation:
      'Visceral Leishmaniasis requires rK39 rapid test and specialist confirmation. Refer within 24 hours.',
    protocol: 'WHO IMCI + MSF Referral Pathway',
  },
  showConfidenceWarning: false,
  oodFlag: false,
  rareDiseaseNote: false,
  forceEmergency: false,
}

export const scenarioB = {
  id: 'scenario-b',
  title: 'Rare Pediatric',
  mode: 'rare',
  modeLabel: 'Rare Disease Investigation',
  modelLabel: 'MedGemma 27B Text',
  sourceSummary: 'Orphanet Rare Disease DB',
  triggerKeywords: [
    'child',
    'enlarged',
    'spleen',
    'repeated infections',
    'pale',
    'swollen abdomen',
  ],
  defaultComplaint:
    '4-year-old male with progressive abdominal swelling for 8 months, recurrent infections, pale appearance, and developmental regression.',
  defaultPatient: {
    age: 4,
    ageUnit: 'years',
    sex: 'Male',
    region: 'Rural Bihar, India',
    temperature: 37.1,
    heartRate: 96,
    respiratoryRate: 24,
    oxygenSaturation: 98,
  },
  differential: [
    {
      rank: 1,
      condition: 'Gaucher Disease (Type 1 or 3)',
      confidence: 54,
      sources: ['Orphanet'],
      why: [
        {
          text: 'Progressive hepatosplenomegaly',
          citation: 'Orphanet ORPHA:355 §2',
        },
        { text: 'Age of onset <5 years', citation: 'Orphanet ORPHA:355 §2' },
        {
          text: 'Developmental regression indicates possible Type 3 involvement',
          citation: 'Orphanet ORPHA:355 §2',
        },
        {
          text: 'No current fever lowers probability of infectious cause',
          citation: 'Orphanet Differential Notes',
        },
      ],
    },
    {
      rank: 2,
      condition: 'Niemann-Pick Disease Type B',
      confidence: 27,
      sources: ['Orphanet'],
      why: [
        {
          text: 'Massive splenomegaly in a pediatric patient',
          citation: 'Orphanet ORPHA:607 §3.1',
        },
        {
          text: 'Recurrent infections and abdominal distension',
          citation: 'Orphanet ORPHA:607 §3.1',
        },
        {
          text: 'Possible pulmonary involvement pattern',
          citation: 'Orphanet ORPHA:607 §3.1',
        },
      ],
    },
    {
      rank: 3,
      condition: 'Hemophagocytic Lymphohistiocytosis (HLH)',
      confidence: 19,
      sources: ['Orphanet'],
      why: [
        {
          text: 'Systemic involvement with hepatosplenomegaly',
          citation: 'Orphanet ORPHA:158 §4',
        },
        {
          text: 'Recurrent infections with age-appropriate presentation',
          citation: 'HLH-2004 Criteria',
        },
        {
          text: 'Requires urgent exclusion of life-threatening immune disorder',
          citation: 'Orphanet ORPHA:158 §4',
        },
      ],
    },
  ],
  triage: {
    level: 'emergency',
    title: 'Emergency Referral',
    icon: '🔴',
    recommendation:
      'Suspected lysosomal storage disorder or rare pediatric condition. Requires pediatric hematology/metabolic specialist. Do not delay.',
    protocol: 'Orphanet Rare Disease Urgent Referral',
  },
  showConfidenceWarning: true,
  oodFlag: true,
  rareDiseaseNote: true,
  forceEmergency: true,
}

export const scenarios = [scenarioA, scenarioB]

export const spokenMocks = {
  standard:
    '28-year-old woman with fever for over two weeks, weakness, weight loss, chills, and swollen abdomen in Kisumu.',
  rare:
    'Four-year-old boy with swollen abdomen for eight months, repeated infections, pale skin, and developmental regression.',
}

export function pickScenario(chiefComplaint = '', selectedMode = 'standard') {
  const complaint = chiefComplaint.toLowerCase()

  if (selectedMode === 'rare') {
    return scenarioB
  }

  const feverMatch = scenarioA.triggerKeywords.some((keyword) =>
    complaint.includes(keyword),
  )

  if (feverMatch) {
    return scenarioA
  }

  const rareMatch = scenarioB.triggerKeywords.some((keyword) =>
    complaint.includes(keyword),
  )

  return rareMatch ? scenarioB : scenarioB
}
