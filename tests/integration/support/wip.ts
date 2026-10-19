import { createWipClient, type WipClient } from '@wip/client'

/**
 * Helpers for integration tests. Tests use the WIP API to create their own
 * fixtures and to check what was stored — never to do what the code under
 * test is supposed to do.
 */

export const NAMESPACE_PREFIX = 'aa-it-'

export function wipClient(): WipClient {
  return createWipClient({
    baseUrl: process.env.WIP_BASE_URL!,
    auth: { type: 'api-key', key: process.env.WIP_API_KEY! },
  })
}

/** A raw WIP REST call (for the few things the client does not wrap). */
export async function wipFetch(method: string, path: string, body?: unknown) {
  const res = await fetch(`${process.env.WIP_BASE_URL}${path}`, {
    method,
    headers: { 'X-API-Key': process.env.WIP_API_KEY!, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

/**
 * Bulk writes answer 200 even when an item failed (PoNIF #4): check every
 * item, so a broken fixture fails here and not three steps later.
 */
export async function bulk(path: string, items: unknown[]) {
  const { status, json } = await wipFetch('POST', path, items)
  const results = (json as { results?: Array<{ status: string; error?: string; document_id?: string; id?: string }> }).results
  if (status !== 200 || !results) throw new Error(`${path}: HTTP ${status} ${JSON.stringify(json).slice(0, 300)}`)
  const failed = results.filter((r) => r.status === 'error')
  if (failed.length) throw new Error(`${path}: ${failed.map((r) => r.error).join('; ')}`)
  return results
}

/** Poll until `check` returns a value that isn't undefined (reporting-sync is asynchronous). */
export async function eventually<T>(check: () => Promise<T | undefined>, what: string, timeoutMs = 30_000): Promise<T> {
  const until = Date.now() + timeoutMs
  for (;;) {
    const value = await check().catch(() => undefined)
    if (value !== undefined) return value
    if (Date.now() > until) throw new Error(`Timed out waiting for ${what}`)
    await new Promise((r) => setTimeout(r, 500))
  }
}
