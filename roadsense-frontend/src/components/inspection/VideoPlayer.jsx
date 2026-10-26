import { Check, Image, LoaderCircle, Pause, Play, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { damageLabel, formatPercent, formatTime } from '../../utils/format'
import BoundingBox from './BoundingBox'

// Bounding box ditampilkan kalau posisi video dekat dengan timestamp event
const BBOX_WINDOW_SEC = 0.25

const PHASE_TEXT = {
  uploading: 'Uploading footage',
  processing: 'Scanning for damage',
  done: 'Analysis complete',
  failed: 'Analysis failed',
}

// videoRef dipegang parent supaya daftar deteksi bisa melompat ke detik tertentu.
export default function VideoPlayer({ src, filename, events, videoRef, phase, progress, error }) {
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [meta, setMeta] = useState({ duration: 0, width: 16, height: 9 })

  const active = events
    .filter((e) => e.bbox && Math.abs(e.timestamp_sec - time) <= BBOX_WINDOW_SEC)
    .sort((a, b) => Math.abs(a.timestamp_sec - time) - Math.abs(b.timestamp_sec - time))[0]

  const busy = phase === 'uploading' || phase === 'processing'

  const togglePlay = () => {
    const v = videoRef.current
    if (v.paused) v.play()
    else v.pause()
  }

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    videoRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * meta.duration
  }

  return (
    <div>
      <div className="player" style={{ aspectRatio: `${meta.width} / ${meta.height}` }}>
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onSeeked={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            setMeta({ duration: v.duration, width: v.videoWidth || 16, height: v.videoHeight || 9 })
          }}
        />

        {active && (
          <BoundingBox
            bbox={active.bbox}
            label={`${damageLabel(active.damage_type)} · ${formatPercent(active.confidence)}`}
          />
        )}

        {!busy && (
          <button type="button" className="player-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
        )}

        {busy && (
          <div className="player-overlay">
            <LoaderCircle className="spin" size={22} />
            <p>
              {PHASE_TEXT[phase]} · {progress}%
            </p>
            <div className="progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="player-bar">
          <span>{formatTime(time)}</span>
          <div className="player-track" onClick={seek}>
            <div style={{ width: `${meta.duration ? (time / meta.duration) * 100 : 0}%` }} />
            {events.map((e) => (
              <i key={e.id} style={{ left: `${meta.duration ? (e.timestamp_sec / meta.duration) * 100 : 0}%` }} />
            ))}
          </div>
          <span>{formatTime(meta.duration)}</span>
        </div>
      </div>

      <div className="file-meta">
        <span className="file-icon">
          <Image size={15} />
        </span>
        <div>
          <p className="file-name">{filename}</p>
          <p className="muted small">
            {formatTime(meta.duration)} · {meta.height > 9 ? `${meta.height}p` : '—'} · {error || PHASE_TEXT[phase]}
          </p>
        </div>
        <span className={`file-status ${phase === 'failed' ? 'tone-danger' : ''}`}>
          {phase === 'done' && (
            <>
              <Check size={14} /> Ready
            </>
          )}
          {busy && 'Processing'}
          {phase === 'failed' && (
            <>
              <TriangleAlert size={14} /> Failed
            </>
          )}
        </span>
      </div>
    </div>
  )
}
