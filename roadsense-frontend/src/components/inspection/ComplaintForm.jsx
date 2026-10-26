import { ArrowRight, Check, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { damageLabel, formatPercent, formatTime } from '../../utils/format'
import Button from '../ui/Button'
import Field from '../ui/Field'
import FrameThumb from './FrameThumb'

const EMPTY = { road_name: '', landmark: '', description: '' }

// reportId terisi kalau event ini sudah pernah dilaporkan
export default function ComplaintForm({ event, videoSrc, reportId, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="complaint">
      <div className="complaint-intro">
        <p className="eyebrow">03 · Complaint form</p>
        <h2 className="card-title">{reportId ? 'Complaint sent.' : 'Ready to send your report.'}</h2>
        <p className="card-description">
          The selected AI frame, confidence score, and video evidence will be attached automatically.
        </p>
        {event ? (
          <div className="complaint-evidence">
            <FrameThumb event={event} videoSrc={videoSrc} showTime={false} />
            <div>
              <strong>{damageLabel(event.damage_type)} detected</strong>
              <p className="muted small">
                {formatTime(event.timestamp_sec)} · {formatPercent(event.confidence)} confidence
              </p>
            </div>
          </div>
        ) : (
          <p className="muted small">Select a detected frame to attach it to your complaint.</p>
        )}
      </div>

      <form className="complaint-form" onSubmit={handleSubmit}>
        <Field label="Road name" placeholder="e.g. Elm Street" value={form.road_name} onChange={set('road_name')} required />
        <Field label="Nearest landmark" placeholder="e.g. outside No. 24" value={form.landmark} onChange={set('landmark')} />
        <Field
          label="Additional description"
          multiline
          placeholder="Describe the damage and how it affects traffic."
          value={form.description}
          onChange={set('description')}
        />
        <div className="complaint-footer">
          {reportId ? (
            <span className="tone-success small">
              <CircleCheck size={14} /> Complaint #{reportId} submitted for this frame
            </span>
          ) : error ? (
            <span className="tone-danger small">{error}</span>
          ) : (
            <span className="muted small">
              <Check size={14} /> {event ? 'AI evidence attached' : 'No frame selected'}
            </span>
          )}
          <Button type="submit" iconRight={ArrowRight} disabled={!event || !!reportId || submitting}>
            {submitting ? 'Sending…' : 'Submit complaint'}
          </Button>
        </div>
      </form>
    </div>
  )
}
