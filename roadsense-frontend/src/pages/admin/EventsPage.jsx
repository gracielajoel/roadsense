import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents, updateEvent } from '../../api/events'
import FrameThumb from '../../components/inspection/FrameThumb'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import useFetch from '../../hooks/useFetch'
import { DAMAGE_TYPES } from '../../utils/constants'
import { formatLocation, formatPercent, formatTime } from '../../utils/format'

export default function EventsPage() {
  const { data, loading, error, reload } = useFetch(() => listEvents())
  const [type, setType] = useState('')
  const [actionError, setActionError] = useState(null)

  const correctType = async (id, damage_type) => {
    setActionError(null)
    try {
      await updateEvent(id, { damage_type })
      reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const events = [...(data || [])].reverse().filter((e) => !type || e.damage_type === type)

  return (
    <Card
      eyebrow="Admin dashboard"
      title="Detections"
      description="Every damage event the model found. Fix the damage type here if the model got it wrong."
      action={
        <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {Object.entries(DAMAGE_TYPES).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      }
    >
      {actionError && (
        <p className="tone-danger small" role="alert">
          {actionError}
        </p>
      )}
      <DataState loading={loading} error={error} onRetry={reload}>
        {events.length === 0 ? (
          <div className="empty">
            <p>No detections found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Evidence</th>
                  <th>Damage type</th>
                  <th>Confidence</th>
                  <th>Video</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>#{e.id}</td>
                    <td>
                      <FrameThumb event={e} showTime={false} />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={e.damage_type}
                        onChange={(ev) => correctType(e.id, ev.target.value)}
                        aria-label={`Damage type of event ${e.id}`}
                      >
                        {Object.entries(DAMAGE_TYPES).map(([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatPercent(e.confidence)}</td>
                    <td>
                      <Link className="table-link" to={`/admin/videos/${e.video_id}`}>
                        Video #{e.video_id} · {formatTime(e.timestamp_sec)}
                      </Link>
                    </td>
                    <td className="small">{formatLocation(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </Card>
  )
}
