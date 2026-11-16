// Disamakan dengan schemas.py di backend

export const DAMAGE_TYPES = {
  D00: 'Longitudinal crack',
  D10: 'Transverse crack',
  D20: 'Alligator crack',
  D40: 'Pothole',
}

export const REPORT_STATUSES = ['New', 'Verified', 'In Progress', 'Completed', 'Rejected']

export const JOB_STATUSES = ['queued', 'processing', 'done', 'failed']

export const ROLES = ['user', 'admin']

export const STATUS_TONE = {
  New: 'info',
  Verified: 'neutral',
  'In Progress': 'warning',
  Completed: 'success',
  Rejected: 'danger',
}

// Alur status yang diizinkan backend (ALLOWED_TRANSITIONS di routers/reports.py)
export const NEXT_STATUSES = {
  New: ['Verified', 'Rejected'],
  Verified: ['In Progress'],
  'In Progress': ['Completed'],
  Completed: [],
  Rejected: [],
}

export const JOB_TONE = { queued: 'neutral', processing: 'warning', done: 'success', failed: 'danger' }

// Tingkat keparahan per jenis kerusakan (taksonomi di Figma "01 Cover & Architecture"):
// lubang = SEV-1 critical (merah), retak = SEV-2 moderate (kuning).
export const SEVERITY = {
  D40: { level: 1, label: 'SEV-1 Critical', tone: 'danger' },
  D20: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
  D10: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
  D00: { level: 2, label: 'SEV-2 Moderate', tone: 'warning' },
}
export const severityOf = (type) => SEVERITY[type] || { level: 2, label: 'SEV-2 Moderate', tone: 'warning' }
