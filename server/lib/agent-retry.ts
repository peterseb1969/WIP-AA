/**
 * When the Ask agent retries its connection to the platform MCP server.
 *
 * The agent connects in the background after the HTTP server is up, so the
 * app serves its pages whether or not MCP is reachable. A platform that is
 * still starting is transient: the MCP server answers 503 while it cannot
 * reach the Registry to check the API key, or the connection is refused or
 * times out. Those are retried with growing delays, indefinitely. A rejected
 * key (401/403) will not fix itself by waiting, so the retries stop and it is
 * reported as configuration. (Same rules as WIP-KB's askBar; CASE-1001.)
 */

export type RetryDecision = 'retry' | 'stop'

/**
 * The HTTP status an MCP transport error carries, if any. The SDK's
 * transport errors put it in `code` (StreamableHTTPError, SseError);
 * fetch-level failures (ECONNREFUSED, timeouts) carry a string code or none.
 */
export function errorStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null
  for (const k of ['code', 'status'] as const) {
    const v = (err as Record<string, unknown>)[k]
    if (typeof v === 'number') return v
  }
  return null
}

export function retryDecision(err: unknown): RetryDecision {
  const status = errorStatus(err)
  return status === 401 || status === 403 ? 'stop' : 'retry'
}

/** Delay before retry number `attempt` (0-based): 1 s, 2 s, 4 s, … capped at 30 s. */
export function backoffMs(attempt: number, baseMs = 1000, capMs = 30_000): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, attempt))
}
