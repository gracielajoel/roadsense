import { LogOut, Radio } from 'lucide-react'
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
          <Radio size={17} />
        </span>
        <div>
          <strong>ROADSENSE</strong>
          <span>{isAdmin ? 'GIS command' : 'Road telemetry'}</span>
        </div>
      </div>

      <nav className="segmented">
        <NavLink to="/" end>
          Upload
        </NavLink>
        <NavLink to="/live">Live scan</NavLink>
        <NavLink to="/reports">My reports</NavLink>
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
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
