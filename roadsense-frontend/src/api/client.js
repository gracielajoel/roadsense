import axios from 'axios'
import { clearToken, getToken } from '../auth/token'
import { API_URL } from '../config'

const client = axios.create({ baseURL: API_URL })

// Dipanggil saat backend menolak token (kedaluwarsa / tidak valid) supaya AuthProvider bisa logout.
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// FastAPI mengirim error sebagai { detail: "..." } (atau array untuk error validasi 422).
// Ubah jadi Error dengan pesan yang bisa langsung ditampilkan ke user.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    // 401 di /auth/login = email/password salah, bukan sesi berakhir
    if (status === 401 && err.config?.url !== '/auth/login') {
      clearToken()
      onUnauthorized?.()
    }
    const detail = err.response?.data?.detail
    let message = err.message
    if (typeof detail === 'string') message = detail
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg).join(', ')
    const wrapped = new Error(message)
    wrapped.status = status
    return Promise.reject(wrapped)
  },
)

export default client
