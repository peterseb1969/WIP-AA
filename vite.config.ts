import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path for the deployed app (e.g. /apps/aa/) when behind a router
// that doesn't strip the prefix. Resolution order:
//   1. VITE_BASE_PATH — explicit, used by prod build (Dockerfile ARG).
//   2. APP_BASE_PATH — the server-side base. Fallback for wip-deploy's
//      dev target, which sets APP_BASE_PATH but not VITE_BASE_PATH.
//   3. '/' — local dev default.
const RESOLVED_BASE = process.env.VITE_BASE_PATH || process.env.APP_BASE_PATH || '/'
const BASE_WITH_SLASH = RESOLVED_BASE.endsWith('/') ? RESOLVED_BASE : `${RESOLVED_BASE}/`
const BASE_PATH = RESOLVED_BASE.replace(/\/$/, '')

const SERVER_PORT = process.env.PORT || '3014'
const CLIENT_PORT = parseInt(process.env.VITE_PORT || '5180')
const SERVER_URL = `http://localhost:${SERVER_PORT}`

export default defineConfig({
  base: BASE_WITH_SLASH,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: CLIENT_PORT,
    proxy: {
      [`${BASE_PATH}/api`]: SERVER_URL,
      [`${BASE_PATH}/server-api`]: SERVER_URL,
      [`${BASE_PATH}/wip`]: {
        target: SERVER_URL,
        changeOrigin: true,
      },
    },
  },
})
