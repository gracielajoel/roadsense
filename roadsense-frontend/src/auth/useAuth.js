import { useContext } from 'react'
import { AuthContext } from './context'

// { user, loading, isAdmin, signIn(email, password), signUp({ name, email, password }), signOut() }
export default function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
