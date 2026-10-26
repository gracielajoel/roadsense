// Kotak deteksi di atas frame. bbox = [x, y, lebar, tinggi] relatif 0-1.
export default function BoundingBox({ bbox, label }) {
  if (!bbox) return null
  const [x, y, w, h] = bbox
  return (
    <div
      className="bbox"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
    >
      {label && <span className="bbox-label">{label}</span>}
    </div>
  )
}
