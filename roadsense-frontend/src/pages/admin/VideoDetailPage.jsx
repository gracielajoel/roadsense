import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVideo, listJobs, listVideoEvents } from '../../api/videos'
import DetectionList from '../../components/inspection/DetectionList'
import VideoPlayer from '../../components/inspection/VideoPlayer'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import { fileUrl } from '../../config'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { formatDateTime } from '../../utils/format'

export default function VideoDetailPage() {
  const { id } = useParams()
  const video = useFetch(() => getVideo(id), [id])
  const events = useFetch(() => listVideoEvents(id), [id])
  const jobs = useFetch(() => listJobs({ video_id: id }), [id])
  const nameOf = useUserNames()
  const videoRef = useRef(null)
  const [selectedId, setSelectedId] = useState(null)

  const v = video.data
  const evts = events.data || []
  const job = (jobs.data || []).at(-1)
  const phase = !job || job.status === 'done' ? 'done' : job.status === 'failed' ? 'failed' : 'processing'
  const src = v ? fileUrl(v.url || v.path) : null

  const select = (event) => {
    setSelectedId(event.id)
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = event.timestamp_sec
    }
  }

  return (
    <div className="page">
      <Link className="table-link back-link" to="/admin/videos">
        <ArrowLeft size={14} /> All videos
      </Link>

      <DataState loading={video.loading} error={video.error} onRetry={video.reload}>
        {v && (
          <div className="inspection-grid">
            <Card
              eyebrow={`Video #${v.id}`}
              title={v.filename}
              description={`Uploaded by ${nameOf(v.user_id)} · ${formatDateTime(v.created_at)}`}
              action={
                job && <Badge tone={phase === 'done' ? 'success' : phase === 'failed' ? 'danger' : 'warning'}>{job.status}</Badge>
              }
            >
              <VideoPlayer
                key={v.id}
                src={src}
                filename={v.filename}
                events={evts}
                videoRef={videoRef}
                phase={phase}
                progress={job?.progress ?? 100}
                error={job?.error}
              />
            </Card>

            <Card
              eyebrow="Detection results"
              title="Damage found"
              description="Select a frame to jump to that moment."
              action={<Badge tone="info">{evts.length} found</Badge>}
            >
              <DetectionList events={evts} selectedId={selectedId} onSelect={select} videoSrc={src} phase={phase} />
            </Card>
          </div>
        )}
      </DataState>
    </div>
  )
}
