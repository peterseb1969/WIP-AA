/**
 * Runtime configuration endpoints — set/rotate the Anthropic API key from the
 * app's Settings UI without a redeploy (mirrors WIP-KB's CASE-508 pattern).
 *
 *   GET  /server-api/config/anthropic-key  → masked status (never the key)
 *   POST /server-api/config/anthropic-key  → { key, persist? }, validated then set
 *
 * AI models (DESIGN.md "AI models: providers and their uses", lib/ai-settings.ts):
 *   GET  /server-api/config/ai         → settings in effect, the settings namespace's state, key states
 *   POST /server-api/config/ai/setup   → bootstrap the settings namespace, store the defaults
 *   PUT  /server-api/config/ai         → { providers, assignments }: store a new version
 *   POST /server-api/config/ai/models  → { provider }: the provider's model list
 *   POST /server-api/config/ai/test    → { provider, model, tools? }: one small request
 *   POST /server-api/config/ai/key     → { provider_id, key }: a typed key for a stored provider
 *
 * No app-level auth gate: AuthorAssist has no auth layer, and behind the
 * wip-deploy gateway the whole app is already auth-gated (wip-app.yaml
 * `/apps/aa auth_required: true`), so this endpoint is no more exposed than
 * /api/ask. If finer control is ever needed, gate on X-WIP-Groups here.
 */

import { Router } from 'express'
import { getKeyStatus, validateKey, setKey } from './lib/anthropic-key.js'
import { agentSettled, isAgentReady, startAgent } from './agent.js'
import {
  AI_USES, defaultSettings, forgetSettings, keyState, listModels, loadSettings, saveSettings,
  setTypedKey, settingsNamespace, testModel, type AiProvider, type AiSettings,
} from './lib/ai-settings.js'
import { checkStatusDetail, runBootstrap, SETTINGS } from './lib/bootstrap.js'

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

// ---------- AI models ----------

async function aiState() {
  const settings = await loadSettings()
  const setup = await checkStatusDetail(settingsNamespace(), SETTINGS).catch(() => ({ status: 'wip_unreachable' as const }))
  return {
    namespace: settingsNamespace(),
    setup: setup.status,
    source: settings.source,
    version: settings.version ?? null,
    error: settings.error ?? null,
    uses: AI_USES,
    providers: settings.providers.map((p) => ({ ...p, key: keyState(p) })),
    assignments: settings.assignments,
    agentReady: isAgentReady(),
  }
}

router.get('/config/ai', async (_req, res) => {
  res.json(await aiState())
})

router.post('/config/ai/setup', async (_req, res) => {
  try {
    await runBootstrap(settingsNamespace(), () => {}, SETTINGS)
    // Start from what the app did before settings existed.
    await saveSettings(defaultSettings())
    res.json(await aiState())
  } catch (err) {
    forgetSettings()
    res.status(400).json({ error: (err as Error).message })
  }
})

router.put('/config/ai', async (req, res) => {
  const body = req.body as Partial<AiSettings>
  if (!Array.isArray(body?.providers) || !Array.isArray(body?.assignments)) {
    res.status(400).json({ error: 'providers and assignments are required' })
    return
  }
  try {
    await saveSettings({ providers: body.providers, assignments: body.assignments })
    res.json(await aiState())
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
})

/**
 * The provider a model list or Test is for. A provider as stored is used with
 * its key; one being edited (not stored yet, or stored differently) is tried
 * without a key, so an unsaved URL can never receive a stored key.
 */
async function providerForTrial(sent: AiProvider | undefined): Promise<AiProvider | string> {
  if (!sent || typeof sent.base_url !== 'string' || !/^https?:\/\/\S+$/.test(sent.base_url)) return 'a provider with a base URL (http or https) is required'
  const stored = (await loadSettings()).providers.find((p) => p.provider_id === sent.provider_id)
  const same = stored && stored.base_url === sent.base_url.replace(/\/+$/, '') && (stored.key_env ?? '') === (sent.key_env ?? '')
  if (same) return stored
  const { key_env: _dropped, ...withoutKey } = sent
  return withoutKey
}

router.post('/config/ai/models', async (req, res) => {
  const p = await providerForTrial(req.body?.provider)
  if (typeof p === 'string') { res.status(400).json({ error: p }); return }
  try {
    res.json({ models: await listModels(p) })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

router.post('/config/ai/test', async (req, res) => {
  const p = await providerForTrial(req.body?.provider)
  if (typeof p === 'string') { res.status(400).json({ error: p }); return }
  const model = req.body?.model
  if (typeof model !== 'string' || !model.trim()) { res.status(400).json({ error: 'model is required' }); return }
  res.json(await testModel(p, model.trim(), !!req.body?.tools))
})

router.post('/config/ai/key', async (req, res) => {
  const { provider_id: id, key } = req.body || {}
  if (typeof key !== 'string' || !key.trim()) { res.status(400).json({ error: 'key is required' }); return }
  const p = (await loadSettings()).providers.find((x) => x.provider_id === id)
  if (!p || !p.key_env) { res.status(400).json({ error: 'only a stored provider that needs a key takes one' }); return }
  if (p.key_env === 'ANTHROPIC_API_KEY') { res.status(400).json({ error: 'set the Anthropic key with the Anthropic key field' }); return }
  try {
    const { persisted } = setTypedKey(p.provider_id, key.trim())
    res.json({ ...(await aiState()), persisted })
  } catch (err) {
    res.status(500).json({ error: `failed to keep the key: ${(err as Error).message}` })
  }
})

export default router
