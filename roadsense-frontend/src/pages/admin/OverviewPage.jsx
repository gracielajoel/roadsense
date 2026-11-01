import { CircleCheck, FileText, Film, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listReports } from '../../api/reports'
import { getStats } from '../../api/stats'
import ReportsTable from '../../components/admin/ReportsTable'
import BarList from '../../components/ui/BarList'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import StatCard from '../../components/ui/StatCard'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { STATUS_TONE } from '../../utils/constants'
import { damageLabel, formatPercent } from '../../utils/format'

export default function OverviewPage() {
  const stats = useFetch(getStats)
  const reports = useFetch(() => listReports())
  const nameOf = useUserNames()
  const s = stats.data

  return (
    <div className="page">
      <Card eyebrow="Admin dashboard" title="Overview" description="Live numbers from the RoadSense backend.">
        <DataState loading={stats.loading} error={stats.error} onRetry={stats.reload}>
          {s && (
            <div className="stats stats-4">
              <StatCard icon={Film} label="Videos" value={s.total_videos} />
              <StatCard icon={ScanLine} label="Detections" value={s.total_events} />
              <StatCard icon={FileText} label="Reports" value={s.total_reports} />
              <StatCard
                icon={CircleCheck}
                label="Completion rate"
                value={s.completion_rate == null ? '—' : formatPercent(s.completion_rate)}
                hint={s.completion_rate == null ? 'No reports yet' : `${s.by_status.Completed} completed`}
              />
            </div>
          )}
        </DataState>
      </Card>

      {s && (
        <div className="two-col">
          <Card eyebrow="Reports" title="By status">
            <BarList
              items={Object.entries(s.by_status).map(([label, value]) => ({
                label,
                value,
                tone: STATUS_TONE[label],
              }))}
            />
          </Card>
          <Card eyebrow="Reports" title="By damage type">
            <BarList
              items={Object.entries(s.by_damage_type).map(([code, value]) => ({
                label: damageLabel(code),
                value,
              }))}
            />
          </Card>
        </div>
      )}

      <Card
        eyebrow="Latest"
        title="Recent reports"
        action={
          <Link className="table-link" to="/admin/reports">
            View all
          </Link>
        }
      >
        <DataState loading={reports.loading} error={reports.error} onRetry={reports.reload}>
          <ReportsTable reports={(reports.data || []).slice(-5).reverse()} nameOf={nameOf} />
        </DataState>
      </Card>
    </div>
  )
}
