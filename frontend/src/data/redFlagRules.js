const keywordGroups = {
  seizure: ['seizure', 'convulsion'],
  neuro: ['unconscious', 'unresponsive', 'not breathing'],
  toxic: ['poisoning', 'envenomation', 'snake bite'],
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword))
}

function hasChestPainRespEmergency(text) {
  return (
    text.includes('chest pain') &&
    text.includes('difficulty breathing') &&
    text.includes('sweating')
  )
}

function hasLowSystolicMention(text) {
  const bpMatch = text.match(/(systolic\s*bp|bp)\s*[:=]?\s*(\d{2,3})/)
  if (!bpMatch) {
    return false
  }
  return Number(bpMatch[2]) < 80
}

export function ageToYears(age, unit) {
  if (age === '' || age === null || Number.isNaN(Number(age))) {
    return null
  }

  const numericAge = Number(age)
  if (unit === 'months') {
    return numericAge / 12
  }
  return numericAge
}

export function evaluateEmergencyCriteria(intake, scenario = null) {
  const complaint = (intake?.chiefComplaint || '').toLowerCase()
  const ageYears = ageToYears(intake?.age, intake?.ageUnit)
  const temperature = Number(intake?.temperature)

  const reasons = []

  if (ageYears !== null && temperature > 40 && ageYears < 0.25) {
    reasons.push('Temperature >40°C in infant under 3 months')
  }

  if (hasChestPainRespEmergency(complaint)) {
    reasons.push('Chest pain + difficulty breathing + sweating reported')
  }

  if (containsAny(complaint, keywordGroups.seizure)) {
    reasons.push('Seizure or convulsion keyword detected')
  }

  if (containsAny(complaint, keywordGroups.neuro)) {
    reasons.push('Unconscious or unresponsive state detected')
  }

  if (containsAny(complaint, keywordGroups.toxic)) {
    reasons.push('Possible poisoning or envenomation mentioned')
  }

  if (hasLowSystolicMention(complaint)) {
    reasons.push('Systolic blood pressure mention below 80')
  }

  if (scenario?.forceEmergency) {
    reasons.push('Scenario-specific emergency override activated')
  }

  return {
    emergency: reasons.length > 0,
    reasons,
  }
}
