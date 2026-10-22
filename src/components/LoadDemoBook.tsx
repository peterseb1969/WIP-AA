import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Loader2 } from 'lucide-react'
import { loadDemoBook } from '../lib/sse'

/**
 * "Load the demo book": offered only while the book is empty (the server
 * decides, GET /server-api/demo/status), because the demo must never mix
 * into a writer's own novel. Renders nothing otherwise.
 */
export default function LoadDemoBook({ onLoaded }: { onLoaded?: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [available, setAvailable] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [step, setStep] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    fetch(`${import.meta.env.BASE_URL}server-api/demo/status`)
      .then((r) => r.json())
      .then((d: { available?: boolean }) => { if (current) setAvailable(!!d.available) })
      .catch(() => { /* not offered */ })
    return () => { current = false }
  }, [])

  if (!available) return null

  const load = async () => {
    setPhase('loading')
    setError('')
    try {
      await loadDemoBook(setStep)
      await queryClient.invalidateQueries()
      setAvailable(false)
      onLoaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('failed')
      await queryClient.invalidateQueries()
    }
  }

  return (
    <section aria-labelledby="demo-book-title" className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
      <h2 id="demo-book-title" className="flex items-center gap-2 font-semibold text-text">
        <BookOpen className="w-4 h-4 text-primary" />
        {t('demo.title')}
      </h2>
      <p className="mt-1 text-sm text-text-muted">{t('demo.description')}</p>
      {phase === 'loading' ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-text-muted" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          {step || t('demo.loading')}
        </p>
      ) : (
        <button
          onClick={load}
          className="mt-3 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          {t('demo.load')}
        </button>
      )}
      {phase === 'failed' ? <p className="mt-2 text-sm text-red-700" role="alert">{t('demo.failed', { message: error })}</p> : null}
    </section>
  )
}
