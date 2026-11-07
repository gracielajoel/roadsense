import { Copy, ExternalLink, Flag, Inbox, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listReports, updateReport } from '../../api/reports'
import BoundingBox from '../../components/inspection/BoundingBox'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataState from '../../components/ui/DataState'
import Field from '../../components/ui/Field'
import StatCard from '../../components/ui/StatCard'
import { fileUrl } from '../../config'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { severityOf } from '../../utils/constants'
import { damageLabel, formatLocation, formatPercent, mapUrl } from '../../utils/format'
import { nearbyDuplicates, timeAgo } from '../../utils/geo'

// Figma 06 "Live Triage": antrean report baru (kiri) + panel inspeksi (kanan).
// Admin memverifikasi atau menolak; duplikat dicari dari report sejenis yang berdekatan.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 1, label: 'SEV 1' },
  { key: 2, label: 'SEV 2' },
]

export default function TriagePage() {
  const reports = useFetch(() => listReports())
  const nameOf = useUserNames()
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const all = reports.data || []
  const queue = all
    .filter((r) => r.status === 'New')
    .sort(
      (a, b) =>
        severityOf(a.event?.damage_type).level - severityOf(b.event?.damage_type).level ||
        (b.event?.confidence ?? 0) - (a.event?.confidence ?? 0),
    )
  const shown = filter === 'all' ? queue : queue.filter((r) => severityOf(r.event?.damage_type).level === filter)
  const selected = shown.find((r) => r.id === selectedId) || shown[0] || null
  const dupes = selected ? nearbyDuplicates(selected, all) : []
  const sev1 = queue.filter((r) => severityOf(r.event?.damage_type).level === 1).length
  const triaged = all.filter((r) => r.status !== 'New').length

  const decide = async (status, extraNote) => {
    setBusy(true)
    setActionError(null)
    try {
      const text = [extraNote, note.trim()].filter(Boolean).join(' · ')
      await updateReport(selected.id, { status, note: text || undefined })
      setNote('')
      setSelectedId(null)
      reports.reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="stats stats-4">
        <StatCard icon={Inbox} label="Untriaged" value={queue.length} hint="Status: New" />
        <StatCard icon={TriangleAlert} label="SEV-1 critical" value={sev1} hint={sev1 ? 'Potholes waiting' : 'None waiting'} hintTone={sev1 ? 'warning' : 'success'} />
        <StatCard icon={ShieldCheck} label="Triaged" value={triaged} />
        <StatCard
          icon={Copy}
          label="Possible duplicates"
          value={queue.filter((r) => nearbyDuplicates(r, all).length).length}
          hint="Same type within 20 m"
        />
      </div>

      <DataState loading={reports.loading} error={reports.error} onRetry={reports.reload}>
        <div className="triage">
          <section className="card triage-queue">
            <header className="triage-head">
              <span>
                <i className="live-dot" /> INGESTION QUEUE
              </span>
              <span className="hud-accent">{queue.length} UNTRIAGED</span>
            </header>
            <div className="filter-tabs">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" className={filter === f.key ? 'is-active' : ''} onClick={() => setFilter(f.key)}>
                  {f.label} ({f.key === 'all' ? queue.length : queue.filter((r) => severityOf(r.event?.damage_type).level === f.key).length})
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <div className="empty">
                <ShieldCheck size={22} />
                <p>Queue is clear. New citizen reports will show up here.</p>
              </div>
            ) : (
              <ul className="triage-list">
                {shown.map((r) => {
                  const sev = severityOf(r.event?.damage_type)
                  const dup = nearbyDuplicates(r, all).length
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`triage-item sev-${sev.tone} ${selected?.id === r.id ? 'is-selected' : ''}`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <span className="triage-item-top">
                          <span className="hz-id">HZ-{String(r.id).padStart(4, '0')}</span>
                          <Badge tone={sev.tone}>{sev.label}</Badge>
                          <span className="muted small">{timeAgo(r.created_at)}</span>
                        </span>
                        <strong>{r.event ? damageLabel(r.event.damage_type) : 'Report'}</strong>
                        <span className="muted small mono">
                          {formatLocation(r.event)} · {nameOf(r.user_id)}
                        </span>
                        <span className="triage-item-foot">
                          <span className="small">
                            CONF <b className="hud-accent">{formatPercent(r.event?.confidence)}</b>
                          </span>
                          {dup > 0 && (
                            <span className="small tone-warning">
                              <Copy size={12} /> {dup} possible duplicate{dup > 1 ? 's' : ''}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="card triage-inspect">
            {!selected ? (
              <div className="empty">
                <p>Select a report to inspect it.</p>
              </div>
            ) : (
              <>
                <header className="triage-head">
                  <span>
                    HAZARD INSPECTION <span className="muted">// HZ-{String(selected.id).padStart(4, '0')}</span>
                  </span>
                  <Badge tone={severityOf(selected.event?.damage_type).tone}>{severityOf(selected.event?.damage_type).label}</Badge>
                </header>

                {selected.event && (
                  <div className="inspect-frame">
                    {selected.event.evidence_url ? (
                      <img src={fileUrl(selected.event.evidence_url)} alt="AI evidence frame" />
                    ) : (
                      <div className="inspect-noimg muted small">No evidence image</div>
                    )}
                    <BoundingBox
                      bbox={selected.event.bbox}
                      type={selected.event.damage_type}
                      label={`${damageLabel(selected.event.damage_type).toUpperCase()} · ${formatPercent(selected.event.confidence)} CONF`}
                    />
                  </div>
                )}

                <p className="eyebrow">Detection metrics</p>
                <dl className="metric-rows">
                  <div>
                    <dt>Geolocation</dt>
                    <dd>
                      {selected.event?.latitude != null ? (
                        <a className="table-link" href={mapUrl(selected.event)} target="_blank" rel="noreferrer">
                          {formatLocation(selected.event)} <ExternalLink size={11} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Classification</dt>
                    <dd>{selected.event ? damageLabel(selected.event.damage_type) : '—'}</dd>
                  </div>
                  <div>
                    <dt>AI confidence</dt>
                    <dd className="hud-accent">{formatPercent(selected.event?.confidence)}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>
                      {selected.event ? (
                        <Link className="table-link" to={`/admin/videos/${selected.event.video_id}`}>
                          Scan #{selected.event.video_id}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      · {nameOf(selected.user_id)}
                    </dd>
                  </div>
                </dl>

                {dupes.length > 0 && (
                  <div className="dupe-box">
                    <div>
                      <strong>
                        <Copy size={14} /> Duplicate detection
                      </strong>
                      <p className="small">
                        Same damage type as report{' '}
                        <Link className="table-link" to={`/admin/reports/${dupes[0].report.id}`}>
                          #{dupes[0].report.id}
                        </Link>{' '}
                        ({dupes[0].report.status}), about {Math.round(dupes[0].meters)} m away.
                        {dupes.length > 1 && ` ${dupes.length - 1} more nearby.`}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => decide('Rejected', `Duplicate of #${dupes[0].report.id}`)} disabled={busy}>
                      Reject as duplicate
                    </Button>
                  </div>
                )}

                <p className="eyebrow">Dispatch actions</p>
                <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} placeholder="e.g. Confirmed on site photo" />
                <Button icon={ShieldCheck} className="btn-block" onClick={() => decide('Verified')} disabled={busy}>
                  Approve & queue for repair
                </Button>
                <div className="btn-row">
                  <Button variant="secondary" icon={Flag} onClick={() => decide('Rejected', 'False positive')} disabled={busy}>
                    Flag false positive
                  </Button>
                  <Link className="btn btn-secondary" to={`/admin/reports/${selected.id}`}>
                    Full details
                  </Link>
                </div>
                {actionError && (
                  <p className="tone-danger small" role="alert">
                    {actionError}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </DataState>
    </>
  )
}
