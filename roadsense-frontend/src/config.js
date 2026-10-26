// Semua konfigurasi yang bergantung environment dibaca dari sini.
// Nilai diambil dari file .env (lihat .env.example).
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

// Semua endpoint REST backend ada di bawah /api/v1
export const API_URL = `${API_BASE_URL}/api/v1`

// true = sebagian fungsi di src/api memakai data demo dari src/mocks (tanpa backend)
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// Sementara belum ada login
export const DEMO_USER_ID = Number(import.meta.env.VITE_DEMO_USER_ID || 1)

// Backend mengembalikan path file relatif (mis. evidence_url "/files/evidence/x.jpg"
// atau after_photo_path "after/x.jpg"). Ubah jadi URL lengkap untuk <img>/<video>.
export function fileUrl(path) {
  if (!path) return null
  if (/^(https?:|blob:)/.test(path) || path.startsWith('/demo/')) return path
  // Backend di Windows bisa mengirim backslash (mis. "/files/evidence\x.jpg")
  const clean = path.replace(/\\/g, '/').replace(/^\/+/, '')
  return clean.startsWith('files/') ? `${API_BASE_URL}/${clean}` : `${API_BASE_URL}/files/${clean}`
}
