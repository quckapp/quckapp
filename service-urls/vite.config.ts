import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In Docker: VITE_PROXY_TARGET=http://service-urls-api:8085
// Local dev: defaults to http://localhost:8080 (Kong)
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
