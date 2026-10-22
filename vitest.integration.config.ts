import 'dotenv/config'
import { readFileSync } from 'fs'
import { defineConfig } from 'vitest/config'

// Integration tests (layer 2): the real WIP of the local wip-deploy install,
// one disposable namespace per run (aa-it-<timestamp>, created and deleted by
// tests/integration/global-setup.ts). Not part of the pre-commit hook: they
// need WIP running. Run with `npm run test:integration`.
// The key comes from the same place as the app's: WIP_API_KEY, or the file
// WIP_API_KEY_FILE names (set in .env). No default path: install directories
// get renamed, and a stale default fails with a confusing ENOENT.
function apiKey() {
  if (process.env.WIP_API_KEY) return process.env.WIP_API_KEY
  if (!process.env.WIP_API_KEY_FILE) throw new Error('Set WIP_API_KEY_FILE (in .env) or WIP_API_KEY')
  return readFileSync(process.env.WIP_API_KEY_FILE, 'utf8').trim()
}
const env = {
  WIP_BASE_URL: process.env.WIP_BASE_URL ?? 'https://localhost:8443',
  WIP_API_KEY: apiKey(),
  // The local install uses a self-signed certificate.
  NODE_TLS_REJECT_UNAUTHORIZED: '0',
}
// The global setup runs in this process; the test files get `env`.
Object.assign(process.env, env)

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    env,
    // One namespace, shared: files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
})
