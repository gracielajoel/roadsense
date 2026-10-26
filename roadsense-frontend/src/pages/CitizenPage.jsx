import { FileText, Gauge, ScanLine, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createReport, listReports } from '../api/reports'
import { getJob, listVideoEvents, listVideos, uploadVideo } from '../api/videos'
import ComplaintForm from '../components/inspection/ComplaintForm'
import DetectionList from '../components/inspection/DetectionList'
import UploadDropzone from '../components/inspection/UploadDropzone'
import VideoPlayer from '../components/inspection/VideoPlayer'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import { DEMO_USER_ID, fileUrl } from '../config'
import { formatPercent } from '../utils/format'
import { averageConfidence, confidenceLabel, roadConditionLabel, roadConditionScore } from '../utils/inspection'

const POLL_MS = 1000
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function CitizenPage() {
  const [video, setVideo] = useState(null) // { id, src, filename }
  const [phase, setPhase] = useState('idle') // idle | uploading | processing | done | failed
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [reports, setReports] = useState({}) // event_id -> report_id
  const [loadError, setLoadError] = useState(null)

  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const runRef = useRef(0) // abaikan hasil upload lama kalau user sudah upload video baru

  // Saat dibuka: tampilkan video terakhir beserta hasil deteksi & report yang sudah ada
  useEffect(() => {
    const run = runRef.current
    ;(async () => {
      const videos = await listVideos()
      const latest = videos.at(-1)
      if (!latest) return
      const [evts, reportList] = await Promise.all([listVideoEvents(latest.id), listReports()])
      if (run !== runRef.current) return // user sudah upload video lain
      setVideo({ id: latest.id, src: fileUrl(latest.path), filename: latest.filename })
      setEvents(evts)
      setSelectedId(evts[0]?.id ?? null)
      setReports(Object.fromEntries(reportList.map((r) => [r.event_id, r.id])))
      setPhase('done')
    })().catch((err) => setLoadError(err.message))
  }, [])

  // Lepas object URL video lokal saat diganti / halaman ditutup
  useEffect(() => {
    const src = video?.src
    return () => src?.startsWith('blob:') && URL.revokeObjectURL(src)
  }, [video?.src])

  const analyze = async (file) => {
    const run = ++runRef.current
    const stale = () => run !== runRef.current

    setVideo({ id: null, src: URL.createObjectURL(file), filename: file.name })
    setEvents([])
    setSelectedId(null)
    setError(null)
    setProgress(0)
    setPhase('uploading')

    try {
      const { video_id, job_id } = await uploadVideo(file, (e) => {
        if (!stale() && e.total) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      if (stale()) return
      setVideo((v) => ({ ...v, id: video_id }))
      setPhase('processing')
      setProgress(0)

      for (;;) {
        const job = await getJob(job_id)
        if (stale()) return
        setProgress(job.progress)
        if (job.status === 'done') break
        if (job.status === 'failed') throw new Error(job.error || 'Analysis failed')
        await wait(POLL_MS)
      }

      const evts = await listVideoEvents(video_id)
      if (stale()) return
      setEvents(evts)
      setSelectedId(evts[0]?.id ?? null)
      setPhase('done')
    } catch (err) {
      if (stale()) return
      setError(err.message)
      setPhase('failed')
    }
  }

  const pickFile = () => fileInputRef.current?.click()

  const selectEvent = (event) => {
    setSelectedId(event.id)
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = event.timestamp_sec
    }
  }

  const submitComplaint = async (form) => {
    const report = await createReport({ event_id: selectedId, user_id: DEMO_USER_ID, ...form })
    setReports((r) => ({ ...r, [selectedId]: report.id }))
  }

  const selected = events.find((e) => e.id === selectedId) || null
  const done = phase === 'done'
  const score = roadConditionScore(events)
  const condition = roadConditionLabel(score)
  const avgConfidence = averageConfidence(events)
  const busy = phase === 'uploading' || phase === 'processing'

  return (
    <div className="page">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          if (e.target.files[0]) analyze(e.target.files[0])
          e.target.value = ''
        }}
      />

      <section className="hero">
        <div>
          <p className="eyebrow">AI road inspection</p>
          <h1>Find damage. Build a better road.</h1>
          <p className="hero-sub">Upload footage, review exact detections, and send a complete complaint in one place.</p>
        </div>
        <Button icon={Upload} onClick={pickFile} disabled={busy}>
          Upload new video
        </Button>
      </section>

      <section className="stats">
        <StatCard
          icon={ScanLine}
          label="Issues detected"
          value={done ? String(events.length).padStart(2, '0') : '—'}
          hint={done ? 'Analysis complete' : busy ? 'Scanning…' : 'Awaiting video'}
        />
        <StatCard
          icon={FileText}
          label="Road condition"
          value={done ? score : '—'}
          suffix={done ? '/100' : null}
          hint={done ? condition.text : null}
          hintTone={condition.tone}
        />
        <StatCard
          icon={Gauge}
          label="AI confidence"
          value={done && events.length ? formatPercent(avgConfidence) : '—'}
          hint={done && events.length ? confidenceLabel(avgConfidence) : null}
        />
      </section>

      <div className="inspection-grid">
        <Card
          eyebrow="01 · Upload & Scan"
          title="Road inspection footage"
          action={
            video && (
              <Button variant="secondary" icon={Upload} onClick={pickFile} disabled={busy}>
                Replace
              </Button>
            )
          }
        >
          {video ? (
            <VideoPlayer
              key={video.src}
              src={video.src}
              filename={video.filename}
              events={events}
              videoRef={videoRef}
              phase={phase}
              progress={progress}
              error={error}
            />
          ) : (
            <>
              <UploadDropzone onPick={analyze} />
              {loadError && <p className="tone-danger small load-error">Could not reach the server: {loadError}</p>}
            </>
          )}
        </Card>

        <Card
          eyebrow="02 · Detection results"
          title="Exact damage frames"
          description="Select a frame to jump to the exact moment damage was detected."
          action={done && <Badge tone="success">{events.length} found</Badge>}
        >
          <DetectionList
            events={events}
            selectedId={selectedId}
            onSelect={selectEvent}
            videoSrc={video?.src}
            phase={phase}
          />
        </Card>
      </div>

      <Card>
        <ComplaintForm
          key={selectedId}
          event={selected}
          videoSrc={video?.src}
          reportId={reports[selectedId]}
          onSubmit={submitComplaint}
        />
      </Card>
    </div>
  )
}
