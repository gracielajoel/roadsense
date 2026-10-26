// Ringkasan hasil deteksi untuk kartu statistik.
// CATATAN: skor kondisi jalan ini estimasi di frontend, belum ada dari backend.

const SEVERITY = { D00: 12, D10: 15, D20: 22, D40: 30 }

export function roadConditionScore(events) {
  const penalty = events.reduce((sum, e) => sum + (SEVERITY[e.damage_type] || 15) * e.confidence, 0)
  return Math.max(0, Math.round(100 - penalty))
}

export function roadConditionLabel(score) {
  if (score < 50) return { text: 'Repair needed', tone: 'warning' }
  if (score < 75) return { text: 'Monitor', tone: 'neutral' }
  return { text: 'Good', tone: 'success' }
}

export function averageConfidence(events) {
  if (!events.length) return 0
  return events.reduce((sum, e) => sum + e.confidence, 0) / events.length
}

export function confidenceLabel(avg) {
  if (avg >= 0.85) return 'High accuracy'
  if (avg >= 0.6) return 'Moderate accuracy'
  return 'Low accuracy'
}
