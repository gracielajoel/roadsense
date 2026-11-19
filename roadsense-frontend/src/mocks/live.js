// Live scan palsu (VITE_USE_MOCK=true): perilakunya meniru dummy di backend.
// Kerusakan muncul lalu terlihat 2-4 frame berturut-turut, dan digabung jadi satu event.

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const TYPES = ['D00', 'D10', 'D20', 'D40']

let nextId = 9000
const sessions = new Map() // video_id -> { events: [], current }

export async function startLiveSession() {
  await wait(200)
  const id = nextId++
  sessions.set(id, { events: [], current: null, created_at: new Date().toISOString() })
  return { video_id: id, job_id: id }
}

export async function sendLiveFrame(videoId, frame, { t, seq, lat, lng, sim_labels }) {
  await wait(120 + Math.random() * 120)
  const s = sessions.get(videoId)
  // Simulasi dengan video demo berlabel: pakai kerusakan asli di video, bukan acak (sama seperti backend)
  if (sim_labels != null) return labeledFrame(s, videoId, frame, { t, seq, lat, lng }, JSON.parse(sim_labels))
  if (!s.current) {
    if (Math.random() > 0.15) return { detections: [], events_total: s.events.length, inference_ms: 30 }
    s.current = { type: Math.random() < 0.4 ? 'D40' : TYPES[Math.floor(Math.random() * 3)], x: 0.3 + Math.random() * 0.25, left: 2 + Math.floor(Math.random() * 3), step: 0, event: null }
  }
  const c = s.current
  const k = c.step
  const h = 0.05 + 0.02 * k
  const det = {
    damage_type: c.type,
    confidence: +Math.min(0.97, 0.45 + Math.random() * 0.25 + 0.08 * k).toFixed(3),
    // pita jalan pada footage dashcam (di atas: langit, di bawah: kap mobil)
    bbox: [c.x - 0.02 * k, Math.min(0.58 + 0.05 * k, 0.8 - h), 0.1 + 0.04 * k, h],
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

// Satu event per jenis kerusakan yang sedang terlihat; digabung selama terlihat di frame berturut-turut
function labeledFrame(s, videoId, frame, { t, seq, lat, lng }, labels) {
  const live = s.labeled || (s.labeled = {})
  const detections = labels.map((det) => {
    let ev = live[det.damage_type]
    const isNew = !ev || t - ev.last > 4
    if (isNew) {
      const event = { id: nextId++, video_id: videoId, track_id: s.events.length + 1, damage_type: det.damage_type, confidence: -1 }
      ev = live[det.damage_type] = { event }
      s.events.push(event)
    }
    ev.last = +t
    if (det.confidence > ev.event.confidence) {
      if (ev.event.evidence_url) URL.revokeObjectURL(ev.event.evidence_url)
      Object.assign(ev.event, {
        confidence: det.confidence,
        bbox: det.bbox,
        frame: seq,
        timestamp_sec: t,
        latitude: lat ?? null,
        longitude: lng ?? null,
        evidence_url: URL.createObjectURL(frame),
      })
    }
    return { ...det, event_id: ev.event.id, is_new: isNew }
  })
  return { detections, events_total: s.events.length, inference_ms: 30 }
}

export async function endLiveSession(videoId) {
  await wait(150)
  return { video_id: videoId, events_total: sessions.get(videoId)?.events.length ?? 0 }
}

export async function listLiveEvents(videoId) {
  await wait(100)
  return [...(sessions.get(videoId)?.events ?? [])]
}

export async function listLiveSessions() {
  await wait(100)
  return [...sessions.entries()].map(([id, s]) => ({
    id,
    filename: `Live scan ${s.created_at.slice(0, 16).replace('T', ' ')}`,
    is_live: true,
    created_at: s.created_at,
  }))
}

export async function deleteLiveSession(videoId) {
  await wait(100)
  sessions.delete(videoId)
}
