import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Si VITE_API_BASE_URL no esta definida, las llamadas a /api se
    // reenvian al backend local.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
