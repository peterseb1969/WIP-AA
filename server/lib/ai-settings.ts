/**
 * Which AI provider and model serve each use (DESIGN.md "AI models:
 * providers and their uses").
 *
 * The settings are one AA_AI_SETTINGS document in the app's settings
 * namespace (SETTINGS_NAMESPACE, default `aa-settings`). While that namespace
 * is not set up, or WIP cannot be read, every use runs on the built-in
 * defaults: the Claude provider, CLAUDE_MODEL (ANALYSE_MODEL / IMPORT_MODEL),
 * the Anthropic key as before. Every provider speaks the Anthropic Messages
 * API, so one client serves them all.
 *
 * Keys never enter WIP. A provider's key is, in order: one typed into the
 * Settings page (kept in AI_KEYS_DIR/<provider_id> when that mount is set,
 * else until restart), then the environment variable its `key_env` names.
 * The built-in Claude provider keeps the Anthropic key's own resolution
 * (lib/anthropic-key.ts).
 */
import Anthropic from '@anthropic-ai/sdk'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { anthropicKey, getKeyStatus as anthropicKeyStatus } from './anthropic-key.js'
import { wipGet, wipPost } from './wip-api.js'

export type AiUse = 'ASK' | 'ANALYSE' | 'IMPORT_EXTRACT'
export const AI_USES: AiUse[] = ['ASK', 'ANALYSE', 'IMPORT_EXTRACT']

export interface AiProvider {
  provider_id: string
  label: string
  base_url: string
  /** Name of the environment variable holding the key; absent: no key needed. */
  key_env?: string
}

export interface AiAssignment {
  use: AiUse
  provider_id: string
  model: string
}

export interface AiSettings {
  providers: AiProvider[]
  assignments: AiAssignment[]
}

export const settingsNamespace = (): string => process.env.SETTINGS_NAMESPACE || 'aa-settings'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const CLAUDE_ID = 'claude'

/** The settings in effect while none are stored: exactly the behaviour before settings existed. */
export function defaultSettings(): AiSettings {
  const claude = process.env.CLAUDE_MODEL || DEFAULT_MODEL
  return {
    providers: [{ provider_id: CLAUDE_ID, label: 'Claude (Anthropic)', base_url: 'https://api.anthropic.com', key_env: 'ANTHROPIC_API_KEY' }],
    assignments: [
      { use: 'ASK', provider_id: CLAUDE_ID, model: claude },
      { use: 'ANALYSE', provider_id: CLAUDE_ID, model: process.env.ANALYSE_MODEL || claude },
      { use: 'IMPORT_EXTRACT', provider_id: CLAUDE_ID, model: process.env.IMPORT_MODEL || claude },
    ],
  }
}

// ---------- Reading and writing the settings document ----------

export interface LoadedSettings extends AiSettings {
  /** 'wip': the stored document; 'default': none stored (or unreadable). */
  source: 'wip' | 'default'
  documentId?: string
  version?: number
  /** Why the defaults are in effect, when WIP could not be read. */
  error?: string
}

const CACHE_MS = 10_000
let cache: { at: number; value: LoadedSettings } | null = null

export function forgetSettings(): void {
  cache = null
}

async function settingsTemplate(): Promise<{ template_id: string; version: number } | null> {
  try {
    return (await wipGet(`/api/template-store/templates/by-value/AA_AI_SETTINGS?namespace=${settingsNamespace()}`)) as { template_id: string; version: number }
  } catch {
    return null // namespace or template not set up: the defaults apply
  }
}

/** The settings in effect, from WIP when stored, else the defaults. Cached briefly. */
export async function loadSettings(): Promise<LoadedSettings> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  let value: LoadedSettings
  try {
    const tpl = await settingsTemplate()
    const docs = tpl
      ? (await wipGet(
          `/api/document-store/documents?namespace=${settingsNamespace()}&template_id=${tpl.template_id}&status=active&page_size=1`,
        )) as { items?: Array<{ document_id: string; version: number; data: Partial<AiSettings> }> }
      : { items: [] }
    const doc = docs.items?.[0]
    value = doc
      ? {
          source: 'wip',
          documentId: doc.document_id,
          version: doc.version,
          providers: doc.data.providers ?? [],
          assignments: (doc.data.assignments ?? []).map((a) => ({ ...a, use: termValue(a.use) as AiUse })),
        }
      : { source: 'default', ...defaultSettings() }
  } catch (err) {
    value = { source: 'default', ...defaultSettings(), error: (err as Error).message }
  }
  cache = { at: Date.now(), value }
  return value
}

