import { test as teardown } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'

// Deletes the run's namespaces (set AA_E2E_KEEP=1 to keep them for a look).
teardown('delete the namespaces', async () => {
  if (process.env.AA_E2E_KEEP) return
  const run = process.env.AA_E2E_NAMESPACE!
  // books.spec.ts sets up further books named <run>-book<n>.
  const list = (await wipFetch('GET', '/api/registry/namespaces')).json as Array<{ prefix: string }>
  const books = list.map((n) => n.prefix).filter((p) => p.startsWith(`${run}-book`))
  for (const ns of [run, process.env.AA_E2E_IMPORT_NAMESPACE, ...books]) {
    await wipFetch('DELETE', `/api/registry/namespaces/${ns}?confirm=true`)
  }
})
