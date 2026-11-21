import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Server menolak mutasi dari origin lain; jangan biarkan Vite pindah port.
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