// A term field may come back as its value or as a resolved object.
function termValue(v: unknown): string {
  if (v && typeof v === 'object' && 'value' in v) return String((v as { value: unknown }).value)
  return String(v)
}

// A provider may name only these variables for its key, so the settings can
// never send another server secret (WIP_API_KEY, …) to a provider's URL. The
// template's pattern says the same. The Anthropic key goes to Anthropic only.
const KEY_ENV = /^(ANTHROPIC_API_KEY|AI_KEY_[A-Z0-9_]{1,56})$/
const ANTHROPIC_HOST = 'api.anthropic.com'

function hostOf(url: string): string {
  try { return new URL(url).host } catch { return '' }
}

/** Problems that make a settings payload unusable, before WIP validates it. */
export function checkSettings(s: AiSettings): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const p of s.providers) {
    if (p.key_env && !KEY_ENV.test(p.key_env)) problems.push(`provider '${p.provider_id}': the key variable must be ANTHROPIC_API_KEY or start with AI_KEY_`)
    if (p.key_env === 'ANTHROPIC_API_KEY' && hostOf(p.base_url) !== ANTHROPIC_HOST) problems.push(`provider '${p.provider_id}': ANTHROPIC_API_KEY is only sent to ${ANTHROPIC_HOST}`)
    if (ids.has(p.provider_id)) problems.push(`provider '${p.provider_id}' is listed twice`)
    ids.add(p.provider_id)
  }
  const uses = new Set<string>()
  for (const a of s.assignments) {
    if (uses.has(a.use)) problems.push(`use ${a.use} is assigned twice`)
    uses.add(a.use)
    if (!ids.has(a.provider_id)) problems.push(`use ${a.use} names provider '${a.provider_id}', which is not in the list`)
    if (!a.model?.trim()) problems.push(`use ${a.use} has no model`)
  }
  return problems
}

/** Store the settings (a new version of the one document). Throws with WIP's reason. */
export async function saveSettings(s: AiSettings): Promise<LoadedSettings> {
  const problems = checkSettings(s)
  if (problems.length) throw new Error(problems.join('; '))
  const tpl = await settingsTemplate()
  if (!tpl) throw new Error(`The settings namespace '${settingsNamespace()}' is not set up yet.`)
  const clean = (p: AiProvider): AiProvider => ({
    provider_id: p.provider_id,
    label: p.label,
    base_url: p.base_url.replace(/\/+$/, ''),
    ...(p.key_env ? { key_env: p.key_env } : {}),
  })
  const result = (await wipPost('/api/document-store/documents', [{
    template_id: tpl.template_id,
    template_version: tpl.version,
    namespace: settingsNamespace(),
    data: {
      scope: 'app',
      providers: s.providers.map(clean),
      assignments: s.assignments.map((a) => ({ use: a.use, provider_id: a.provider_id, model: a.model.trim() })),
    },
  }])) as { results?: Array<{ status: string; error?: string }> }
  const item = result.results?.[0]
  if (!item || item.status === 'error') throw new Error(item?.error || 'WIP did not store the settings')
  forgetSettings()
  return loadSettings()
}

// ---------- Keys ----------

const typedKeys = new Map<string, string>()

function keyFile(providerId: string): string | null {
  const dir = process.env.AI_KEYS_DIR
  return dir ? join(dir, providerId) : null
}

function keyFromFile(providerId: string): string {
  const f = keyFile(providerId)
  if (!f) return ''
  try { return readFileSync(f, 'utf-8').trim() } catch { return '' }
}

/** The key for a provider, or '' when none is set. */
export function providerKey(p: AiProvider): string {
  // No key variable: no key at all, not even one typed for this id earlier.
  if (!p.key_env || !KEY_ENV.test(p.key_env)) return ''
  if (p.key_env === 'ANTHROPIC_API_KEY') return hostOf(p.base_url) === ANTHROPIC_HOST ? anthropicKey() : ''
  return typedKeys.get(p.provider_id) || keyFromFile(p.provider_id) || (p.key_env ? process.env[p.key_env] || '' : '')
}

