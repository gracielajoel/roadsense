import { severityOf } from '../../utils/constants'

// Kotak deteksi di atas frame. bbox = [x, y, lebar, tinggi] relatif 0-1.
// Warna mengikuti tingkat keparahan jenis kerusakan (merah = SEV-1, kuning = SEV-2).
export default function BoundingBox({ bbox, label, type }) {
  if (!bbox) return null
  const [x, y, w, h] = bbox
  const tone = type ? severityOf(type).tone : 'danger'
  return (
    <div
      className={`bbox bbox-${tone}`}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
    >
      {label && <span className="bbox-label">{label}</span>}
    </div>
  )
}
