import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_PORT = process.env.PORT || '3002'
const CLIENT_PORT = parseInt(process.env.VITE_PORT || '5173')
const SERVER_URL = `http://localhost:${SERVER_PORT}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: CLIENT_PORT,
    proxy: {
      '/api': SERVER_URL,
      '/wip': {
        target: SERVER_URL,
        changeOrigin: true,
      },
    },
  },
})
