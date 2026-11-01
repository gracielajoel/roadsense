import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMe, login, register } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import { USE_MOCK } from '../config'
import { AuthContext } from './context'
import { clearToken, getToken, setToken } from './token'

// Mode mock tidak punya backend, jadi tidak ada login: langsung dianggap admin.
const MOCK_USER = { id: 0, name: 'Demo Admin', email: 'demo@roadsense.local', role: 'admin' }

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(USE_MOCK ? MOCK_USER : null)
  const [loading, setLoading] = useState(!USE_MOCK && Boolean(getToken()))

  // Ada token tersimpan -> pulihkan sesi dari backend (sekaligus memastikan token masih berlaku)
  useEffect(() => {
    if (!loading) return
    let cancelled = false
    getMe()
      .then((u) => !cancelled && setUser(u))
      .catch(() => clearToken())
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // hanya dijalankan sekali saat pertama dibuka
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { access_token, user: u } = await login(email, password)
    setToken(access_token)
    setUser(u)
    return u
  }, [])

  const signUp = useCallback(
    async (data) => {
      await register(data)
      return signIn(data.email, data.password)
    },
    [signIn],
  )

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
