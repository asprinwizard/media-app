/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production Apache serves this SPA at / and media-api under "Alias /api".
// In development the API runs on `php artisan serve` (port 8000) with no /api
// prefix, so the proxy strips it.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, '') || '/',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
