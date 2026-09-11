import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_BACKEND_PROXY_URL || (process.env.HOSTNAME ? 'http://backend:8000' : 'http://localhost:8000')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
        interval: 100,
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})