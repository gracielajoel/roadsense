import axios from 'axios'
import { API_URL } from '../config'

const client = axios.create({ baseURL: API_URL })

// FastAPI mengirim error sebagai { detail: "..." } (atau array untuk error validasi 422).
// Ubah jadi Error dengan pesan yang bisa langsung ditampilkan ke user.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail
    let message = err.message
    if (typeof detail === 'string') message = detail
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg).join(', ')
    const wrapped = new Error(message)
    wrapped.status = err.response?.status
    return Promise.reject(wrapped)
  },
)

export default client
