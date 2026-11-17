import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Backend yang dituju proxy /api dan /files (dipakai kalau VITE_API_BASE_URL dikosongkan)
const BACKEND = process.env.ROADSENSE_BACKEND || 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Harus 5173: port ini yang diizinkan CORS_ORIGINS di backend
    port: 5173,
    strictPort: true,
    // Bisa dibuka dari HP di jaringan yang sama / lewat tunnel HTTPS (kamera HP wajib HTTPS)
    host: true,
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app'],
    proxy: {
      '/api': BACKEND,
      '/files': BACKEND,
    },
  },
})
