import { ChevronDown, ChevronUp, Route, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteLiveSession, listLiveEvents, listLiveSessions } from '../api/live'
import DriveDetections from '../components/DriveDetections'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import DataState from '../components/ui/DataState'
import StatCard from '../components/ui/StatCard'
import useFetch from '../hooks/useFetch'
import { severityOf } from '../utils/constants'
import { formatDateTime } from '../utils/format'

// Riwayat perjalanan pengendara: setiap sesi live scan dengan kerusakan yang tercatat.
// Tidak ada pelaporan ke pemerintah; ini catatan pribadi untuk pengendara.
export default function HistoryPage() {
  const sessions = useFetch(() => listLiveSessions())
  const [events, setEvents] = useState({}) // video_id -> event[]
  const [openId, setOpenId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const drives = [...(sessions.data || [])].reverse()

  // Muat jumlah kerusakan tiap perjalanan (maks 20 terakhir) untuk ringkasan
  useEffect(() => {
    let cancelled = false
    for (const d of (sessions.data || []).slice(-20)) {
      listLiveEvents(d.id)
        .then((evts) => !cancelled && setEvents((m) => ({ ...m, [d.id]: evts })))
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [sessions.data])

  const potholesOf = (evts) => (evts || []).filter((e) => severityOf(e.damage_type).level === 1).length
  const all = Object.values(events).flat()

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.filename}" and its detections?`)) return
    setActionError(null)
    try {
      await deleteLiveSession(d.id)
      sessions.reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Drive history</p>
          <h1>Your drives and the potholes on them.</h1>
          <p className="hero-sub">Every live scan is saved here with the location of each damage spot.</p>
        </div>
      </section>

      <section className="stats">
        <StatCard icon={Route} label="Drives" value={drives.length} />
        <StatCard icon={TriangleAlert} label="Potholes found" value={potholesOf(all)} hintTone="warning" />
        <StatCard icon={TriangleAlert} label="Other damage" value={all.length - potholesOf(all)} />
      </section>

      {actionError && (
        <p className="tone-danger small" role="alert">
          {actionError}
        </p>
      )}

      <DataState loading={sessions.loading} error={sessions.error} onRetry={sessions.reload}>
        {drives.length === 0 ? (
          <div className="empty">
            <p>No drives yet.</p>
            <Link className="table-link" to="/">
              Start a live scan
            </Link>
          </div>
        ) : (
          <ul className="drive-list">
            {drives.map((d) => {
              const evts = events[d.id]
              const open = openId === d.id
              const potholes = potholesOf(evts)
              return (
                <li key={d.id} className={`card drive ${open ? 'is-open' : ''}`}>
                  <button type="button" className="drive-head" onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open}>
                    <span className="drive-title">
                      <strong>{formatDateTime(d.created_at)}</strong>
                      <span className="muted small mono">DRIVE #{d.id}</span>
                    </span>
                    <span className="drive-counts">
                      {evts ? (
                        <>
                          {potholes > 0 && <Badge tone="danger">{potholes} pothole{potholes > 1 ? 's' : ''}</Badge>}
                          <Badge tone={evts.length ? 'warning' : 'success'}>{evts.length} spots</Badge>
                        </>
                      ) : (
                        <span className="muted small">…</span>
                      )}
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </span>
                  </button>
                  {open && (
                    <div className="drive-body">
                      {evts ? <DriveDetections events={evts} /> : <p className="muted small">Loading…</p>}
                      <Button variant="ghost" icon={Trash2} onClick={() => remove(d)}>
                        Delete drive
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DataState>
    </div>
  )
}
