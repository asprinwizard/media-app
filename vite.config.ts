/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production Apache serves this SPA at /, media-api under "Alias /api",
// and the media files themselves at /media and /shared.
// In development: the API on `php artisan serve` (port 8000, no /api prefix,
// so the proxy strips it) and media-api's dev/static-server.php on port 8001
// standing in for Apache's /media and /shared.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, '') || '/',
      },
      '/media': 'http://localhost:8001',
      '/shared': 'http://localhost:8001',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
