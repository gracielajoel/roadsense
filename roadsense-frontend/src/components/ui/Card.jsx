// Panel dengan header opsional: eyebrow kecil ("01 · Upload & Scan"), judul, deskripsi, dan aksi di kanan.
export default function Card({ eyebrow, title, description, action, className = '', children }) {
  const hasHeader = eyebrow || title || description || action
  return (
    <section className={`card ${className}`}>
      {hasHeader && (
        <header className="card-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="card-description">{description}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
