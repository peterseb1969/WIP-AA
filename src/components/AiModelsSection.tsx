/**
 * Settings → AI models: the providers the app may use and which provider and
 * model serve each use (DESIGN.md "AI models: providers and their uses";
 * server/lib/ai-settings.ts, server/config.routes.ts).
 *
 * The form edits a draft; Save stores it as a new version of the one
 * settings document. Model lists and Tests run on the server: a provider as
 * stored is tried with its key, an edited one without any key.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Cpu, ListRestart, Loader2, Plus, Trash2, XCircle } from 'lucide-react'
import CommandLine from './CommandLine'

const API = `${import.meta.env.BASE_URL}server-api/config/ai`

type Use = 'ASK' | 'ANALYSE' | 'IMPORT_EXTRACT'

interface Provider {
  provider_id: string
  label: string
  base_url: string
  key_env?: string
}

interface KeyState {
  needed: boolean
  configured: boolean
  last4: string | null
  source: 'typed' | 'file' | 'env' | 'none'
  persistable: boolean
}

interface Assignment {
  use: Use
  provider_id: string
  model: string
}

interface AiState {
  namespace: string
  setup: 'needs_bootstrap' | 'incomplete' | 'resume_blocked' | 'ready' | 'wip_unreachable' | string
  source: 'wip' | 'default'
  version: number | null
  error: string | null
  uses: Use[]
  providers: Array<Provider & { key: KeyState }>
  assignments: Assignment[]
}

interface TestResult {
  ok: boolean
  ms: number
  toolCall?: boolean
  error?: string
}

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  return data as T
}

const input = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
const smallButton = 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50'

export default function AiModelsSection() {
  const { t } = useTranslation()
  const [state, setState] = useState<AiState | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [models, setModels] = useState<Record<string, string[]>>({})
  const [tests, setTests] = useState<Partial<Record<Use, TestResult | 'running'>>>({})
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const adopt = useCallback((s: AiState) => {
    setState(s)
    setProviders(s.providers.map(({ key: _key, ...p }) => p))
    setAssignments(s.uses.map((use) => s.assignments.find((a) => a.use === use) ?? { use, provider_id: '', model: '' }))
  }, [])

  const load = useCallback(() => {
    call<AiState>('').then(adopt).catch((err: Error) => setError(err.message))
  }, [adopt])

  useEffect(load, [load])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try { await work() } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  if (!state) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-5 mt-6">
        <p className="text-sm text-text-muted">{error ?? t('common.loading')}</p>
      </section>
    )
  }

  const ready = state.setup === 'ready'
  const keyOf = (id: string) => state.providers.find((p) => p.provider_id === id)?.key
  const storedSame = (p: Provider) => {
    const s = state.providers.find((x) => x.provider_id === p.provider_id)
    return !!s && s.base_url === p.base_url.replace(/\/+$/, '') && (s.key_env ?? '') === (p.key_env ?? '')
  }
  const setProvider = (i: number, patch: Partial<Provider>) =>
    setProviders((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setAssignment = (use: Use, patch: Partial<Assignment>) =>
    setAssignments((as) => as.map((a) => (a.use === use ? { ...a, ...patch } : a)))

  const loadModels = (p: Provider) => run(async () => {
    const { models: list } = await call<{ models: string[] }>('/models', 'POST', { provider: p })
    setModels((m) => ({ ...m, [p.provider_id]: list }))
  })

  const test = async (a: Assignment) => {
    const p = providers.find((x) => x.provider_id === a.provider_id)
    if (!p || !a.model) return
    setTests((r) => ({ ...r, [a.use]: 'running' }))
    try {
      const result = await call<TestResult>('/test', 'POST', { provider: p, model: a.model, tools: a.use === 'ASK' })
      setTests((r) => ({ ...r, [a.use]: result }))
    } catch (err) {
      setTests((r) => ({ ...r, [a.use]: { ok: false, ms: 0, error: (err as Error).message } }))
    }
  }

  const save = () => run(async () => {
    const body = {
      providers: providers.map((p) => ({ ...p, key_env: p.key_env?.trim() || undefined })),
      assignments: assignments.filter((a) => a.provider_id && a.model.trim()),
    }
    adopt(await call<AiState>('', 'PUT', body))
    setSaved(true)
  })

  const storeKey = (p: Provider) => run(async () => {
    adopt(await call<AiState>('/key', 'POST', { provider_id: p.provider_id, key: keys[p.provider_id] }))
    setKeys((k) => ({ ...k, [p.provider_id]: '' }))
  })

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-5 mt-6 space-y-5" aria-labelledby="ai-models-title">
      <div>
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 id="ai-models-title" className="text-lg font-semibold text-text">{t('settings.ai.title')}</h2>
        </div>
        <p className="text-sm text-text-muted mt-1">{t('settings.ai.description')}</p>
      </div>

      {!ready && (
        <div className="space-y-3">
          <p className="text-sm text-text">{t('settings.ai.not_set_up')}</p>
          <ul className="text-sm text-text-muted list-disc pl-5">
            {state.assignments.map((a) => (
              <li key={a.use}>{t(`settings.ai.use_${a.use}`)}: {a.model}</li>
            ))}
          </ul>
          <p className="text-sm text-text-muted">{t('settings.ai.reserve_hint')}</p>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>
              {t('settings.ai.via_deploy')}
              <CommandLine className="mt-1 bg-gray-100 px-3 py-2 text-text" command={`wip-deploy app-namespace add wip-aa ${state.namespace}`} />
            </li>
            <li>{t('settings.ai.via_console', { name: state.namespace })}</li>
          </ul>
          <button
            onClick={() => run(async () => adopt(await call<AiState>('/setup', 'POST')))}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 text-sm font-medium"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('settings.ai.set_up')}
          </button>
        </div>
      )}

      {ready && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-text mb-2">{t('settings.ai.providers')}</h3>
            <ul className="space-y-3" aria-label={t('settings.ai.providers')}>
              {providers.map((p, i) => {
                const key = storedSame(p) ? keyOf(p.provider_id) : undefined
                return (
                  <li key={i} className="border border-gray-200 rounded-md p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs text-text-muted">
                        {t('settings.ai.provider_label')}
                        <input className={input} value={p.label} onChange={(e) => setProvider(i, { label: e.target.value })} />
                      </label>
                      <label className="text-xs text-text-muted">
                        {t('settings.ai.provider_id')}
                        <input className={input} value={p.provider_id} onChange={(e) => setProvider(i, { provider_id: e.target.value })} />
                      </label>
                      <label className="text-xs text-text-muted sm:col-span-2">
                        {t('settings.ai.base_url')}
                        <input className={input} value={p.base_url} placeholder="http://host.containers.internal:8092" onChange={(e) => setProvider(i, { base_url: e.target.value })} />
                      </label>
                      <label className="text-xs text-text-muted">
                        {t('settings.ai.key_env')}
                        <input className={input} value={p.key_env ?? ''} placeholder="AI_KEY_…" onChange={(e) => setProvider(i, { key_env: e.target.value })} />
                      </label>
                      <div className="text-xs text-text-muted self-end pb-1.5">
                        {!p.key_env ? t('settings.ai.key_not_needed')
                          : !key ? t('settings.ai.key_after_save')
                          : key.configured ? <span className="text-success">{t('settings.ai.key_set', { last4: key.last4 })}</span>
                          : <span className="text-danger">{t('settings.ai.key_missing', { name: p.key_env })}</span>}
                      </div>
                    </div>
                    {key && key.needed && p.key_env !== 'ANTHROPIC_API_KEY' && (
                      <div className="flex gap-2 items-end">
                        <label className="text-xs text-text-muted flex-1">
                          {t('settings.ai.enter_key', { label: p.label })}
                          <input type="password" autoComplete="off" className={input} value={keys[p.provider_id] ?? ''} onChange={(e) => setKeys((k) => ({ ...k, [p.provider_id]: e.target.value }))} />
                        </label>
                        <button className={smallButton} disabled={busy || !keys[p.provider_id]?.trim()} onClick={() => storeKey(p)}>{t('settings.ai.store_key')}</button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button className={smallButton} disabled={busy || !p.base_url} onClick={() => loadModels(p)}>
                        <ListRestart className="w-3 h-3" /> {t('settings.ai.load_models')}
                      </button>
                      {models[p.provider_id] && <span className="text-xs text-text-muted self-center">{t('settings.ai.models_found', { count: models[p.provider_id]!.length })}</span>}
                      <button className={`${smallButton} ml-auto`} aria-label={t('settings.ai.remove', { label: p.label || p.provider_id })} onClick={() => setProviders((ps) => ps.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <button className={`${smallButton} mt-2`} onClick={() => setProviders((ps) => [...ps, { provider_id: '', label: '', base_url: '' }])}>
              <Plus className="w-3 h-3" /> {t('settings.ai.add_provider')}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text mb-2">{t('settings.ai.uses')}</h3>
            <div className="space-y-3">
              {assignments.map((a) => {
                const result = tests[a.use]
                return (
                  <fieldset key={a.use} className="border border-gray-200 rounded-md p-3">
                    <legend className="text-sm font-medium text-text px-1">{t(`settings.ai.use_${a.use}`)}</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs text-text-muted">
                        {t('settings.ai.provider')}
                        <select className={input} value={a.provider_id} onChange={(e) => setAssignment(a.use, { provider_id: e.target.value })}>
                          <option value="">—</option>
                          {providers.filter((p) => p.provider_id).map((p) => <option key={p.provider_id} value={p.provider_id}>{p.label || p.provider_id}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-text-muted">
                        {t('settings.ai.model')}
                        <input className={input} list={`models-${a.use}`} value={a.model} onChange={(e) => setAssignment(a.use, { model: e.target.value })} />
                        <datalist id={`models-${a.use}`}>
                          {(models[a.provider_id] ?? []).map((m) => <option key={m} value={m} />)}
                        </datalist>
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button className={smallButton} disabled={!a.provider_id || !a.model || result === 'running'} onClick={() => test(a)}>
                        {result === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {a.use === 'ASK' ? t('settings.ai.test_tools') : t('settings.ai.test')}
                      </button>
                      {result && result !== 'running' && (
                        <span role="status" className={`inline-flex items-center gap-1 text-xs ${result.ok ? 'text-success' : 'text-danger'}`}>
                          {result.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {result.ok
                            ? t('settings.ai.test_ok', { seconds: (result.ms / 1000).toFixed(1) })
                            : result.error ?? t('settings.ai.test_no_tools')}
                        </span>
                      )}
                    </div>
                  </fieldset>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 text-sm font-medium">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('settings.ai.save')}
            </button>
            {state.version != null && <span className="text-xs text-text-muted">{t('settings.ai.version', { version: state.version })}</span>}
            {saved && <span className="inline-flex items-center gap-1 text-sm text-success"><CheckCircle2 className="w-4 h-4" /> {t('settings.ai.saved')}</span>}
          </div>
        </>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
