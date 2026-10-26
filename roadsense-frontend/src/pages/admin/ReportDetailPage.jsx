import { useParams } from 'react-router-dom'
import Placeholder from '../../components/Placeholder'

export default function ReportDetailPage() {
  const { id } = useParams()
  return (
    <Placeholder
      title={`Report #${id}`}
      description="Report detail, status changes, and status history."
      endpoints={['GET /reports/{id}', 'GET /reports/{id}/history', 'PATCH /reports/{id}']}
    />
  )
}
