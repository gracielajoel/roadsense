import { DAMAGE_TYPES } from './constants'

// 8.4 -> "00:08"
export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// 0.957 -> "96%"
export const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`

export const damageLabel = (type) => DAMAGE_TYPES[type] || type
