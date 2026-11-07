import { CircleCheck, FileText, Hammer, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports } from '../api/reports'
import { getStats } from '../api/stats'
import FrameThumb from '../components/inspection/FrameThumb'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import DataState from '../components/ui/DataState'
import StatCard from '../components/ui/StatCard'
import { fileUrl, USE_MOCK } from '../config'
import useFetch from '../hooks/useFetch'
import { REPORT_STATUSES, STATUS_TONE, severityOf } from '../utils/constants'
import { damageLabel, formatDateTime, formatLocation, formatPercent, mapUrl } from '../utils/format'

// Bahasa warga untuk tiap status (Figma 05: "Civic Repair Lifecycle")
const STATUS_TEXT = {
  New: 'Sent · waiting for review',
  Verified: 'Verified by the city · repair queued',
  'In Progress': 'Repair crew working on it',
  Completed: 'Repaired by the city',
  Rejected: 'Not accepted',
}

export default function MyReportsPage() {
  const reports = useFetch(() => listReports())
  const stats = useFetch(() => (USE_MOCK ? Promise.resolve(null) : getStats()))
  const [filter, setFilter] = useState('All')

  const all = [...(reports.data || [])].reverse()
  const count = (s) => all.filter((r) => r.status === s).length
  const shown = filter === 'All' ? all : all.filter((r) => r.status === filter)
  const s = stats.data

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">My hazard reports</p>
          <h1>Follow your reports to repair.</h1>
          <p className="hero-sub">Every report you send goes to the city for review. Track it here until it is patched.</p>
        </div>
      </section>

      <section className="stats stats-4">
        <StatCard icon={ScanLine} label="Detections" value={s ? s.total_events : '—'} hint={s ? `${s.total_videos} scans` : null} />
        <StatCard icon={FileText} label="Reported" value={all.length} />
        <StatCard icon={Hammer} label="In repair" value={count('Verified') + count('In Progress')} hintTone="warning" />
        <StatCard icon={CircleCheck} label="Repaired" value={count('Completed')} hint={all.length ? formatPercent(count('Completed') / all.length) : null} hintTone="success" />
      </section>

      <Card eyebrow="Civic repair lifecycle" title="Reports" action={<span className="muted small mono">{all.length} TOTAL</span>}>
        <div className="filter-tabs" role="tablist">
          {['All', ...REPORT_STATUSES].map((st) => (
            <button key={st} type="button" role="tab" aria-selected={filter === st} className={filter === st ? 'is-active' : ''} onClick={() => setFilter(st)}>
              {st} ({st === 'All' ? all.length : count(st)})
            </button>
          ))}
        </div>

        <DataState loading={reports.loading} error={reports.error} onRetry={reports.reload}>
          {shown.length === 0 ? (
            <div className="empty">
              <p>{all.length ? 'No reports with this status.' : 'You have not sent any reports yet.'}</p>
              <Link className="table-link" to="/live">
                Start a live scan
              </Link>
            </div>
          ) : (
            <ul className="hazard-list">
              {shown.map((r) => (
                <HazardCard key={r.id} report={r} />
              ))}
            </ul>
          )}
        </DataState>
      </Card>
    </div>
  )
}

function HazardCard({ report: r }) {
  const e = r.event
  const sev = e ? severityOf(e.damage_type) : null
  return (
    <li className="hazard-card">
      <header>
        <span className="hz-id">HZ-{String(r.id).padStart(4, '0')}</span>
        <strong>{e ? damageLabel(e.damage_type) : 'Report'}</strong>
        {sev && <Badge tone={sev.tone}>{sev.label}</Badge>}
        <span className="hazard-status">
          <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
          <span className="muted small">{STATUS_TEXT[r.status]}</span>
        </span>
      </header>

      {r.after_photo_url && e ? (
        <div className="before-after">
          <figure>
            <FrameThumb event={e} showTime={false} />
            <figcaption>BEFORE · AI DETECTION</figcaption>
          </figure>
          <figure>
            <div className="thumb">
              <img src={fileUrl(r.after_photo_url)} alt="After repair" />
            </div>
            <figcaption>AFTER · CITY REPAIR</figcaption>
          </figure>
        </div>
      ) : (
        e && (
          <div className="hazard-evidence">
            <FrameThumb event={e} showTime={false} />
          </div>
        )
      )}

      <dl className="hazard-meta">
        <div>
          <dt>Classification</dt>
          <dd>{e ? damageLabel(e.damage_type) : '—'}</dd>
        </div>
        <div>
          <dt>GNSS coordinates</dt>
          <dd>
            {e?.latitude != null ? (
              <a className="table-link" href={mapUrl(e)} target="_blank" rel="noreferrer">
                {formatLocation(e)}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Reported</dt>
          <dd>{formatDateTime(r.created_at)}</dd>
        </div>
        <div>
          <dt>AI confidence</dt>
          <dd>{e ? formatPercent(e.confidence) : '—'}</dd>
        </div>
      </dl>
    </li>
  )
}
