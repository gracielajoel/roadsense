import { Film, FileText, KanbanSquare, Layers, LayoutDashboard, ScanLine, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

// Sidebar admin (Figma 06/07: "GIS Command"). Di layar sempit jadi tab horizontal.
const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/triage', label: 'Live triage', icon: Layers },
  { to: '/admin/work-orders', label: 'Work orders', icon: KanbanSquare },
  { to: '/admin/reports', label: 'Hazard reports', icon: FileText },
  { to: '/admin/events', label: 'Detections', icon: ScanLine },
  { to: '/admin/videos', label: 'Scans & videos', icon: Film },
  { to: '/admin/users', label: 'Users', icon: Users },
]

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <p className="admin-side-tag">
          <i className="live-dot" /> GIS COMMAND
        </p>
        <nav>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="page admin-main">
        <Outlet />
      </div>
    </div>
  )
}
