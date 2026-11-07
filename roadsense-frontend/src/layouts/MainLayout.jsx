import { FileText, Gauge, LayoutDashboard, Upload } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import AppHeader from '../components/AppHeader'

// Tab bar bawah untuk HP (Figma 04: Live HUD / Reports / ...). Di desktop navigasi ada di header.
function BottomNav() {
  const { isAdmin } = useAuth()
  const items = [
    { to: '/live', label: 'Live HUD', icon: Gauge },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/', label: 'Upload', icon: Upload, end: true },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: LayoutDashboard }] : []),
  ]
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function MainLayout() {
  const { pathname } = useLocation()
  const admin = pathname.startsWith('/admin')
  return (
    <div className="app">
      <AppHeader />
      <main className={`container ${admin ? 'container-wide' : ''}`}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
