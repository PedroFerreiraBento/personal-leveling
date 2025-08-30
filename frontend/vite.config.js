import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

// Load .env from repo root so we keep a single environment file
loadEnv({ path: resolve(__dirname, '../.env') })

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Expose API URL for production builds if needed; during dev, proxy handles /api
    'process.env.VITE_API_URL': JSON.stringify(
      process.env.PUBLIC_API_URL || process.env.VITE_API_URL || ''
    )
  }
})
