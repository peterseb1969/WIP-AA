/**
 * Anthropic API key resolution + runtime override.
 *
 * AuthorAssist uses the Anthropic key in two places — the AskBar query agent
 * (agent.ts) and AI manuscript import extraction (import.ts). Both resolve the
 * key through here so a key set at runtime via the Settings UI takes effect for
 * both, without a redeploy.
 *
 * Resolution order (highest first): in-memory runtime override → key file
 * (ANTHROPIC_API_KEY_FILE, mirroring WIP's apiKeyFile pattern, CASE-495) → the
 * ANTHROPIC_API_KEY env var. The key is never returned to the client — callers
 * get a masked status only.
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'fs'

let runtimeKeyOverride: string | null = null

function keyFromFile(): string {
  const f = process.env.ANTHROPIC_API_KEY_FILE
  if (!f) return ''
  try {
    return readFileSync(f, 'utf-8').trim()
  } catch {
    return ''
  }
}

/** The effective Anthropic key, or '' if none is configured. */
export function anthropicKey(): string {
  return runtimeKeyOverride || keyFromFile() || process.env.ANTHROPIC_API_KEY || ''
}

export type KeySource = 'override' | 'file' | 'env' | 'none'

export function keySource(): KeySource {
  if (runtimeKeyOverride) return 'override'
  if (keyFromFile()) return 'file'
  if (process.env.ANTHROPIC_API_KEY) return 'env'
  return 'none'
}

export interface KeyStatus {
  configured: boolean
  source: KeySource
  /** Last 4 chars of the key for confirmation — never the full key. */
  last4: string | null
  /** Whether persistence to a key file is available (ANTHROPIC_API_KEY_FILE set). */
  persistable: boolean
}

export function getKeyStatus(): KeyStatus {
  const key = anthropicKey()
  return {
    configured: !!key,
    source: keySource(),
    last4: key ? key.slice(-4) : null,
    persistable: !!process.env.ANTHROPIC_API_KEY_FILE,
  }
}

/**
 * Validate a key by making a minimal real API call. Prevents storing a bad key.
 */
export async function validateKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const probe = new Anthropic({ apiKey: key })
    await probe.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'validation failed' }
  }
}

/**
 * Set the in-memory override and, when persist is requested and a key file is
 * configured, write it to that file (0600). Returns whether it was persisted.
 */
export function setKey(key: string, persist: boolean): { persisted: boolean } {
  runtimeKeyOverride = key
  const f = process.env.ANTHROPIC_API_KEY_FILE
  if (persist && f) {
    writeFileSync(f, key, { mode: 0o600 })
    return { persisted: true }
  }
  return { persisted: false }
}
