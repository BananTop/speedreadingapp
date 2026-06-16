import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base must match the GitHub Pages repo path so assets, the manifest, the PDF
// worker and the service worker all resolve under /speedreadingapp/.
export default defineConfig({
  base: '/speedreadingapp/',
  plugins: [react()],
})
