import { test as teardown } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'

// Deletes the run's namespaces (set AA_E2E_KEEP=1 to keep them for a look).
teardown('delete the namespaces', async () => {
  if (process.env.AA_E2E_KEEP) return
  for (const ns of [process.env.AA_E2E_NAMESPACE, process.env.AA_E2E_IMPORT_NAMESPACE]) {
    await wipFetch('DELETE', `/api/registry/namespaces/${ns}?confirm=true`)
  }
})
