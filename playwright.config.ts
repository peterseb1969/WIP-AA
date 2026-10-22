import 'dotenv/config'
import { readFileSync } from 'fs'
import { defineConfig } from '@playwright/test'

// End-to-end tests (layer 3): the UI in a real browser (system Chrome).
// The dev container behind the router serves the live book (`aa`), so the
// tests drive a second app instance, started here, on its own ports and on a
// disposable namespace (aa-e2e-<timestamp>). The `setup` project creates and
// bootstraps that namespace, `teardown` deletes it. Run: npm run test:e2e
// The key comes from the same place as the app's: WIP_API_KEY, or the file
// WIP_API_KEY_FILE names (set in .env). No default path: install directories
// get renamed, and a stale default fails with a confusing ENOENT.
process.env.WIP_BASE_URL ??= 'https://localhost:8443'
if (!process.env.WIP_API_KEY) {
  if (!process.env.WIP_API_KEY_FILE) throw new Error('Set WIP_API_KEY_FILE (in .env) or WIP_API_KEY')
  process.env.WIP_API_KEY = readFileSync(process.env.WIP_API_KEY_FILE, 'utf8').trim()
}
// Set once in the main process; the worker processes inherit it.
process.env.AA_E2E_NAMESPACE ??= `aa-e2e-${Date.now()}`
// The import and demo specs run against their own app instance and namespace:
// an import into a book that already has characters offers to reset the whole
// book, which would wipe the other specs' fixtures, and the demo book is only
// offered in an empty book.
process.env.AA_E2E_IMPORT_NAMESPACE ??= `${process.env.AA_E2E_NAMESPACE}-import`
// The local install uses a self-signed certificate (fixture calls from the tests).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export const SERVER_PORT = 3016
const VITE_PORT = 5182
export const IMPORT_SERVER_PORT = 3019
const IMPORT_VITE_PORT = 5184

const appInstance = (namespace: string, port: number, vitePort: number) => ({
  command: 'npm run dev',
  url: `http://localhost:${vitePort}/`,
  reuseExistingServer: false,
  timeout: 60_000,
  env: {
    WIP_NAMESPACE: namespace,
    PORT: String(port),
    VITE_PORT: String(vitePort),
    WIP_BASE_URL: process.env.WIP_BASE_URL!,
    WIP_API_KEY: process.env.WIP_API_KEY!,
  },
})

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
    { name: 'e2e', testMatch: /.*\.spec\.ts/, testIgnore: /(import|demo|delete-book)\.spec\.ts/, dependencies: ['setup'] },
    { name: 'import', testMatch: /(demo|import|delete-book)\.spec\.ts/, use: { baseURL: `http://localhost:${IMPORT_VITE_PORT}` }, dependencies: ['setup'] },
  ],
  webServer: [
    appInstance(process.env.AA_E2E_NAMESPACE, SERVER_PORT, VITE_PORT),
    appInstance(process.env.AA_E2E_IMPORT_NAMESPACE, IMPORT_SERVER_PORT, IMPORT_VITE_PORT),
  ],
})
