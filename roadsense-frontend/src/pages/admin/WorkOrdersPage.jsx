import { ArrowRight, CircleCheck, ClipboardList, Hammer, Timer, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports, updateReport } from '../../api/reports'
import FrameThumb from '../../components/inspection/FrameThumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataState from '../../components/ui/DataState'
import StatCard from '../../components/ui/StatCard'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { severityOf } from '../../utils/constants'
import { damageLabel, formatLocation, formatPercent } from '../../utils/format'
import { timeAgo } from '../../utils/geo'

// Figma 07 "Work Orders & Maintenance Kanban". Kolom = status report di backend.
// Selesai (Completed) wajib foto after-repair, jadi tombolnya membuka halaman detail.
const COLUMNS = [
  { status: 'New', title: 'Awaiting triage', tone: 'neutral' },
  { status: 'Verified', title: 'Approved · ready', tone: 'warning' },
  { status: 'In Progress', title: 'Work in progress', tone: 'success' },
  { status: 'Completed', title: 'Done · repaired', tone: 'success' },
]

export default function WorkOrdersPage() {
  const reports = useFetch(() => listReports())
  const nameOf = useUserNames()
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const all = reports.data || []
  const by = (s) =>
    all
      .filter((r) => r.status === s)
      .sort((a, b) => severityOf(a.event?.damage_type).level - severityOf(b.event?.damage_type).level || b.id - a.id)
  const open = all.filter((r) => r.status === 'Verified' || r.status === 'In Progress')
  const sev1Open = open.filter((r) => severityOf(r.event?.damage_type).level === 1).length
  const done = by('Completed').length
  const decided = all.filter((r) => r.status !== 'New').length

  const startWork = async (r) => {
    setBusyId(r.id)
    setActionError(null)
    try {
      await updateReport(r.id, { status: 'In Progress', note: 'Crew assigned from work-order board' })
      reports.reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="page-title">
        <div>
          <p className="eyebrow">Maintenance</p>
          <h1>
            <i className="live-dot" /> Work orders
          </h1>
        </div>
        <Link className="btn btn-secondary" to="/admin/triage">
          Open triage queue
        </Link>
      </header>

      <div className="stats stats-4">
        <StatCard icon={ClipboardList} label="Active work orders" value={open.length} hint={`${by('In Progress').length} in progress`} />
        <StatCard icon={TriangleAlert} label="SEV-1 open" value={sev1Open} hintTone={sev1Open ? 'warning' : 'success'} hint={sev1Open ? 'Potholes first' : 'All clear'} />
        <StatCard icon={CircleCheck} label="Repaired" value={done} hintTone="success" hint={decided ? `${formatPercent(done / decided)} of triaged` : null} />
        <StatCard icon={Timer} label="Awaiting triage" value={by('New').length} />
      </div>

      {actionError && (
        <p className="tone-danger small" role="alert">
          {actionError}
        </p>
      )}

      <DataState loading={reports.loading} error={reports.error} onRetry={reports.reload}>
        <div className="kanban">
          {COLUMNS.map((col) => {
            const items = by(col.status)
            return (
              <section key={col.status} className="kanban-col">
                <header>
                  <span>
                    <i className={`dot dot-${col.tone}`} /> {col.title}
                  </span>
                  <span className="kanban-count">{items.length}</span>
                </header>
                {items.length === 0 && <p className="muted small kanban-empty">Nothing here.</p>}
                {items.map((r) => {
                  const sev = severityOf(r.event?.damage_type)
                  return (
                    <article key={r.id} className="wo-card">
                      <div className="wo-top">
                        <span className="hz-id">WO-{String(r.id).padStart(4, '0')}</span>
                        <Badge tone={sev.tone}>{sev.label}</Badge>
                      </div>
                      <strong>{r.event ? damageLabel(r.event.damage_type) : 'Report'}</strong>
                      <span className="muted small mono">{formatLocation(r.event)}</span>
                      {r.event && col.status !== 'New' && <FrameThumb event={r.event} showTime={false} />}
                      <dl className="wo-meta">
                        <dt>Reporter</dt>
                        <dd>{nameOf(r.user_id)}</dd>
                        <dt>Confidence</dt>
                        <dd>{formatPercent(r.event?.confidence)}</dd>
                        <dt>Reported</dt>
                        <dd>{timeAgo(r.created_at)}</dd>
                      </dl>
                      <div className="wo-actions">
                        {col.status === 'New' && (
                          <Link className="table-link" to="/admin/triage">
                            Triage <ArrowRight size={12} />
                          </Link>
                        )}
                        {col.status === 'Verified' && (
                          <Button variant="secondary" icon={Hammer} onClick={() => startWork(r)} disabled={busyId === r.id}>
                            {busyId === r.id ? 'Starting…' : 'Start repair'}
                          </Button>
                        )}
                        {col.status === 'In Progress' && (
                          <Link className="btn btn-primary" to={`/admin/reports/${r.id}`}>
                            {r.after_photo_url ? 'Close order' : 'Add after photo'}
                          </Link>
                        )}
                        {col.status === 'Completed' && (
                          <span className="small hud-accent">
                            <CircleCheck size={12} /> Repaired
                          </span>
                        )}
                        <Link className="table-link" to={`/admin/reports/${r.id}`}>
                          Details
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </section>
            )
          })}
        </div>
      </DataState>
    </>
  )
}