export interface KeyState {
  needed: boolean
  configured: boolean
  /** Last 4 characters, never the key. */
  last4: string | null
  source: 'typed' | 'file' | 'env' | 'none'
  /** Whether a typed key survives a restart (AI_KEYS_DIR set). */
  persistable: boolean
}

export function keyState(p: AiProvider): KeyState {
  if (!p.key_env) return { needed: false, configured: true, last4: null, source: 'none', persistable: !!process.env.AI_KEYS_DIR }
  if (p.key_env === 'ANTHROPIC_API_KEY') {
    const s = anthropicKeyStatus()
    const source = s.source === 'override' ? 'typed' : s.source === 'file' ? 'file' : s.source === 'env' ? 'env' : 'none'
    return { needed: true, configured: s.configured, last4: s.last4, source, persistable: s.persistable }
  }
  const key = providerKey(p)
  const source = typedKeys.has(p.provider_id) ? 'typed' : keyFromFile(p.provider_id) ? 'file' : key ? 'env' : 'none'
  return { needed: true, configured: !!key, last4: key ? key.slice(-4) : null, source, persistable: !!process.env.AI_KEYS_DIR }
}

/** Keep a key typed into Settings: in AI_KEYS_DIR when set, else until restart. */
export function setTypedKey(providerId: string, key: string): { persisted: boolean } {
  typedKeys.set(providerId, key)
  const f = keyFile(providerId)
  if (!f) return { persisted: false }
  mkdirSync(process.env.AI_KEYS_DIR!, { recursive: true })
  writeFileSync(f, key, { mode: 0o600 })
  return { persisted: true }
}

// ---------- Clients ----------

/** An Anthropic client for a provider. A provider without a key gets a placeholder the server ignores. */
export function clientFor(p: AiProvider): Anthropic {
  const key = providerKey(p)
  return new Anthropic({ apiKey: key || 'not-needed', baseURL: p.base_url })
}

export interface UseTarget {
  client: Anthropic
  model: string
  provider: AiProvider
}

/** The client and model for one use, or the reason there is none. */
export async function targetFor(use: AiUse): Promise<UseTarget | { unavailable: string }> {
  const s = await loadSettings()
  const a = s.assignments.find((x) => x.use === use)
  if (!a) return { unavailable: `No AI model is assigned to ${use} — choose one in Settings.` }
  const p = s.providers.find((x) => x.provider_id === a.provider_id)
  if (!p) return { unavailable: `The provider '${a.provider_id}' chosen for ${use} is not in the settings.` }
  if (p.key_env && !providerKey(p)) {
    return { unavailable: p.provider_id === CLAUDE_ID ? 'No Anthropic API key — set one in Settings.' : `No key for ${p.label} — set ${p.key_env} or enter one in Settings.` }
  }
  return { client: clientFor(p), model: a.model, provider: p }
}

/** targetFor, throwing the reason instead of returning it. */
export async function requireTarget(use: AiUse): Promise<UseTarget> {
  const t = await targetFor(use)
  if ('unavailable' in t) throw new Error(t.unavailable)
  return t
}

// ---------- Model list and Test ----------

/** The models a provider offers (its /v1/models), sorted. */
export async function listModels(p: AiProvider): Promise<string[]> {
  const page = await clientFor(p).models.list({ limit: 1000 })
  return page.data.map((m) => m.id).sort()
}

export interface TestResult {
  ok: boolean
  ms: number
  /** For a tool test: whether the model answered with a tool call. */
  toolCall?: boolean
  error?: string
}

/**
 * Send one small request. With `tools`, ask a question only a tool can answer
 * and report whether the model called it: the Ask bar works only with models
 * that call tools.
 */
export async function testModel(p: AiProvider, model: string, tools = false): Promise<TestResult> {
  const started = Date.now()
  try {
    const res = await clientFor(p).messages.create({
      model,
      max_tokens: tools ? 512 : 16,
      messages: [{ role: 'user', content: tools ? 'How many chapters does the book have? Use the tool.' : 'Reply with OK.' }],
      ...(tools ? {
        tools: [{
          name: 'count_chapters',
          description: 'Returns the number of chapters in the book',
          input_schema: { type: 'object' as const, properties: {} },
        }],
      } : {}),
    })
    const toolCall = res.content.some((b) => b.type === 'tool_use')
    return { ok: !tools || toolCall, ms: Date.now() - started, ...(tools ? { toolCall } : {}) }
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: (err as Error).message }
  }
}
