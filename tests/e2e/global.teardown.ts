import { test as teardown } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'

// Deletes the run's namespace (set AA_E2E_KEEP=1 to keep it for a look).
teardown('delete the namespace', async () => {
  if (process.env.AA_E2E_KEEP) return
  await wipFetch('DELETE', `/api/registry/namespaces/${process.env.AA_E2E_NAMESPACE}?confirm=true`)
})
