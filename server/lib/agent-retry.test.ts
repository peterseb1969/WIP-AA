import { describe, expect, it } from 'vitest'
import { backoffMs, errorStatus, retryDecision } from './agent-retry'

describe('agent connection retries', () => {
  it('retries a platform that is still starting', () => {
    // The MCP server's answer while it cannot reach the Registry.
    expect(retryDecision(Object.assign(new Error('Registry unreachable'), { code: 503 }))).toBe('retry')
    expect(retryDecision(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }))).toBe('retry')
    expect(retryDecision(new Error('timed out'))).toBe('retry')
    expect(retryDecision(undefined)).toBe('retry')
  })

  it('stops on a rejected key', () => {
    expect(retryDecision(Object.assign(new Error('Invalid API key'), { code: 401 }))).toBe('stop')
    expect(retryDecision({ status: 403 })).toBe('stop')
  })

  it('reads the status from code or status, numbers only', () => {
    expect(errorStatus({ code: 503 })).toBe(503)
    expect(errorStatus({ status: 401 })).toBe(401)
    expect(errorStatus({ code: 'ECONNREFUSED' })).toBeNull()
    expect(errorStatus('boom')).toBeNull()
  })

  it('waits longer each time, up to 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map((n) => backoffMs(n))).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])
  })
})
