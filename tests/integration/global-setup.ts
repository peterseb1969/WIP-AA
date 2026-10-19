import type { TestProject } from 'vitest/node'
import { NAMESPACE_PREFIX, wipFetch } from './support/wip'

declare module 'vitest' {
  export interface ProvidedContext {
    namespace: string
  }
}

/**
 * Creates the run's namespace (deletion_mode full, so teardown erases it),
 * bootstraps it with the app's own bootstrap from server/seed, and deletes
 * it afterwards. Leftovers of aborted runs are deleted first. Never `aa`.
 */
export default async function setup(project: TestProject) {
  const namespace = `${NAMESPACE_PREFIX}${Date.now()}`

  const list = await wipFetch('GET', '/api/registry/namespaces').catch((err: Error) => {
    throw new Error(`WIP is not reachable at ${process.env.WIP_BASE_URL}: ${err.message}`)
  })
  if (list.status !== 200) throw new Error(`WIP namespaces: HTTP ${list.status}`)
  for (const ns of list.json as Array<{ prefix: string }>) {
    if (ns.prefix.startsWith(NAMESPACE_PREFIX)) await wipFetch('DELETE', `/api/registry/namespaces/${ns.prefix}?confirm=true`)
  }

  const created = await wipFetch('PUT', `/api/registry/namespaces/${namespace}`, {
    description: 'AA integration test run (deleted afterwards)',
    deletion_mode: 'full',
  })
  if (created.status !== 200) throw new Error(`Creating ${namespace}: HTTP ${created.status} ${JSON.stringify(created.json)}`)

  // The bootstrap reads WIP_NAMESPACE when it is first imported.
  process.env.WIP_NAMESPACE = namespace
  const { runBootstrap, checkStatus } = await import('../../server/lib/bootstrap')
  await runBootstrap(() => {})
  const status = await checkStatus()
  if (status !== 'ready') throw new Error(`Bootstrap of ${namespace} ended as "${status}"`)

  project.provide('namespace', namespace)

  return async () => {
    if (process.env.AA_IT_KEEP) return
    await wipFetch('DELETE', `/api/registry/namespaces/${namespace}?confirm=true`)
  }
}
