import { Link } from 'react-router-dom'
import { STATUS_TONE } from '../../utils/constants'
import { damageLabel, formatDateTime, formatLocation, formatPercent } from '../../utils/format'
import FrameThumb from '../inspection/FrameThumb'
import Badge from '../ui/Badge'

export default function ReportsTable({ reports, nameOf }) {
  if (!reports.length) {
    return (
      <div className="empty">
        <p>No reports found.</p>
      </div>
    )
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Report</th>
            <th>Evidence</th>
            <th>Damage</th>
            <th>Location</th>
            <th>Reporter</th>
            <th>Status</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>#{r.id}</td>
              <td>{r.event && <FrameThumb event={r.event} showTime={false} />}</td>
              <td>
                <strong>{r.event ? damageLabel(r.event.damage_type) : '—'}</strong>
                {r.event && <div className="muted small">{formatPercent(r.event.confidence)} confidence</div>}
              </td>
              <td className="small">{formatLocation(r.event)}</td>
              <td>{nameOf(r.user_id)}</td>
              <td>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </td>
              <td className="small">{formatDateTime(r.created_at)}</td>
              <td>
                <Link className="table-link" to={`/admin/reports/${r.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
