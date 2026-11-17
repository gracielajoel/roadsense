import { Gauge, History } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

// Tab bar bawah untuk HP (Figma 04). Di desktop navigasi ada di header.
const NAV = [
  { to: '/', label: 'Live HUD', icon: Gauge, end: true },
  { to: '/history', label: 'History', icon: History },
]

export default function MainLayout() {
  return (
    <div className="app">
      <AppHeader />
      <main className="container">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
