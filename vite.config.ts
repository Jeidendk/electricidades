import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Honra el puerto asignado por el entorno (preview/autoPort); si no, usa el default de Vite.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
})
