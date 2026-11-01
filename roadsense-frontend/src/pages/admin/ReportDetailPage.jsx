import { ArrowLeft, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport, getReportHistory, updateReport, uploadAfterPhoto } from '../../api/reports'
import FrameThumb from '../../components/inspection/FrameThumb'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import Field from '../../components/ui/Field'
import { fileUrl } from '../../config'
import useFetch from '../../hooks/useFetch'
import useUserNames from '../../hooks/useUserNames'
import { NEXT_STATUSES, STATUS_TONE } from '../../utils/constants'
import { damageLabel, formatDateTime, formatLocation, formatPercent, formatTime, mapUrl } from '../../utils/format'

export default function ReportDetailPage() {
  const { id } = useParams()
  const report = useFetch(() => getReport(id), [id])
  const history = useFetch(() => getReportHistory(id), [id])
  const nameOf = useUserNames()
  const fileRef = useRef(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      report.reload()
      history.reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = (status) =>
    run(async () => {
      await updateReport(id, { status, note: note.trim() || undefined })
      setNote('')
    })

  const r = report.data
  const e = r?.event
  const next = r ? NEXT_STATUSES[r.status] : []
  const canUploadPhoto = r && (r.status === 'In Progress' || r.status === 'Completed')

  return (
    <div className="page">
      <Link className="table-link back-link" to="/admin/reports">
        <ArrowLeft size={14} /> All reports
      </Link>

      <DataState loading={report.loading} error={report.error} onRetry={report.reload}>
        {r && (
          <>
            <div className="inspection-grid">
              <Card eyebrow={`Report #${r.id}`} title={e ? damageLabel(e.damage_type) : 'Report'}>
                {e && (
                  <div className="evidence-large">
                    <FrameThumb event={e} showTime={false} />
                  </div>
                )}
                <dl className="kv">
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </dd>
                  <dt>Reporter</dt>
                  <dd>{nameOf(r.user_id)}</dd>
                  <dt>Verified by</dt>
                  <dd>{r.verified_by ? nameOf(r.verified_by) : '—'}</dd>
                  <dt>Created</dt>
                  <dd>{formatDateTime(r.created_at)}</dd>
                  {e && (
                    <>
                      <dt>Confidence</dt>
                      <dd>{formatPercent(e.confidence)}</dd>
                      <dt>Video</dt>
                      <dd>
                        <Link className="table-link" to={`/admin/videos/${e.video_id}`}>
                          Video #{e.video_id} at {formatTime(e.timestamp_sec)}
                        </Link>
                      </dd>
                      <dt>Location</dt>
                      <dd>
                        {formatLocation(e)}
                        {e.latitude != null && (
                          <a className="table-link" href={mapUrl(e)} target="_blank" rel="noreferrer">
                            Open map
                          </a>
                        )}
                      </dd>
                    </>
                  )}
                </dl>
              </Card>

              <Card eyebrow="Handling" title="Update status">
                {next.length === 0 ? (
                  <p className="muted small">This report is {r.status.toLowerCase()}. No further status changes.</p>
                ) : (
                  <div className="status-actions">
                    <Field
                      label="Note (optional)"
                      value={note}
                      onChange={(ev) => setNote(ev.target.value)}
                      maxLength={500}
                      placeholder="e.g. Crew scheduled for Monday"
                    />
                    <div className="btn-row">
                      {next.map((s) => (
                        <Button
                          key={s}
                          variant={s === 'Rejected' ? 'secondary' : 'primary'}
                          onClick={() => changeStatus(s)}
                          disabled={busy || (s === 'Completed' && !r.after_photo_url)}
                        >
                          Mark as {s}
                        </Button>
                      ))}
                    </div>
                    {next.includes('Completed') && !r.after_photo_url && (
                      <p className="muted small">Upload the after-repair photo below before completing.</p>
                    )}
                  </div>
                )}
                {actionError && (
                  <p className="tone-danger small" role="alert">
                    {actionError}
                  </p>
                )}

                <div className="after-photo-block">
                  <p className="eyebrow">After-repair photo</p>
                  {r.after_photo_url ? (
                    <img className="after-photo" src={fileUrl(r.after_photo_url)} alt="After repair" />
                  ) : (
                    <p className="muted small">No photo yet.</p>
                  )}
                  {canUploadPhoto ? (
                    <>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(ev) => {
                          const file = ev.target.files[0]
                          ev.target.value = ''
                          if (file) run(() => uploadAfterPhoto(id, file))
                        }}
                      />
                      <Button variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>
                        {r.after_photo_url ? 'Replace photo' : 'Upload photo'}
                      </Button>
                    </>
                  ) : (
                    <p className="muted small">Available once the report is In Progress.</p>
                  )}
                </div>
              </Card>
            </div>

            <Card eyebrow="Audit trail" title="Status history">
              <DataState loading={history.loading} error={history.error} onRetry={history.reload}>
                <ol className="timeline">
                  {(history.data || []).map((h) => (
                    <li key={h.id}>
                      <strong>{h.from_status ? `${h.from_status} → ${h.to_status}` : `Created as ${h.to_status}`}</strong>
                      <span className="muted small">
                        {nameOf(h.changed_by)} · {formatDateTime(h.changed_at)}
                      </span>
                      {h.note && <span className="small">{h.note}</span>}
                    </li>
                  ))}
                </ol>
              </DataState>
            </Card>
          </>
        )}
      </DataState>
    </div>
  )
}
