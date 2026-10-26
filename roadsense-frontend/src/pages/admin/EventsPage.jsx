import Placeholder from '../../components/Placeholder'

export default function EventsPage() {
  return (
    <Placeholder
      title="Detections"
      description="All damage events with evidence photos."
      endpoints={['GET /events', 'PATCH /events/{id}']}
    />
  )
}
