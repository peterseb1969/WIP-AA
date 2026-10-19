import { readFileSync } from 'fs'
import { homedir } from 'os'
import { defineConfig } from '@playwright/test'

// End-to-end tests (layer 3): the UI in a real browser (system Chrome).
// The dev container behind the router serves the live book (`aa`), so the
// tests drive a second app instance, started here, on its own ports and on a
// disposable namespace (aa-e2e-<timestamp>). The `setup` project creates and
// bootstraps that namespace, `teardown` deletes it. Run: npm run test:e2e
const keyFile = process.env.WIP_API_KEY_FILE ?? `${homedir()}/.wip-deploy/wip-local/secrets/api-key`
process.env.WIP_BASE_URL ??= 'https://localhost:8443'
process.env.WIP_API_KEY ??= readFileSync(keyFile, 'utf8').trim()
// Set once in the main process; the worker processes inherit it.
process.env.AA_E2E_NAMESPACE ??= `aa-e2e-${Date.now()}`
// wip-local uses a self-signed certificate (fixture calls from the tests).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export const SERVER_PORT = 3016
const VITE_PORT = 5182

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results/e2e',
  // One namespace, steps that build on each other inside a spec.
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${VITE_PORT}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /global\.teardown\.ts/ },
    { name: 'e2e', testMatch: /.*\.spec\.ts/, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://localhost:${VITE_PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      WIP_NAMESPACE: process.env.AA_E2E_NAMESPACE,
      PORT: String(SERVER_PORT),
      VITE_PORT: String(VITE_PORT),
      WIP_BASE_URL: process.env.WIP_BASE_URL,
      WIP_API_KEY: process.env.WIP_API_KEY,
    },
  },
})
