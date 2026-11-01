import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { createUser, deleteUser, listUsers, updateUser } from '../../api/users'
import useAuth from '../../auth/useAuth'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import DataState from '../../components/ui/DataState'
import Field from '../../components/ui/Field'
import useFetch from '../../hooks/useFetch'
import { ROLES } from '../../utils/constants'
import { formatDateTime } from '../../utils/format'

const EMPTY = { name: '', email: '', password: '', role: 'user' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const { data, loading, error, reload } = useFetch(listUsers)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const run = async (fn) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    run(async () => {
      await createUser({ ...form, name: form.name.trim(), email: form.email.trim() })
      setForm(EMPTY)
    })
  }

  const remove = (u) => {
    if (window.confirm(`Delete ${u.name} (${u.email})?`)) run(() => deleteUser(u.id))
  }

  return (
    <div className="page">
      <Card eyebrow="Admin dashboard" title="Users" description="Citizens and administrators.">
        {actionError && (
          <p className="tone-danger small" role="alert">
            {actionError}
          </p>
        )}
        <DataState loading={loading} error={error} onRetry={reload}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data || []).map((u) => {
                  const isMe = u.id === me.id
                  return (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        {u.name} {isMe && <Badge tone="info">you</Badge>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <select
                          className="select"
                          value={u.role}
                          disabled={isMe || busy}
                          onChange={(e) => run(() => updateUser(u.id, { role: e.target.value }))}
                          aria-label={`Role of ${u.name}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="small">{formatDateTime(u.created_at)}</td>
                      <td className="cell-actions">
                        <Button variant="ghost" onClick={() => remove(u)} disabled={isMe || busy}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DataState>
      </Card>

      <Card eyebrow="New account" title="Create user" description="Admins can create citizen or administrator accounts.">
        <form className="user-form" onSubmit={submit}>
          <Field label="Name" value={form.name} onChange={set('name')} required />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} minLength={6} required />
          <div className="field">
            <label htmlFor="new-user-role">Role</label>
            <select id="new-user-role" className="select" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" icon={UserPlus} disabled={busy}>
            Create
          </Button>
        </form>
      </Card>
    </div>
  )
}
