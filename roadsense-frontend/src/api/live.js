import { USE_MOCK } from '../config'
import * as mock from '../mocks/live'
import client from './client'
import { listVideoEvents } from './videos'

// Live scan: HP kirim frame kamera, server yang menjalankan deteksi (lihat routers/live.py).
// Satu sesi live = satu Video di backend (is_live = true).

export const startLiveSession = () =>
  USE_MOCK ? mock.startLiveSession() : client.post('/live/sessions').then((r) => r.data) // { video_id, job_id }

// frame: Blob JPEG. meta: { t, seq, lat, lng }
// -> { detections: [{ damage_type, confidence, bbox, event_id, is_new }], events_total, inference_ms }
export const sendLiveFrame = (videoId, frame, meta, signal) => {
  if (USE_MOCK) return mock.sendLiveFrame(videoId, frame, meta)
  const form = new FormData()
  form.append('file', frame, `frame-${meta.seq}.jpg`)
  for (const [k, v] of Object.entries(meta)) if (v != null) form.append(k, String(v))
  return client.post(`/live/sessions/${videoId}/frames`, form, { signal, timeout: 15000 }).then((r) => r.data)
}

export const endLiveSession = (videoId) =>
  USE_MOCK ? mock.endLiveSession(videoId) : client.post(`/live/sessions/${videoId}/end`).then((r) => r.data)

export const listLiveEvents = (videoId) => (USE_MOCK ? mock.listLiveEvents(videoId) : listVideoEvents(videoId))
