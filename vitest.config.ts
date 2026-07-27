import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config separada de Vite para que `tsc -b` del build de producción
// no tenga que conocer los tipos de Vitest.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
