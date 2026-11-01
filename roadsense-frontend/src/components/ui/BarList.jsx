// items: [{ label, value, tone? }]. Panjang bar relatif terhadap nilai terbesar.
export default function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="bar-list">
      {items.map((i) => (
        <li key={i.label}>
          <span className="bar-label">{i.label}</span>
          <span className="bar-track">
            <span className={`bar-fill bar-${i.tone || 'neutral'}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}
