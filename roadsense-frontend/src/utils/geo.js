// Jarak dua titik { lat, lng } dalam meter (haversine)
export function distanceM(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const pointOf = (event) =>
  event?.latitude != null && event?.longitude != null ? { lat: event.latitude, lng: event.longitude } : null

// Report lain dengan jenis kerusakan sama dalam radius `radiusM` meter: kemungkinan duplikat.
export function nearbyDuplicates(report, reports, radiusM = 20) {
  const here = pointOf(report.event)
  if (!here) return []
  return reports
    .filter((o) => o.id !== report.id && o.status !== 'Rejected' && o.event?.damage_type === report.event.damage_type)
    .map((o) => ({ report: o, meters: pointOf(o.event) ? distanceM(here, pointOf(o.event)) : Infinity }))
    .filter((d) => d.meters <= radiusM)
    .sort((a, b) => a.meters - b.meters)
}

// "3m ago", "2h ago", "4d ago"
export function timeAgo(iso) {
  if (!iso) return '—'
  const utc = /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`
  const s = Math.max(0, (Date.now() - new Date(utc).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
