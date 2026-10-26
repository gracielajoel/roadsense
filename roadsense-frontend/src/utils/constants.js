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
