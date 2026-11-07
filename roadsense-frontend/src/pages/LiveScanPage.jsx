import {
  ArrowLeft,
  BatteryCharging,
  CircleCheck,
  CloudUpload,
  Gauge,
  LoaderCircle,
  MapPin,
  MapPinOff,
  Moon,
  Pause,
  Play,
  Radio,
  Route,
  ShieldCheck,
  Smartphone,
  Square,
  TriangleAlert,
  Video,
  WifiOff,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { endLiveSession, listLiveEvents, sendLiveFrame, startLiveSession } from '../api/live'
import { createReport } from '../api/reports'
import useAuth from '../auth/useAuth'
import BoundingBox from '../components/inspection/BoundingBox'
import FrameThumb from '../components/inspection/FrameThumb'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { severityOf } from '../utils/constants'
import { distanceM } from '../utils/geo'
import { damageLabel, formatPercent, formatTime } from '../utils/format'

// Ukuran frame yang dikirim ke server. 640px lebar + JPEG 0.7 ≈ 20-40 KB per frame.
// HP cuma mengompres gambar; model jalan di server supaya HP tidak panas & hemat baterai.
const FRAME_WIDTH = 640
const JPEG_QUALITY = 0.7
const INTERVALS = [
  { ms: 1000, label: '1 / sec', hint: 'Best coverage' },
  { ms: 2000, label: '1 / 2 sec', hint: 'Saves data & battery' },
]
const BOX_TTL_MS = 1600 // berapa lama kotak deteksi tetap tampil
const MAX_GPS_ACCURACY_M = 30 // titik GPS yang lebih kasar tidak dihitung ke jarak tempuh
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// "Pothole" -> "POTHOLE", "Alligator crack" -> "ALLIGATOR_CRACK" (gaya label HUD di desain)
const hudLabel = (type) => damageLabel(type).toUpperCase().replace(/\s+/g, '_')

function captureFrame(video, canvas) {
  const scale = Math.min(1, FRAME_WIDTH / video.videoWidth)
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
}

function cameraError(err) {
  if (!window.isSecureContext) return 'Camera needs HTTPS. Open RoadSense through an https:// address (see README).'
  if (err?.name === 'NotAllowedError') return 'Camera permission was denied. Allow camera access in your browser settings.'
  if (err?.name === 'NotFoundError') return 'No camera found on this device.'
  return err?.message || 'Could not start the camera.'
}

export default function LiveScanPage() {
  const { isAdmin } = useAuth()
  const [phase, setPhase] = useState('setup') // setup | starting | running | ending | summary
  const [intervalMs, setIntervalMs] = useState(INTERVALS[0].ms)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null) // { video_id }
  const [stats, setStats] = useState({ frames: 0, events: 0, latency: null, offline: false })
  const [boxes, setBoxes] = useState({ list: [], at: 0 })
  const [toast, setToast] = useState(null) // { type, confidence, lat, lng, at }
  const [gps, setGps] = useState(null) // { lat, lng, accuracy, speed } | { error }
  const [distance, setDistance] = useState(0) // meter
  const [elapsed, setElapsed] = useState(0)
  const [dimmed, setDimmed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [aspect, setAspect] = useState(16 / 9)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const runningRef = useRef(false)
  const pausedRef = useRef(false)
  const gpsRef = useRef(null)
  const lastPointRef = useRef(null)
  const startedAtRef = useRef(0)
  const wakeLockRef = useRef(null)
  const abortRef = useRef(null)
  const sessionRef = useRef(null)

  // ---------- Perangkat: kamera, GPS, layar tetap menyala ----------

  const stopDevices = () => {
    runningRef.current = false
    abortRef.current?.abort()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (gpsRef.current?.watchId != null) navigator.geolocation.clearWatch(gpsRef.current.watchId)
    gpsRef.current = null
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  const requestWakeLock = async () => {
    try {
      wakeLockRef.current = await navigator.wakeLock?.request('screen')
    } catch {
      // tidak didukung / ditolak: layar mungkin mati sendiri, scan tetap jalan selama layar menyala
    }
  }

  // Bersihkan saat halaman ditinggalkan di tengah scan
  useEffect(
    () => () => {
      const wasRunning = runningRef.current
      stopDevices()
      if (wasRunning && sessionRef.current) endLiveSession(sessionRef.current.video_id).catch(() => {})
    },
    [],
  )

  // Wake lock dilepas browser saat tab disembunyikan, minta lagi saat kembali
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && runningRef.current && requestWakeLock()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Jam sesi
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed((Date.now() - startedAtRef.current) / 1000), 500)
    return () => clearInterval(id)
  }, [phase])

  // Kotak deteksi hilang sendiri setelah BOX_TTL_MS
  useEffect(() => {
    if (!boxes.list.length) return
    const id = setTimeout(() => setBoxes({ list: [], at: 0 }), BOX_TTL_MS)
    return () => clearTimeout(id)
  }, [boxes])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast])

  // ---------- Alur sesi ----------

  const onPosition = ({ coords }) => {
    const point = { lat: coords.latitude, lng: coords.longitude }
    gpsRef.current = { ...gpsRef.current, ...point, accuracy: coords.accuracy }
    setGps({ ...point, accuracy: coords.accuracy, speed: coords.speed })
    if (coords.accuracy > MAX_GPS_ACCURACY_M) return
    const last = lastPointRef.current
    if (!last) {
      lastPointRef.current = point
      return
    }
    const d = distanceM(last, point)
    if (d >= 5) {
      // abaikan getaran GPS di tempat
      setDistance((x) => x + d)
      lastPointRef.current = point
    }
  }

  const start = async () => {
    setError(null)
    setPhase('starting')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error()
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // Kamera belakang, resolusi & fps rendah: lebih hemat baterai, frame tetap cukup untuk model
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 10, max: 15 } },
      })
    } catch (err) {
      stopDevices()
      setError(cameraError(err))
      setPhase('setup')
      return
    }

    lastPointRef.current = null
    setDistance(0)
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        onPosition,
        (err) => setGps({ error: err.code === 1 ? 'Location denied' : 'No GPS fix' }),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
      )
      gpsRef.current = { watchId }
    } else {
      setGps({ error: 'No GPS' })
    }

    try {
      const s = await startLiveSession()
      sessionRef.current = s
      setSession(s)
    } catch (err) {
      stopDevices()
      setError(`Could not start a session: ${err.message}`)
      setPhase('setup')
      return
    }

    await requestWakeLock()
    setStats({ frames: 0, events: 0, latency: null, offline: false })
    setElapsed(0)
    setDimmed(false)
    setPaused(false)
    pausedRef.current = false
    startedAtRef.current = Date.now()
    runningRef.current = true
    setPhase('running')
  }

  // Pasang stream ke <video> setelah elemen running ter-render
  useEffect(() => {
    if (phase !== 'running' || !videoRef.current || !streamRef.current) return
    const v = videoRef.current
    v.srcObject = streamRef.current
    v.onloadedmetadata = () => v.videoWidth && setAspect(v.videoWidth / v.videoHeight)
    v.play().catch(() => {})
    loop(sessionRef.current.video_id)
    // loop sengaja hanya dimulai sekali per sesi
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Kirim satu frame, tunggu jawaban, baru kirim berikutnya: kalau jaringan lambat,
  // frame otomatis dilewati (tidak menumpuk antrean dan tidak boros kuota).
  const loop = async (videoId) => {
    let seq = 0
    let failures = 0
    while (runningRef.current) {
      const tick = Date.now()
      const v = videoRef.current
      if (!pausedRef.current && document.visibilityState === 'visible' && v?.readyState >= 2) {
        try {
          const blob = await captureFrame(v, canvasRef.current)
          const g = gpsRef.current
          abortRef.current = new AbortController()
          const res = await sendLiveFrame(
            videoId,
            blob,
            { t: ((tick - startedAtRef.current) / 1000).toFixed(2), seq, lat: g?.lat, lng: g?.lng },
            abortRef.current.signal,
          )
          if (!runningRef.current) break
          seq += 1
          failures = 0
          const latency = Date.now() - tick
          setStats((s) => ({ frames: s.frames + 1, events: res.events_total, latency, offline: false }))
          if (res.detections.length) {
            setBoxes({ list: res.detections, at: Date.now() })
            const fresh = res.detections.find((d) => d.is_new)
            if (fresh) setToast({ type: fresh.damage_type, confidence: fresh.confidence, lat: g?.lat, lng: g?.lng, at: Date.now() })
          }
        } catch (err) {
          if (!runningRef.current) break
          if (err.status === 409) {
            // sesi sudah ditutup di server
            finish()
            break
          }
          failures += 1
          setStats((s) => ({ ...s, offline: true }))
          await wait(Math.min(8000, 1000 * 2 ** failures)) // jaringan putus: coba lagi pelan-pelan
          continue
        }
      }
      await wait(Math.max(0, intervalMs - (Date.now() - tick)))
    }
  }

  const togglePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }

  const finish = async () => {
    const s = sessionRef.current
    stopDevices()
    setPhase('ending')
    try {
      if (s) await endLiveSession(s.video_id)
    } catch {
      // sesi tetap tersimpan; ringkasan tetap bisa dimuat
    }
    setPhase('summary')
  }

  const reset = () => {
    sessionRef.current = null
    setSession(null)
    setGps(null)
    setBoxes({ list: [], at: 0 })
    setToast(null)
    setPhase('setup')
  }

  // ---------- Tampilan ----------

  if (phase === 'running' || phase === 'ending') {
    const speedKmh = gps?.speed != null ? Math.round(gps.speed * 3.6) : null
    const fps = 1000 / intervalMs
    return (
      <div className={`live ${dimmed ? 'is-dimmed' : ''}`}>
        <canvas ref={canvasRef} hidden />

        <header className="hud-header">
          <span className="hud-brand-tile">
            <Radio size={18} />
          </span>
          <div>
            <strong>
              ROADSENSE <em>// HUD</em>
            </strong>
            <span>
              <i className={`live-dot ${paused ? 'is-paused' : ''}`} /> {paused ? 'PAUSED' : 'LIVE SCAN'} · {formatTime(elapsed)}
            </span>
          </div>
        </header>

        <div className="hud-top">
          <div className="hud-chip hud-status">
            <span className={stats.offline ? 'tone-danger' : 'hud-accent'}>
              <i className={`live-dot ${stats.offline ? 'is-error' : ''}`} />
              {stats.offline ? 'CLOUD LINK LOST // RETRYING' : 'AI ACTIVE // CLOUD'}
            </span>
            <span className="hud-tag">{fps.toFixed(1)} FPS</span>
            <span className="muted">
              {stats.offline ? <WifiOff size={13} /> : stats.latency != null ? `${stats.latency}ms` : <CloudUpload size={13} />}
            </span>
          </div>
          <div className="hud-grid">
            <div className="hud-chip">
              <div className="hud-chip-row">
                <span>{gps?.error ? <MapPinOff size={13} /> : <MapPin size={13} />} GPS</span>
                <span className={gps?.error ? 'tone-warning' : 'hud-accent'}>
                  {gps?.error || (gps?.accuracy != null ? `±${Math.round(gps.accuracy)}m ACC` : 'SEARCHING')}
                </span>
              </div>
              <div className="hud-chip-value">{gps?.lat != null ? `${gps.lat.toFixed(4)} · ${gps.lng.toFixed(4)}` : '—'}</div>
            </div>
            <div className="hud-chip">
              <div className="hud-chip-row">
                <span>
                  <Gauge size={13} /> SPEED
                </span>
                <span className="tone-warning">{stats.frames} FRAMES</span>
              </div>
              <div className="hud-chip-value">{speedKmh != null ? `${speedKmh} KM/H` : '— KM/H'}</div>
            </div>
          </div>
        </div>

        <div className="live-stage-wrap">
          <div className="live-stage" style={{ '--ar': aspect }}>
            <video ref={videoRef} muted playsInline autoPlay />
            {boxes.list.map((d, i) => (
              <BoundingBox key={`${boxes.at}-${i}`} bbox={d.bbox} type={d.damage_type} label={`${hudLabel(d.damage_type)} · ${formatPercent(d.confidence)}`} />
            ))}
            {paused && (
              <div className="live-paused">
                <Pause size={18} /> Scanning paused
              </div>
            )}
          </div>
        </div>

        <div className="hud-bottom">
          {toast && (
            <div className="hud-toast" role="status">
              <span className={`hud-toast-icon tone-bg-${severityOf(toast.type).tone}`}>
                <ShieldCheck size={20} />
              </span>
              <div>
                <strong>
                  {hudLabel(toast.type)} LOGGED <span className="hud-tag">NEW</span>
                </strong>
                <span>
                  {toast.lat != null ? `${toast.lat.toFixed(4)}, ${toast.lng.toFixed(4)}` : 'NO GPS'} · CONF {formatPercent(toast.confidence)}
                </span>
              </div>
              <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="hud-chip hud-trip">
            <span>
              <Route size={15} /> TRIP: <strong>{(distance / 1000).toFixed(2)} KM</strong>
            </span>
            <span>
              <TriangleAlert size={15} className="tone-warning" /> LOGGED: <strong className="tone-warning">{stats.events} HAZARDS</strong>
            </span>
          </div>

          <div className="hud-actions">
            <button type="button" className="hud-btn hud-btn-primary" onClick={finish} disabled={phase === 'ending'}>
              {phase === 'ending' ? <LoaderCircle size={18} className="spin" /> : <Square size={16} fill="currentColor" />}
              {phase === 'ending' ? 'SAVING…' : 'STOP & REVIEW'}
            </button>
            <button type="button" className="hud-btn" onClick={togglePause} disabled={phase === 'ending'}>
              {paused ? <Play size={18} className="hud-accent" /> : <Pause size={18} className="hud-accent" />}
              {paused ? 'RESUME' : 'PAUSE'}
            </button>
            <button type="button" className="hud-btn" onClick={() => setDimmed(true)}>
              <Moon size={18} className="tone-warning" />
              DIM
            </button>
          </div>
        </div>

        {dimmed && (
          <button type="button" className="live-dim" onClick={() => setDimmed(false)}>
            <span>
              <i className="live-dot" /> SCANNING · {stats.events} FOUND · TAP TO WAKE
            </span>
          </button>
        )}
      </div>
    )
  }

  if (phase === 'summary') return <LiveSummary videoId={session?.video_id} canReport={!isAdmin} onAgain={reset} />

  return (
    <div className="page live-setup">
      <section className="hero">
        <div>
          <p className="eyebrow">Live scan</p>
          <h1>Scan the road while you drive.</h1>
          <p className="hero-sub">
            Your phone only takes pictures. Detection runs in the cloud, so the phone stays cool and the battery lasts.
          </p>
        </div>
      </section>

      <ol className="live-steps">
        <li>
          <span className="stat-icon">
            <Smartphone size={17} />
          </span>
          <div>
            <strong>Mount the phone behind the windshield</strong>
            <p className="muted small">Rear camera facing the road, held steady in a mount. Landscape works best.</p>
          </div>
        </li>
        <li>
          <span className="stat-icon">
            <MapPin size={17} />
          </span>
          <div>
            <strong>Allow camera and location</strong>
            <p className="muted small">Location is attached to every detection so it can be reported straight away.</p>
          </div>
        </li>
        <li>
          <span className="stat-icon">
            <BatteryCharging size={17} />
          </span>
          <div>
            <strong>Plug in for long drives</strong>
            <p className="muted small">Tap DIM while driving. Scanning keeps going with a dark screen.</p>
          </div>
        </li>
      </ol>

      <div className="card live-start">
        <p className="eyebrow">Frames sent to the cloud</p>
        <div className="live-interval" role="radiogroup">
          {INTERVALS.map((o) => (
            <button
              key={o.ms}
              type="button"
              role="radio"
              aria-checked={intervalMs === o.ms}
              className={intervalMs === o.ms ? 'is-active' : ''}
              onClick={() => setIntervalMs(o.ms)}
            >
              <strong>{o.label}</strong>
              <span>{o.hint}</span>
            </button>
          ))}
        </div>
        {error && (
          <p className="tone-danger small" role="alert">
            {error}
          </p>
        )}
        <Button icon={phase === 'starting' ? LoaderCircle : Video} onClick={start} disabled={phase === 'starting'} className="live-start-btn">
          {phase === 'starting' ? 'Starting camera…' : 'Start live scan'}
        </Button>
        <p className="muted small">Don't operate the phone while driving.</p>
      </div>
    </div>
  )
}

function LiveSummary({ videoId, canReport, onAgain }) {
  const [events, setEvents] = useState(videoId ? null : [])
  const [error, setError] = useState(null)
  const [reported, setReported] = useState({}) // event_id -> report id | 'sending' | Error
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!videoId) return
    listLiveEvents(videoId)
      .then((evts) => {
        setEvents(evts)
        setSelected(evts[0] ?? null)
      })
      .catch((err) => setError(err.message))
  }, [videoId])

  const report = async (e) => {
    setReported((r) => ({ ...r, [e.id]: 'sending' }))
    try {
      const rep = await createReport({ event_id: e.id })
      setReported((r) => ({ ...r, [e.id]: rep.id }))
    } catch (err) {
      setReported((r) => ({ ...r, [e.id]: err }))
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Live scan finished</p>
          <h1>{events ? `${events.length} damage ${events.length === 1 ? 'spot' : 'spots'} found.` : 'Loading results…'}</h1>
          <p className="hero-sub">Each spot already has its GPS location. Send the ones that look right as reports.</p>
        </div>
        <Button icon={Video} onClick={onAgain}>
          New scan
        </Button>
      </section>

      {error && <p className="tone-danger small">{error}</p>}

      {selected && (
        <div className="card live-preview">
          <FrameThumb event={selected} showTime={false} />
        </div>
      )}

      {events?.length === 0 && (
        <div className="empty">
          <CircleCheck size={22} />
          <p>No road damage was detected on this drive.</p>
        </div>
      )}

      <ul className="detections">
        {events?.map((e) => {
          const st = reported[e.id]
          const hasGps = e.latitude != null && e.longitude != null
          const sev = severityOf(e.damage_type)
          return (
            <li key={e.id} className={`detection live-result ${selected?.id === e.id ? 'is-selected' : ''}`}>
              <button type="button" className="live-result-main" onClick={() => setSelected(e)}>
                <FrameThumb event={e} />
                <span className="detection-info">
                  <strong>
                    {damageLabel(e.damage_type)} <Badge tone={sev.tone}>{sev.label}</Badge>
                  </strong>
                  <span className="muted small mono">
                    CONF {formatPercent(e.confidence)} · {hasGps ? `${e.latitude.toFixed(5)}, ${e.longitude.toFixed(5)}` : 'NO GPS'}
                  </span>
                </span>
              </button>
              {canReport &&
                (typeof st === 'number' ? (
                  <Badge tone="success">Report #{st}</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => report(e)}
                    disabled={!hasGps || st === 'sending'}
                    title={st instanceof Error ? st.message : hasGps ? 'Send as report' : 'No GPS fix for this spot'}
                  >
                    {st === 'sending' ? 'Sending…' : st instanceof Error ? 'Retry' : 'Report'}
                  </Button>
                ))}
            </li>
          )
        })}
      </ul>

      <Link className="table-link back-link" to="/reports">
        <ArrowLeft size={14} /> My reports
      </Link>
    </div>
  )
}
