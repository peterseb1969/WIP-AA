/**
 * Minimal server-side WIP REST helpers.
 *
 * GET / POST / PUT against WIP with X-API-Key auth. Self-signed TLS
 * is handled by NODE_TLS_REJECT_UNAUTHORIZED=0 in the dev:server script
 * (NOT in start/production — see CLAUDE.md).
 *
 * Used by the bootstrap and the book list. AuthorAssist UI work happens
 * through @wip/client + @wip/react with the @wip/proxy middleware doing
 * auth injection at the proxy layer; these helpers serve the server's
 * own calls, some of which run before any of that exists.
 */

const WIP_BASE_URL = process.env.WIP_BASE_URL || 'https://localhost:8443'
const WIP_API_KEY = process.env.WIP_API_KEY || ''

/** A WIP call that answered with an error status; the message carries WIP's own reason. */
export class WipHttpError extends Error {
  constructor(method: string, path: string, readonly status: number, statusText: string, readonly body: string) {
    super(`WIP ${method} ${path}: ${status} ${statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`)
  }
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': WIP_API_KEY,
  }
}

export async function wipGet(path: string): Promise<unknown> {
  const res = await fetch(`${WIP_BASE_URL}${path}`, { headers: headers() })
  if (!res.ok) throw new WipHttpError('GET', path, res.status, res.statusText, await res.text().catch(() => ''))
  return res.json()
}

export async function wipPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${WIP_BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new WipHttpError('POST', path, res.status, res.statusText, await res.text().catch(() => ''))
  return res.json()
}

export async function wipPut(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${WIP_BASE_URL}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new WipHttpError('PUT', path, res.status, res.statusText, await res.text().catch(() => ''))
  return res.json()
}
