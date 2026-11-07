import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents } from '../../api/events'
import { deleteVideo, listJobs, listVideos } from '../../api/videos'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { JOB_TONE } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'

export default function VideosPage() {
  const videos = useFetch(listVideos)
  const jobs = useFetch(() => listJobs())
  const events = useFetch(() => listEvents())
  const nameOf = useUserNames()
  const [actionError, setActionError] = useState(null)

  const jobOf = Object.fromEntries((jobs.data || []).map((j) => [j.video_id, j])) // job terakhir menimpa
  const countOf = {}
  for (const e of events.data || []) countOf[e.video_id] = (countOf[e.video_id] || 0) + 1

  const remove = async (v) => {
    if (!window.confirm(`Delete "${v.filename}" and all its detections?`)) return
    setActionError(null)
    try {
      await deleteVideo(v.id)
      videos.reload()
      jobs.reload()
      events.reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const rows = [...(videos.data || [])].reverse()

  return (
    <Card eyebrow="Admin dashboard" title="Scans & videos" description="Live phone scans and uploaded footage, and how the analysis went.">
      {actionError && (
        <p className="tone-danger small" role="alert">
          {actionError}
        </p>
      )}
      <DataState loading={videos.loading} error={videos.error} onRetry={videos.reload}>
        {rows.length === 0 ? (
          <div className="empty">
            <p>No scans or videos yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Source</th>
                  <th>File</th>
                  <th>Uploaded by</th>
                  <th>Uploaded</th>
                  <th>Analysis</th>
                  <th>Detections</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const job = jobOf[v.id]
                  return (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td>
                        <Badge tone={v.is_live ? 'success' : 'neutral'}>{v.is_live ? 'Live scan' : 'Upload'}</Badge>
                      </td>
                      <td className="cell-file">{v.filename}</td>
                      <td>{nameOf(v.user_id)}</td>
                      <td className="small">{formatDateTime(v.created_at)}</td>
                      <td>
                        {job ? (
                          <Badge tone={JOB_TONE[job.status]}>
                            {job.status === 'processing' ? (v.is_live ? 'scanning' : `processing ${job.progress}%`) : job.status}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{countOf[v.id] || 0}</td>
                      <td className="cell-actions">
                        <Link className="table-link" to={`/admin/videos/${v.id}`}>
                          View
                        </Link>
                        <Button variant="ghost" onClick={() => remove(v)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </Card>
  )
}
