import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVideo, listJobs, listVideoEvents } from '../../api/videos'
import BoundingBox from '../../components/inspection/BoundingBox'
import DetectionList from '../../components/inspection/DetectionList'
import VideoPlayer from '../../components/inspection/VideoPlayer'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import { fileUrl } from '../../config'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { severityOf } from '../../utils/constants'
import { damageLabel, formatDateTime, formatLocation, formatPercent, formatTime, mapUrl } from '../../utils/format'

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
  const src = v && !v.is_live ? fileUrl(v.url || v.path) : null
  const selected = evts.find((e) => e.id === selectedId) || evts[0] || null

  const select = (event) => {
    setSelectedId(event.id)
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = event.timestamp_sec
    }
  }

  const statusBadge = job && (
    <Badge tone={phase === 'done' ? 'success' : phase === 'failed' ? 'danger' : 'warning'}>
      {v?.is_live && phase === 'processing' ? 'scanning' : job.status}
    </Badge>
  )

  return (
    <div className="page">
      <Link className="table-link back-link" to="/admin/videos">
        <ArrowLeft size={14} /> All scans & videos
      </Link>

      <DataState loading={video.loading} error={video.error} onRetry={video.reload}>
        {v && (
          <div className="inspection-grid">
            {v.is_live ? (
              <Card
                eyebrow={`Live scan #${v.id}`}
                title={v.filename}
                description={`Scanned by ${nameOf(v.user_id)} · ${formatDateTime(v.created_at)}`}
                action={statusBadge}
              >
                {selected ? (
                  <>
                    <div className="inspect-frame">
                      {selected.evidence_url ? (
                        <img src={fileUrl(selected.evidence_url)} alt="Evidence frame" />
                      ) : (
                        <div className="inspect-noimg muted small">No evidence image</div>
                      )}
                      <BoundingBox
                        bbox={selected.bbox}
                        type={selected.damage_type}
                        label={`${damageLabel(selected.damage_type)} · ${formatPercent(selected.confidence)}`}
                      />
                    </div>
                    <dl className="metric-rows">
                      <div>
                        <dt>Severity</dt>
                        <dd>
                          <Badge tone={severityOf(selected.damage_type).tone}>{severityOf(selected.damage_type).label}</Badge>
                        </dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>
                          {selected.latitude != null ? (
                            <a className="table-link" href={mapUrl(selected)} target="_blank" rel="noreferrer">
                              {formatLocation(selected)} <ExternalLink size={11} />
                            </a>
                          ) : (
                            'No GPS fix'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Seen at</dt>
                        <dd>{formatTime(selected.timestamp_sec)} into the drive</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <div className="empty">
                    <p>{phase === 'processing' ? 'Scan in progress. Detections appear here as they come in.' : 'No damage detected on this drive.'}</p>
                  </div>
                )}
              </Card>
            ) : (
              <Card
                eyebrow={`Video #${v.id}`}
                title={v.filename}
                description={`Uploaded by ${nameOf(v.user_id)} · ${formatDateTime(v.created_at)}`}
                action={statusBadge}
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
            )}

            <Card
              eyebrow="Detection results"
              title="Damage found"
              description={v.is_live ? 'Select a detection to see its frame.' : 'Select a frame to jump to that moment.'}
              action={<Badge tone="info">{evts.length} found</Badge>}
            >
              <DetectionList
                events={evts}
                selectedId={selected?.id}
                onSelect={select}
                videoSrc={src}
                phase={v.is_live ? 'done' : phase}
              />
            </Card>
          </div>
        )}
      </DataState>
    </div>
  )
}
