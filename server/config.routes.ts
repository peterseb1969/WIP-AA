/**
 * Runtime configuration endpoints — set/rotate the Anthropic API key from the
 * app's Settings UI without a redeploy (mirrors WIP-KB's CASE-508 pattern).
 *
 *   GET  /server-api/config/anthropic-key  → masked status (never the key)
 *   POST /server-api/config/anthropic-key  → { key, persist? }, validated then set
 *
 * No app-level auth gate: AuthorAssist has no auth layer, and behind the
 * wip-deploy gateway the whole app is already auth-gated (wip-app.yaml
 * `/apps/aa auth_required: true`), so this endpoint is no more exposed than
 * /api/ask. If finer control is ever needed, gate on X-WIP-Groups here.
 */

import { Router } from 'express'
import { getKeyStatus, validateKey, setKey } from './lib/anthropic-key.js'
import { agentSettled, isAgentReady, startAgent } from './agent.js'

const router = Router()

router.get('/config/anthropic-key', (_req, res) => {
  res.json({ ...getKeyStatus(), agentReady: isAgentReady() })
})

router.post('/config/anthropic-key', async (req, res) => {
  const { key, persist = true } = req.body || {}
  if (!key || typeof key !== 'string' || !key.trim()) {
    res.status(400).json({ error: 'key is required' })
    return
  }

  // Validate against the real API before accepting — don't store a bad key.
  const v = await validateKey(key.trim())
  if (!v.ok) {
    res.status(400).json({ error: v.error || 'key validation failed' })
    return
  }

  let persisted = false
  try {
    ;({ persisted } = setKey(key.trim(), !!persist))
  } catch (err: any) {
    res.status(500).json({ error: `failed to persist key: ${err?.message || 'write error'}` })
    return
  }

  // Bring the agent online if it started without a key. It connects in the
  // background; wait briefly so the answer usually reports it ready.
  if (!isAgentReady()) {
    startAgent()
    await agentSettled(10_000)
  }

  res.json({ ...getKeyStatus(), agentReady: isAgentReady(), persisted })
})

export default router
