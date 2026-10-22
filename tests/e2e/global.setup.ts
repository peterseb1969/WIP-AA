import { expect, test as setup } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'

// Each app instance (playwright.config.ts) has its own namespace.
const instances = [
  { server: 'http://localhost:3016', ns: process.env.AA_E2E_NAMESPACE! },
  { server: 'http://localhost:3019', ns: process.env.AA_E2E_IMPORT_NAMESPACE! },
]

// Runs after the app instances are up: removes leftovers of aborted runs,
// creates each run namespace (deletion_mode full, so teardown erases it) and
// bootstraps it through the app's own bootstrap route.
setup('namespaces and bootstrap', async () => {
  const mine = new Set(instances.map((i) => i.ns))
  const list = await wipFetch('GET', '/api/registry/namespaces')
  for (const n of list.json as Array<{ prefix: string }>) {
    if (n.prefix.startsWith('aa-e2e-') && !mine.has(n.prefix)) await wipFetch('DELETE', `/api/registry/namespaces/${n.prefix}?confirm=true`)
  }
  for (const { server, ns } of instances) {
    const created = await wipFetch('PUT', `/api/registry/namespaces/${ns}`, { description: 'AA end-to-end test run (deleted afterwards)', deletion_mode: 'full' })
    expect(created.status).toBe(200)
    const run = await fetch(`${server}/server-api/bootstrap/run`, { method: 'POST' })
    expect(await run.text()).toContain('"step":"done"')
    const status = await (await fetch(`${server}/server-api/bootstrap/status`)).json()
    expect(status).toEqual({ status: 'ready' })
  }
})
