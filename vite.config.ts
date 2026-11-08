import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served at the root of its own origin (https://aa.<host>/), in
// local dev and behind the wip-deploy gateway alike, so Vite keeps its
// default base '/'. There is no base-path setting: an image built for a path
// prefix cannot be served by an install after CASE-1103.

const SERVER_PORT = process.env.PORT || '3014'
const CLIENT_PORT = parseInt(process.env.VITE_PORT || '5180')
const SERVER_URL = `http://localhost:${SERVER_PORT}`

// Hosts the dev server answers besides localhost and IP addresses. Vite
// refuses any other Host header (403) to block DNS rebinding, so a dev
// install behind a non-localhost ingress (e.g. `kb.internal`) names its host
// here: DEV_ALLOWED_HOSTS=aa.internal,.example.org (a leading dot allows
// every subdomain). Unset keeps Vite's default.
const ALLOWED_HOSTS = (process.env.DEV_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: CLIENT_PORT,
    ...(ALLOWED_HOSTS.length ? { allowedHosts: ALLOWED_HOSTS } : {}),
    proxy: {
      '/api': SERVER_URL,
      '/server-api': SERVER_URL,
      '/wip': {
        target: SERVER_URL,
        changeOrigin: true,
      },
    },
  },
})
