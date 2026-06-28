import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

// Vite BASE_URL always ends in '/'. '/' in dev, '/apps/aa/' behind the gateway.
const SERVER_API = `${import.meta.env.BASE_URL}server-api`

interface KeyStatus {
  configured: boolean
  source: 'override' | 'file' | 'env' | 'none'
  last4: string | null
  persistable: boolean
  agentReady: boolean
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [key, setKey] = useState('')
  const [persist, setPersist] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_API}/config/anthropic-key`)
      if (res.ok) setStatus(await res.json())
    } catch {
      /* leave status null — shown as unknown */
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!key.trim()) return
      setBusy(true)
      setError(null)
      setOk(null)
      try {
        const res = await fetch(`${SERVER_API}/config/anthropic-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: key.trim(), persist }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || `HTTP ${res.status}`)
        } else {
          setStatus(data)
          setKey('')
          setOk(
            data.persisted
              ? t('settings.saved_persisted')
              : t('settings.saved_session'),
          )
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [key, persist, t],
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-text">{t('settings.title')}</h1>
      </div>
      <p className="text-sm text-text-muted mb-6">{t('settings.anthropic.description')}</p>

      {/* Current status */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-text mb-3">{t('settings.anthropic.status')}</h2>
        {status ? (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-text-muted">{t('settings.anthropic.configured')}</dt>
            <dd className="text-text">
              {status.configured ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('settings.anthropic.yes_last4', { last4: status.last4 })}
                </span>
              ) : (
                <span className="text-text-muted">{t('common.no')}</span>
              )}
            </dd>
            <dt className="text-text-muted">{t('settings.anthropic.source')}</dt>
            <dd className="text-text">{t(`settings.anthropic.source_${status.source}`)}</dd>
            <dt className="text-text-muted">{t('settings.anthropic.agent')}</dt>
            <dd className="text-text">
              {status.agentReady
                ? t('settings.anthropic.agent_ready')
                : t('settings.anthropic.agent_not_ready')}
            </dd>
          </dl>
        ) : (
          <p className="text-sm text-text-muted">{t('common.loading')}</p>
        )}
      </div>

      {/* Set / rotate key */}
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text">{t('settings.anthropic.set_title')}</h2>

        <div>
          <label htmlFor="anthropic-key" className="block text-sm text-text-muted mb-1">
            {t('settings.anthropic.key_label')}
          </label>
          <input
            id="anthropic-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <label className={`flex items-center gap-2 text-sm ${status?.persistable ? 'text-text' : 'text-text-muted'}`}>
          <input
            type="checkbox"
            checked={persist && !!status?.persistable}
            disabled={!status?.persistable}
            onChange={(e) => setPersist(e.target.checked)}
          />
          {status?.persistable
            ? t('settings.anthropic.persist')
            : t('settings.anthropic.persist_unavailable')}
        </label>

        {error && (
          <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {ok && (
          <div className="flex items-start gap-2 text-sm text-success bg-success/5 border border-success/20 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{ok}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !key.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? t('settings.anthropic.validating') : t('settings.anthropic.set_button')}
        </button>
      </form>
    </div>
  )
}
