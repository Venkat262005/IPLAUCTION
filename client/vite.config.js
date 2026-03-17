import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5050',
        ws: true,
        changeOrigin: true,
        // Required for Vite 5+ to rewrite the WebSocket upgrade origin header
        rewriteWsOrigin: true,
      },
    },
  },
})



