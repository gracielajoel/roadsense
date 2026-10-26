// hintTone: neutral | success | warning
export default function StatCard({ icon: Icon, label, value, suffix, hint, hintTone = 'neutral' }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </p>
      </div>
      {hint && <span className={`stat-hint tone-${hintTone}`}>{hint}</span>}
    </div>
  )
}
