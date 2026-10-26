import { Construction } from 'lucide-react'
import Card from './ui/Card'

// Halaman yang belum dikerjakan: tampilkan judul + endpoint yang nanti dipakai.
export default function Placeholder({ eyebrow = 'Admin dashboard', title, description, endpoints = [] }) {
  return (
    <Card eyebrow={eyebrow} title={title} description={description}>
      <div className="empty">
        <Construction size={22} />
        <p>This page is not built yet.</p>
        {endpoints.length > 0 && (
          <p className="muted small">
            {endpoints.map((e) => (
              <code key={e}>{e}</code>
            ))}
          </p>
        )}
      </div>
    </Card>
  )
}
