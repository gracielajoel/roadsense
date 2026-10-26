import { useState } from 'react'
import { fileUrl } from '../../config'
import { formatTime } from '../../utils/format'
import BoundingBox from './BoundingBox'

// Thumbnail frame kerusakan. Pakai foto evidence dari backend kalau ada & bisa dimuat,
// kalau tidak ambil frame langsung dari video di detik timestamp_sec.
export default function FrameThumb({ event, videoSrc, showTime = true }) {
  const [evidenceBroken, setEvidenceBroken] = useState(false)
  const evidence = !evidenceBroken && fileUrl(event.evidence_url)

  return (
    <div className="thumb">
      {evidence ? (
        <img src={evidence} alt="" onError={() => setEvidenceBroken(true)} />
      ) : (
        videoSrc && <video src={`${videoSrc}#t=${event.timestamp_sec}`} preload="metadata" muted playsInline />
      )}
      <BoundingBox bbox={event.bbox} />
      {showTime && <span className="thumb-time">{formatTime(event.timestamp_sec)}</span>}
    </div>
  )
}
