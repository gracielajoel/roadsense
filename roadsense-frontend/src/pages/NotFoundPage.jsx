import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'

export default function NotFoundPage() {
  return (
    <div className="page">
      <Card eyebrow="404" title="Page not found">
        <p className="muted">
          <Link to="/">Back to the citizen app</Link>
        </p>
      </Card>
    </div>
  )
}
