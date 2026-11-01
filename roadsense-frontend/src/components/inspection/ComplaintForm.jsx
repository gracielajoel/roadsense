import { ArrowRight, Check, CircleCheck, MapPin } from 'lucide-react'
import { useState } from 'react'
import { damageLabel, formatPercent, formatTime } from '../../utils/format'
import Button from '../ui/Button'
import Field from '../ui/Field'
import FrameThumb from './FrameThumb'

const EMPTY = { road_name: '', landmark: '', description: '', latitude: '', longitude: '' }

// reportId terisi kalau event ini sudah pernah dilaporkan
export default function ComplaintForm({ event, videoSrc, reportId, onSubmit }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    latitude: event?.latitude ?? '',
    longitude: event?.longitude ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [locating, setLocating] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError('Browser does not support location')
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((f) => ({ ...f, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }))
        setLocating(false)
      },
      () => {
        setError('Could not get your location. Allow location access or type the coordinates.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

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
        <div className="complaint-location">
          <Field
            label="Latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            placeholder="-6.200000"
            value={form.latitude}
            onChange={set('latitude')}
            required
          />
          <Field
            label="Longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            placeholder="106.816666"
            value={form.longitude}
            onChange={set('longitude')}
            required
          />
          <Button variant="secondary" icon={MapPin} onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </Button>
        </div>
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
