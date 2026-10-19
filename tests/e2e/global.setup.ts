import { expect, test as setup } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'

const SERVER = 'http://localhost:3016'
const ns = process.env.AA_E2E_NAMESPACE!

// Runs after the app instance is up: removes leftovers of aborted runs,
// creates the run's namespace (deletion_mode full, so teardown erases it) and
// bootstraps it through the app's own bootstrap route.
setup('namespace and bootstrap', async () => {
  const list = await wipFetch('GET', '/api/registry/namespaces')
  for (const n of list.json as Array<{ prefix: string }>) {
    if (n.prefix.startsWith('aa-e2e-') && n.prefix !== ns) await wipFetch('DELETE', `/api/registry/namespaces/${n.prefix}?confirm=true`)
  }
  const created = await wipFetch('PUT', `/api/registry/namespaces/${ns}`, { description: 'AA end-to-end test run (deleted afterwards)', deletion_mode: 'full' })
  expect(created.status).toBe(200)

  const run = await fetch(`${SERVER}/server-api/bootstrap/run`, { method: 'POST' })
  expect(await run.text()).toContain('"step":"done"')
  const status = await (await fetch(`${SERVER}/server-api/bootstrap/status`)).json()
  expect(status).toEqual({ status: 'ready' })
})
