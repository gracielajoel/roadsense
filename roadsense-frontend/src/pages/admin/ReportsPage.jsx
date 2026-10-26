import Placeholder from '../../components/Placeholder'

export default function ReportsPage() {
  return (
    <Placeholder
      title="Reports"
      description="Citizen complaints, filterable by status."
      endpoints={['GET /reports?status=']}
    />
  )
}
