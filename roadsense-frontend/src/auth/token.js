// Token login disimpan di localStorage. try/catch karena bisa melempar error di private window.
const KEY = 'roadsense.token'

export const getToken = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    // abaikan: sesi hanya bertahan sampai halaman di-refresh
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // abaikan
  }
}
