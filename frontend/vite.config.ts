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
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'i18next',
        'react-i18next',
        'axios',
        'lucide-react',
      ],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('wavesurfer.js')) {
                return 'vendor-wavesurfer';
              }
              if (id.includes('ogl')) {
                return 'vendor-ogl';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              return 'vendor-libs';
            }
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})