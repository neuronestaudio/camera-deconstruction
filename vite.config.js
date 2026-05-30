import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Camera Deconstruction keeps the default port; Cave Exploration uses 5175.
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
})
