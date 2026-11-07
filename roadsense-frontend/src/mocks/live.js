// Live scan palsu (VITE_USE_MOCK=true): perilakunya meniru dummy di backend.
// Kerusakan muncul lalu terlihat 2-4 frame berturut-turut, dan digabung jadi satu event.

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TYPES = ['D00', 'D10', 'D20', 'D40']

let nextId = 9000
const sessions = new Map() // video_id -> { events: [], current }

export async function startLiveSession() {
  await wait(200)
  const id = nextId++
  sessions.set(id, { events: [], current: null })
  return { video_id: id, job_id: id }
}

export async function sendLiveFrame(videoId, frame, { t, seq, lat, lng }) {
  await wait(120 + Math.random() * 120)
  const s = sessions.get(videoId)
  if (!s.current) {
    if (Math.random() > 0.15) return { detections: [], events_total: s.events.length, inference_ms: 30 }
    s.current = { type: TYPES[Math.floor(Math.random() * 4)], x: 0.3 + Math.random() * 0.25, left: 2 + Math.floor(Math.random() * 3), step: 0, event: null }
  }
  const c = s.current
  const k = c.step
  const h = 0.07 + 0.03 * k
  const det = {
    damage_type: c.type,
    confidence: +Math.min(0.97, 0.45 + Math.random() * 0.25 + 0.08 * k).toFixed(3),
    bbox: [c.x - 0.02 * k, Math.min(0.55 + 0.08 * k, 1 - h), 0.12 + 0.05 * k, h],
  }
  const isNew = !c.event
  if (isNew) {
    c.event = { id: nextId++, video_id: videoId, track_id: s.events.length + 1, damage_type: c.type, confidence: -1 }
    s.events.push(c.event)
  }
  if (det.confidence > c.event.confidence) {
    if (c.event.evidence_url) URL.revokeObjectURL(c.event.evidence_url)
    Object.assign(c.event, {
      confidence: det.confidence,
      bbox: det.bbox,
      frame: seq,
      timestamp_sec: t,
      latitude: lat ?? null,
      longitude: lng ?? null,
      evidence_url: URL.createObjectURL(frame),
    })
  }
  const eventId = c.event.id
  c.step += 1
  if (--c.left <= 0) s.current = null
  return {
    detections: [{ ...det, event_id: eventId, is_new: isNew }],
    events_total: s.events.length,
    inference_ms: 30,
  }
}

export async function endLiveSession(videoId) {
  await wait(150)
  return { video_id: videoId, events_total: sessions.get(videoId)?.events.length ?? 0 }
}

export async function listLiveEvents(videoId) {
  await wait(100)
  return [...(sessions.get(videoId)?.events ?? [])]
}
