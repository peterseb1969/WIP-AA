/**
 * BootstrapGate — wraps the app, gating render on namespace state.
 *
 * Adapted from templates/bootstrap/BootstrapGate.tsx.template (APP_TITLE
 * set; serverApiUrl() helper inlined — paths prefixed with Vite's BASE_URL
 * so they resolve both at '/' in local dev and under /apps/aa behind the
 * gateway). The namespace label is the runtime NAMESPACE, read at render:
 * a module-level copy would capture it before main.tsx has set it.
 *
 * States: checking / wip_unreachable / needs_bootstrap / incomplete /
 * resume_blocked / bootstrapping / error / ready. `incomplete` = the
 * namespace exists, empty, without a bootstrap record; it only OFFERS a
 * resume, never runs one. `resume_blocked` = no record, but the namespace
 * holds documents: it is in use, so no resume is offered, only the server's
 * explanation. The "restore from backup is the user's other option"
 * message under needs_bootstrap is load-bearing — without it the app
 * implicitly says "your only choice is a fresh namespace", which can
 * destroy data the user meant to restore.
 */

import { useState, useEffect, useCallback } from 'react'
import { Database, AlertTriangle, RefreshCw, Loader2, ServerCrash, BookOpen } from 'lucide-react'
import { NAMESPACE } from '../lib/constants'
import { loadDemoBook } from '../lib/sse'
import CommandLine from './CommandLine'
import { bookApi, booksPage } from '../lib/books'

const APP_TITLE = 'AuthorAssist'

type AppStatus = 'checking' | 'wip_unreachable' | 'refused' | 'needs_bootstrap' | 'incomplete' | 'resume_blocked' | 'bootstrapping' | 'ready' | 'error'

interface BootstrapProgress {
  step: string
  detail: string
  done: boolean
  error?: string
}

export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('checking')
  const [progress, setProgress] = useState<BootstrapProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The server's sentence for 'resume_blocked' (the namespace and its documents)
  // and for 'refused' (why this name can't be a book).
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    setStatus('checking')
    setError(null)
    try {
      const res = await fetch(bookApi('server-api/bootstrap/status'))
      // A name the server refuses (400) or does not know (404) is not an
      // outage: show its reason. Anything else that is not ok, and a request
      // that never got an answer, is WIP being unreachable.
      if (res.status === 400 || res.status === 404) {
        const body = await res.json().catch(() => null) as { message?: string } | null
        setBlockedMessage(body?.message || `This book can't be opened (HTTP ${res.status}).`)
        setStatus('refused')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBlockedMessage(data.message ?? null)
      setStatus(data.status as AppStatus)
    } catch {
      setStatus('wip_unreachable')
    }
  }, [])

  useEffect(() => { checkStatus() }, [checkStatus])

  // With `withDemo`, the demo book is loaded into the new, empty book before
  // the app opens ("Bootstrap with the demo book").
  const startBootstrap = useCallback(async (withDemo = false) => {
    setStatus('bootstrapping')
    setProgress(null)
    setError(null)
    let bootstrapped = false

    try {
      const response = await fetch(bookApi('server-api/bootstrap/run'), { method: 'POST' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as BootstrapProgress
              setProgress(data)
              if (eventType === 'complete' && data.done && !data.error) {
                bootstrapped = true
                if (!withDemo) setStatus('ready')
              } else if (eventType === 'error' || data.error) {
                setError(data.error || data.detail)
                setStatus('error')
              }
            } catch { /* skip */ }
            eventType = ''
          }
        }
      }
      if (withDemo && bootstrapped) {
        setProgress({ step: 'demo', detail: 'Loading the demo book…', done: false })
        await loadDemoBook((detail) => setProgress({ step: 'demo', detail, done: false }))
        setStatus('ready')
      }
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }, [])

  if (status === 'ready') return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-semibold">{APP_TITLE}</h1>
          <a href={booksPage()} className="ml-auto text-sm text-blue-700 underline">All books</a>
        </div>

        {status === 'checking' && (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking WIP connection...</span>
          </div>
        )}

        {status === 'wip_unreachable' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-800">WIP is unreachable</p>
                <p className="mt-1 text-sm text-red-600">
                  Cannot connect to the WIP backend. Make sure WIP is running and accessible.
                </p>
              </div>
            </div>
            <button
              onClick={checkStatus}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {status === 'refused' && (
          <div className="space-y-4">
            <div role="alert" className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-800">This can't be opened as a book</p>
                <p className="mt-1 text-sm text-amber-700">{blockedMessage}</p>
              </div>
            </div>
            <a
              href={booksPage()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              Choose another book
            </a>
          </div>
        )}

        {status === 'needs_bootstrap' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-800">Book not set up yet</p>
                <p className="mt-1 text-sm text-amber-700">
                  The book <code className="rounded bg-amber-100 px-1">{NAMESPACE}</code> doesn&apos;t
                  exist yet. Set it up now, or restore it from a backup first and check again.
                </p>
                <p className="mt-3 text-sm text-amber-700">
                  Its name must first be reserved for this app&apos;s API key, with deletion mode full:
                </p>
                <ul className="mt-1 space-y-2 text-sm text-amber-700">
                  <li>
                    <span className="font-medium">Installed with wip-deploy:</span>
                    <CommandLine className="mt-1 bg-amber-100 text-amber-900" command={`wip-deploy app-namespace add wip-aa ${NAMESPACE} --setting deletion_mode=full`} />
                  </li>
                  <li>
                    <span className="font-medium">Key made in the console (RC):</span> widen the key
                    to <code className="rounded bg-amber-100 px-1">{NAMESPACE}</code> with a reservation.
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startBootstrap()}
                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Database className="h-4 w-4" /> Bootstrap
              </button>
              <button
                onClick={checkStatus}
                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
              >
                <RefreshCw className="h-4 w-4" /> Check Again
              </button>
            </div>
            <button
              onClick={() => startBootstrap(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              <BookOpen className="h-4 w-4" /> Bootstrap with the demo book
            </button>
            <p className="text-xs text-gray-400 text-center">
              The demo book is a short mystery that shows every feature.
            </p>
          </div>
        )}

        {status === 'incomplete' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-800">Bootstrap incomplete</p>
                <p className="mt-1 text-sm text-amber-600">
                  The <code className="rounded bg-amber-100 px-1">{NAMESPACE}</code> namespace
                  exists, but an earlier bootstrap never finished. Resuming re-runs every step and
                  keeps what is already there. To start over instead, delete the namespace or restore
                  a backup via the WIP console / <code className="rounded bg-amber-100 px-1">wip-deploy</code>.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startBootstrap()}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Database className="h-4 w-4" /> Resume Bootstrap
              </button>
              <button
                onClick={checkStatus}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                <RefreshCw className="h-4 w-4" /> Check Again
              </button>
            </div>
          </div>
        )}

        {status === 'resume_blocked' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-800">Bootstrap record missing</p>
                <p className="mt-1 text-sm text-red-700">{blockedMessage}</p>
              </div>
            </div>
            <button
              onClick={checkStatus}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4" /> Check Again
            </button>
          </div>
        )}

        {status === 'bootstrapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="font-medium">Bootstrapping...</span>
            </div>
            {progress && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{progress.step}</p>
                <p className="mt-1 text-sm">{progress.detail}</p>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-red-800">Bootstrap failed</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startBootstrap()}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" /> Retry Bootstrap
              </button>
              <button
                onClick={checkStatus}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                <RefreshCw className="h-4 w-4" /> Check Status
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
