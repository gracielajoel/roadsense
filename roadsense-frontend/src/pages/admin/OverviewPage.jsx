import { getHealth } from '../../api/health'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { API_URL, USE_MOCK } from '../../config'
import useFetch from '../../hooks/useFetch'

export default function OverviewPage() {
  const { data, loading, error } = useFetch(getHealth)

  const status = loading ? (
    <Badge>Checking…</Badge>
  ) : error ? (
    <Badge tone="danger">Offline</Badge>
  ) : (
    <Badge tone="success">{data.status}</Badge>
  )

  return (
    <Card eyebrow="Admin dashboard" title="Overview" description="Connection status to the RoadSense backend.">
      <dl className="kv">
        <dt>API</dt>
        <dd>
          <code>{API_URL}</code>
        </dd>
        <dt>Backend</dt>
        <dd>
          {status} {error && <span className="muted small">{error.message}</span>}
        </dd>
        <dt>Data mode</dt>
        <dd>{USE_MOCK ? <Badge tone="warning">Demo data (VITE_USE_MOCK=true)</Badge> : <Badge tone="info">Live backend</Badge>}</dd>
      </dl>
    </Card>
  )
}
