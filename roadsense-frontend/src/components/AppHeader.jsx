import { ScanEye } from 'lucide-react'
import { NavLink } from 'react-router-dom'

// Sementara belum ada login: profil di kanan masih statis
const PROFILE = { initials: 'ND', name: 'North District', team: 'Operations team' }

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <ScanEye size={17} />
        </span>
        <div>
          <strong>RoadSense</strong>
          <span>AI damage detection</span>
        </div>
      </div>

      <nav className="segmented">
        <NavLink to="/" end>
          Citizen app
        </NavLink>
        <NavLink to="/admin">Admin dashboard</NavLink>
      </nav>

      <div className="profile">
        <span className="avatar">{PROFILE.initials}</span>
        <div>
          <strong>{PROFILE.name}</strong>
          <span>{PROFILE.team}</span>
        </div>
      </div>
    </header>
  )
}
