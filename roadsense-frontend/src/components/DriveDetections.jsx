import { CircleCheck, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { severityOf } from '../utils/constants'
import { damageLabel, formatPercent, formatTime, mapUrl } from '../utils/format'
import FrameThumb from './inspection/FrameThumb'
import Badge from './ui/Badge'

// Daftar kerusakan dari satu perjalanan: frame terpilih di atas, daftar di bawah.
// Dipakai di ringkasan setelah scan dan di halaman History.
export default function DriveDetections({ events }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = events.find((e) => e.id === selectedId) || events[0]

  if (!events.length) {
    return (
      <div className="empty">
        <CircleCheck size={22} />
        <p>No road damage was detected on this drive.</p>
      </div>
    )
  }

  return (
    <div className="drive-detections">
      <div className="card live-preview">
        <FrameThumb event={selected} showTime={false} />
      </div>
      <ul className="detections">
        {events.map((e) => {
          const sev = severityOf(e.damage_type)
          const hasGps = e.latitude != null && e.longitude != null
          return (
            <li key={e.id} className={`detection live-result ${selected.id === e.id ? 'is-selected' : ''}`}>
              <button type="button" className="live-result-main" onClick={() => setSelectedId(e.id)}>
                <FrameThumb event={e} />
                <span className="detection-info">
                  <strong>
                    {damageLabel(e.damage_type)} <Badge tone={sev.tone}>{sev.label}</Badge>
                  </strong>
                  <span className="muted small mono">
                    {formatTime(e.timestamp_sec)} · CONF {formatPercent(e.confidence)}
                  </span>
                </span>
              </button>
              {hasGps && (
                <a className="table-link drive-map" href={mapUrl(e)} target="_blank" rel="noreferrer" title="Open location on the map">
                  Map <ExternalLink size={12} />
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
