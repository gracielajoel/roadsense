// Disamakan dengan schemas.py di backend

export const DAMAGE_TYPES = {
  D00: 'Longitudinal crack',
  D10: 'Transverse crack',
  D20: 'Alligator crack',
  D40: 'Pothole',
}

// Tingkat keparahan per jenis kerusakan (taksonomi di Figma "01 Cover & Architecture"):
// lubang = SEV-1 critical (merah), retak = SEV-2 moderate (kuning).
export const SEVERITY = {
  D40: { level: 1, label: 'SEV-1 Critical', tone: 'danger' },
  D20: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
  D10: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
  D00: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
}
export const severityOf = (type) => SEVERITY[type] || { level: 2, label: 'SEV-2 Moderate', tone: 'warning' }
