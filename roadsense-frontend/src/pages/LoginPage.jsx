import { LogIn, ScanEye, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Field from '../components/ui/Field'

export default function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login') // login | register
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const goHome = (u) => navigate(u.role === 'admin' ? '/admin' : location.state?.from || '/', { replace: true })

  // Sudah login (mis. buka /login manual) -> langsung ke halaman utama
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const u = isRegister
        ? await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
        : await signIn(form.email.trim(), form.password)
      goHome(u)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register')
    setError(null)
  }

  return (
    <div className="app auth-page">
      <div className="auth-wrap">
        <div className="auth-brand">
          <span className="brand-mark">
            <ScanEye size={17} />
          </span>
          <div>
            <strong>RoadSense</strong>
            <span>AI damage detection</span>
          </div>
        </div>

        <Card
          eyebrow={isRegister ? 'Create account' : 'Welcome back'}
          title={isRegister ? 'Register as a citizen' : 'Sign in to RoadSense'}
          description={
            isRegister
              ? 'Upload road footage and send damage reports to the operations team.'
              : 'Use the email and password for your account.'
          }
        >
          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <Field label="Name" value={form.name} onChange={set('name')} autoComplete="name" required />
            )}
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 6 : undefined}
              required
            />

            {error && (
              <p className="tone-danger small" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" icon={isRegister ? UserPlus : LogIn} disabled={busy}>
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="auth-switch small">
            {isRegister ? 'Already have an account?' : 'No account yet?'}{' '}
            <button type="button" className="link-btn" onClick={switchMode}>
              {isRegister ? 'Sign in' : 'Register'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  )
}
