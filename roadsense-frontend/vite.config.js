import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Harus 5173: port ini yang diizinkan CORS_ORIGINS di backend
    port: 5173,
    strictPort: true,
  },
})
