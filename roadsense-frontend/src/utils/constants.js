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
