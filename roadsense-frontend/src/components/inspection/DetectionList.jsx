import { ArrowRight, ScanSearch } from 'lucide-react'
import { damageLabel, formatPercent } from '../../utils/format'
import FrameThumb from './FrameThumb'

export default function DetectionList({ events, selectedId, onSelect, videoSrc, phase }) {
  if (phase === 'uploading' || phase === 'processing') {
    return (
      <ul className="detections">
        {[0, 1, 2].map((i) => (
          <li key={i} className="detection is-skeleton" />
        ))}
      </ul>
    )
  }

  if (!events.length) {
    return (
      <div className="empty">
        <ScanSearch size={22} />
        <p>{phase === 'done' ? 'No road damage detected in this footage.' : 'Upload a video to see detected damage here.'}</p>
      </div>
    )
  }

  return (
    <ul className="detections">
      {events.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            className={`detection ${e.id === selectedId ? 'is-selected' : ''}`}
            onClick={() => onSelect(e)}
          >
            <FrameThumb event={e} videoSrc={videoSrc} />
            <span className="detection-info">
              <strong>{damageLabel(e.damage_type)}</strong>
              <span className="muted small">{e.frame != null ? `Frame ${e.frame} · Road damage` : 'Road damage'}</span>
            </span>
            <span className="detection-score">
              <strong>{formatPercent(e.confidence)}</strong> <span className="muted small">confidence</span>
            </span>
            <ArrowRight size={15} className="detection-arrow" />
          </button>
        </li>
      ))}
    </ul>
  )
}
