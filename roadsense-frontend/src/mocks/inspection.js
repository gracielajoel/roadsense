// Data & API palsu selama backend belum siap (aktif kalau VITE_USE_MOCK=true).
// Bentuk data mengikuti schemas.py backend (EventOut, JobOut, ReportOut),
// ditambah field opsional `frame` dan `bbox` yang belum ada di backend.

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export const DEMO_VIDEO = {
  id: 1,
  filename: 'elm-street-inspection.mp4',
  path: '/demo/road-inspection.mp4',
  created_at: '2026-10-26T08:00:00',
}

// bbox = [x, y, lebar, tinggi], relatif 0-1 terhadap frame video
const DEMO_EVENTS = [
  { id: 1, track_id: 1, damage_type: 'D40', confidence: 0.96, timestamp_sec: 8, frame: 192, bbox: [0.36, 0.33, 0.29, 0.34] },
  { id: 2, track_id: 2, damage_type: 'D10', confidence: 0.89, timestamp_sec: 14, frame: 336, bbox: [0.22, 0.32, 0.55, 0.09] },
  { id: 3, track_id: 3, damage_type: 'D20', confidence: 0.93, timestamp_sec: 21, frame: 504, bbox: [0.46, 0.3, 0.26, 0.31] },
]

const PROCESSING_MS = 4000
const videos = new Map([[DEMO_VIDEO.id, { ...DEMO_VIDEO, duration: 27, jobStartedAt: 0 }]])
let nextId = 100

function readDuration(file) {
  return new Promise((resolve) => {
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      resolve(el.duration || 27)
      URL.revokeObjectURL(el.src)
    }
    el.onerror = () => resolve(27)
    el.src = URL.createObjectURL(file)
  })
}

export async function listVideos() {
  await wait(100)
  return [DEMO_VIDEO]
}

export async function listReports() {
  await wait(100)
  return []
}

export async function uploadVideo(file, onUploadProgress) {
  for (let loaded = 0; loaded <= 100; loaded += 20) {
    onUploadProgress?.({ loaded, total: 100 })
    await wait(150)
  }
  const id = nextId++
  videos.set(id, {
    id,
    filename: file.name,
    path: '',
    created_at: new Date().toISOString(),
    duration: await readDuration(file),
    jobStartedAt: Date.now(),
  })
  return { video_id: id, job_id: id }
}

export async function getJob(jobId) {
  await wait(100)
  const video = videos.get(jobId)
  const progress = Math.min(100, Math.round(((Date.now() - video.jobStartedAt) / PROCESSING_MS) * 100))
  return {
    id: jobId,
    video_id: jobId,
    status: progress >= 100 ? 'done' : 'processing',
    progress,
    error: null,
  }
}

export async function listVideoEvents(videoId) {
  await wait(200)
  const base = { video_id: videoId, evidence_url: null, latitude: null, longitude: null }
  if (videoId === DEMO_VIDEO.id) return DEMO_EVENTS.map((e) => ({ ...e, ...base }))

  // Video upload sendiri: taruh event demo di 30%, 52%, 78% durasi (tanpa bbox)
  const { duration } = videos.get(videoId)
  return DEMO_EVENTS.map((e, i) => {
    const ts = duration * [0.3, 0.52, 0.78][i]
    return { ...e, ...base, id: videoId * 10 + i, timestamp_sec: +ts.toFixed(1), frame: Math.round(ts * 24), bbox: null }
  })
}

export async function createReport(data) {
  await wait(600)
  return {
    id: nextId++,
    ...data,
    verified_by: null,
    status: 'New',
    after_photo_path: null,
    created_at: new Date().toISOString(),
  }
}
