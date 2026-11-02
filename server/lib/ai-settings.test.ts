import { beforeEach, describe, expect, it, vi } from 'vitest'

// No settings namespace in WIP: every read 404s, so the defaults apply.
vi.mock('./wip-api.js', () => ({
  wipGet: async (path: string) => { throw new Error(`WIP GET ${path}: 404 Not Found`) },
  wipPost: async () => { throw new Error('no writes in unit tests') },
}))
const anthropic = vi.hoisted(() => ({ key: '' }))
vi.mock('./anthropic-key.js', () => ({
  anthropicKey: () => anthropic.key,
  getKeyStatus: () => ({ configured: !!anthropic.key, source: anthropic.key ? 'env' : 'none', last4: anthropic.key ? anthropic.key.slice(-4) : null, persistable: false }),
}))

const { checkSettings, defaultSettings, forgetSettings, providerKey, setTypedKey, targetFor } = await import('./ai-settings')

const omlx = { provider_id: 'omlx', label: 'oMLX', base_url: 'http://host.containers.internal:8092' }
const claude = { provider_id: 'claude', label: 'Claude', base_url: 'https://api.anthropic.com', key_env: 'ANTHROPIC_API_KEY' }

beforeEach(() => {
  anthropic.key = ''
  forgetSettings()
  delete process.env.CLAUDE_MODEL
  delete process.env.ANALYSE_MODEL
  delete process.env.IMPORT_MODEL
  process.env.WIP_API_KEY = 'wip-secret'
  process.env.AI_KEY_OPENROUTER = 'or-secret-1234'
})

describe('which key a provider gets', () => {
  it('none without a key variable', () => {
    expect(providerKey(omlx)).toBe('')
  })

  it('its own AI_KEY_ variable', () => {
    expect(providerKey({ ...omlx, key_env: 'AI_KEY_OPENROUTER' })).toBe('or-secret-1234')
  })

  it('a typed key only while the provider still names a key variable', () => {
    delete process.env.AI_KEYS_DIR
    setTypedKey('typed-one', 'typed-secret')
    const p = { ...omlx, provider_id: 'typed-one', key_env: 'AI_KEY_TYPED_ONE' }
    expect(providerKey(p)).toBe('typed-secret')
    // the same id, edited to another URL and no key variable: no key goes out
    expect(providerKey({ provider_id: 'typed-one', label: 'x', base_url: 'https://elsewhere.example' })).toBe('')
  })

  it('never another server secret, whatever the settings name', () => {
    expect(providerKey({ ...omlx, key_env: 'WIP_API_KEY' })).toBe('')
  })

  it('the Anthropic key only on Anthropic', () => {
    anthropic.key = 'sk-ant-xyz'
    expect(providerKey(claude)).toBe('sk-ant-xyz')
    expect(providerKey({ ...omlx, key_env: 'ANTHROPIC_API_KEY' })).toBe('')
  })
})

describe('checking settings before they are stored', () => {
  const ok = { providers: [claude, omlx], assignments: [{ use: 'ASK' as const, provider_id: 'omlx', model: 'Qwen3.8' }] }

  it('accepts a consistent set', () => {
    expect(checkSettings(ok)).toEqual([])
  })

  it('refuses a key variable that could name a server secret', () => {
    expect(checkSettings({ ...ok, providers: [{ ...omlx, key_env: 'WIP_API_KEY' }] }).join()).toMatch(/must be ANTHROPIC_API_KEY or start with AI_KEY_/)
  })

  it('refuses sending the Anthropic key elsewhere', () => {
    expect(checkSettings({ ...ok, providers: [{ ...omlx, key_env: 'ANTHROPIC_API_KEY' }] }).join()).toMatch(/only sent to api.anthropic.com/)
  })

  it('refuses duplicates, unknown providers and empty models', () => {
    const problems = checkSettings({
      providers: [omlx, omlx],
      assignments: [
        { use: 'ASK', provider_id: 'nowhere', model: 'x' },
        { use: 'ASK', provider_id: 'omlx', model: ' ' },
      ],
    }).join(' | ')
    expect(problems).toMatch(/'omlx' is listed twice/)
    expect(problems).toMatch(/names provider 'nowhere'/)
    expect(problems).toMatch(/ASK is assigned twice/)
    expect(problems).toMatch(/has no model/)
  })
})

describe('without stored settings', () => {
  it('runs every use on Claude with the models from the environment, as before', () => {
    process.env.CLAUDE_MODEL = 'claude-a'
    process.env.IMPORT_MODEL = 'claude-b'
    expect(defaultSettings().assignments).toEqual([
      { use: 'ASK', provider_id: 'claude', model: 'claude-a' },
      { use: 'ANALYSE', provider_id: 'claude', model: 'claude-a' },
      { use: 'IMPORT_EXTRACT', provider_id: 'claude', model: 'claude-b' },
    ])
  })

  it('says the Anthropic key is missing, as before', async () => {
    expect(await targetFor('ASK')).toEqual({ unavailable: 'No Anthropic API key — set one in Settings.' })
  })

  it('serves a use once the key is there', async () => {
    anthropic.key = 'sk-ant-xyz'
    const t = await targetFor('ANALYSE')
    expect('unavailable' in t).toBe(false)
    if (!('unavailable' in t)) expect(t.provider.provider_id).toBe('claude')
  })
})
