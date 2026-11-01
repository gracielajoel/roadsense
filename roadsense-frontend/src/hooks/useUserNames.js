import { listUsers } from '../api/users'
import useFetch from './useFetch'

// Ubah user_id jadi nama. Hanya untuk halaman admin (GET /users khusus admin).
export default function useUserNames() {
  const { data } = useFetch(listUsers)
  const names = Object.fromEntries((data || []).map((u) => [u.id, u.name]))
  return (id) => (id == null ? '—' : (names[id] ?? `User #${id}`))
}
