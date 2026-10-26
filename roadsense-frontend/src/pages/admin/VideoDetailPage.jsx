import { useParams } from 'react-router-dom'
import Placeholder from '../../components/Placeholder'

export default function VideoDetailPage() {
  const { id } = useParams()
  return (
    <Placeholder
      title={`Video #${id}`}
      description="Video detail and the damage detected in it."
      endpoints={['GET /videos/{id}', 'GET /videos/{id}/events']}
    />
  )
}
