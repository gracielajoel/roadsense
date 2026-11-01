import { useState } from 'react'
import { listReports } from '../../api/reports'
import ReportsTable from '../../components/admin/ReportsTable'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { REPORT_STATUSES } from '../../utils/constants'

export default function ReportsPage() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useFetch(() => listReports(status ? { status } : undefined), [status])
  const nameOf = useUserNames()

  return (
    <Card
      eyebrow="Admin dashboard"
      title="Reports"
      description="Citizen complaints. Open a report to verify it and track the repair."
      action={
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
    >
      <DataState loading={loading} error={error} onRetry={reload}>
        <ReportsTable reports={[...(data || [])].reverse()} nameOf={nameOf} />
      </DataState>
    </Card>
  )
}
