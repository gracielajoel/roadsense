import { LogOut, ScanEye } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import Button from './ui/Button'

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export default function AppHeader() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const logout = () => {
    signOut()
    navigate('/login', { replace: true })
  }

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
        {isAdmin && <NavLink to="/admin">Admin dashboard</NavLink>}
      </nav>

      <div className="profile">
        <span className="avatar">{initialsOf(user.name)}</span>
        <div>
          <strong>{user.name}</strong>
          <span>{isAdmin ? 'Administrator' : 'Citizen'}</span>
        </div>
        <Button variant="ghost" icon={LogOut} onClick={logout} aria-label="Log out" title="Log out" />
      </div>
    </header>
  )
}
