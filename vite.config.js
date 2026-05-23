import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true },
      mangle: true
    }
  },
  optimizeDeps: {
    exclude: ['@opentelemetry/api']
  },
  server: {
    watch: {
      ignored: ['**/android/**', '**/build-electron/**', '**/build-final/**']
    }
  }
})
