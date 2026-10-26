import { Upload } from 'lucide-react'
import { useState } from 'react'

// Area kosong sebelum ada video: bisa klik atau drag & drop file video.
export default function UploadDropzone({ onPick }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('video/')) onPick(file)
  }

  return (
    <label
      className={`dropzone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input type="file" accept="video/*" hidden onChange={(e) => e.target.files[0] && onPick(e.target.files[0])} />
      <span className="dropzone-icon">
        <Upload size={20} />
      </span>
      <strong>Drop road footage here</strong>
      <span className="muted small">or click to browse · MP4, MOV, WebM</span>
    </label>
  )
}
