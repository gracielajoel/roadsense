import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from './useAuth'

// Halaman yang butuh login. Belum login -> ke /login, lalu kembali ke halaman asal setelah masuk.
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Halaman khusus admin. User biasa dikembalikan ke halaman utama.
export function RequireAdmin() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
