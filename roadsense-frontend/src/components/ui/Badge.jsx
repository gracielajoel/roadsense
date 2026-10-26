// tone: neutral | success | warning | danger | info
export default function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
