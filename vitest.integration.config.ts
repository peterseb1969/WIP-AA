import { readFileSync } from 'fs'
import { homedir } from 'os'
import { defineConfig } from 'vitest/config'

// Integration tests (layer 2): the real WIP of the local wip-deploy install,
// one disposable namespace per run (aa-it-<timestamp>, created and deleted by
// tests/integration/global-setup.ts). Not part of the pre-commit hook: they
// need WIP running. Run with `npm run test:integration`.
const keyFile = process.env.WIP_API_KEY_FILE ?? `${homedir()}/.wip-deploy/wip-local/secrets/api-key`
const env = {
  WIP_BASE_URL: process.env.WIP_BASE_URL ?? 'https://localhost:8443',
  WIP_API_KEY: process.env.WIP_API_KEY ?? readFileSync(keyFile, 'utf8').trim(),
  // wip-local uses a self-signed certificate.
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
