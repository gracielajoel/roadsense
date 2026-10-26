import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/events', label: 'Detections' },
  { to: '/admin/videos', label: 'Videos' },
  { to: '/admin/users', label: 'Users' },
]

export default function AdminLayout() {
  return (
    <div className="page">
      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
