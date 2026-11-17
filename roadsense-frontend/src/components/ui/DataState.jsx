import { LoaderCircle, TriangleAlert } from 'lucide-react'
import Button from './Button'

// Bungkus konten yang datang dari useFetch: tampilkan loading / error + tombol coba lagi.
export default function DataState({ loading, error, onRetry, children }) {
  if (loading) {
    return (
      <div className="empty">
        <LoaderCircle className="spin" size={22} />
        <p>Loading…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="empty">
        <TriangleAlert size={22} />
        <p className="tone-danger">{error.message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    )
  }
  return children
}
