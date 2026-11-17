import { DAMAGE_TYPES } from './constants'

// 8.4 -> "00:08"
export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// 0.957 -> "96%"
export const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`

export const damageLabel = (type) => DAMAGE_TYPES[type] || type

// Backend mengirim waktu UTC tanpa zona ("2026-11-01T13:38:56"), jadi tandai sebagai UTC dulu
export function formatDateTime(iso) {
  if (!iso) return '—'
  const utc = /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
  return new Date(utc).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export const formatLocation = (event) =>
  event?.latitude != null && event?.longitude != null
    ? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`
    : '—'

export const mapUrl = (event) =>
  `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=18/${event.latitude}/${event.longitude}`
