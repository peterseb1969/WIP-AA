import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateDocument } from '@wip/react'
import { Undo2, X } from 'lucide-react'
import type { ChapterSlot } from './useBookStructure'

/**
 * Undo for book-structure moves (Corkboard drag-and-drop, scene moves).
 *
 * Every move records the chapter order it replaced and the structure
 * version it produced. Undo writes the old order back as a merge PATCH
 * with if_match on that version, so it can never overwrite a change made
 * since (another tab, another person): WIP answers concurrency_conflict and
 * the undo is refused with a message instead. The stack lives for the
 * session only.
 */

interface UndoEntry {
  label: string
  documentId: string
  /** Chapter order before the move — what undo restores. */
  previous: ChapterSlot[]
  /** Structure version the move produced; undo requires it to be current. */
  version: number
}

interface Notice {
  text: string
  tone: 'info' | 'error'
  /** Set when the notice offers Undo (the top of the stack). */
  undoable: boolean
}

interface StructureUndo {
  record: (entry: UndoEntry) => void
}

const Ctx = createContext<StructureUndo | null>(null)

const NOTICE_MS = 8000

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function StructureUndoProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const updateDoc = useUpdateDocument()
  const stack = useRef<UndoEntry[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((n: Notice) => {
    setNotice(n)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }, [])

  const record = useCallback((entry: UndoEntry) => {
    stack.current.push(entry)
    show({ text: entry.label, tone: 'info', undoable: true })
  }, [show])

  const undo = useCallback(async () => {
    const entry = stack.current[stack.current.length - 1]
    if (!entry || busy) return
    setBusy(true)
    try {
      const result = await updateDoc.mutateAsync({
        documentId: entry.documentId,
        patch: { chapters: entry.previous },
        ifMatch: entry.version,
      })
      stack.current.pop()
      // The structure now equals the state right after the next-older move,
      // at a new version — that entry's undo must expect this version.
      const below = stack.current[stack.current.length - 1]
      if (below && result.version != null) below.version = result.version
      show({
        text: t('undo.undone', { label: entry.label }),
        tone: 'info',
        undoable: stack.current.length > 0,
      })
    } catch (err) {
      const conflict = (err as { errorCode?: string }).errorCode === 'concurrency_conflict'
      // A changed structure invalidates every recorded step, not just this one.
      if (conflict) stack.current = []
      show({
        text: conflict ? t('undo.conflict') : t('undo.failed', { message: err instanceof Error ? err.message : String(err) }),
        tone: 'error',
        undoable: false,
      })
    } finally {
      setBusy(false)
    }
  }, [busy, updateDoc, show, t])

  // Cmd/Ctrl+Z undoes a move while its notice is showing — but never while
  // the focus is in a text field or the editor, where it must undo typing.
  useEffect(() => {
    if (!notice?.undoable) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isEditableTarget(e.target)) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [notice, undo])

  const next = stack.current[stack.current.length - 1]

  return (
    <Ctx.Provider value={{ record }}>
      {children}
      {notice && (
        <div
          role="status"
          className={`fixed z-50 bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-lg shadow-lg text-sm ${
            notice.tone === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gray-900 text-white'
          }`}
        >
          <span className="truncate">{notice.text}</span>
          {notice.undoable && next ? (
            <button
              onClick={undo}
              disabled={busy}
              title={t('undo.shortcut')}
              className="flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50 flex-shrink-0"
            >
              <Undo2 className="w-4 h-4" />
              {t('undo.undo')}
            </button>
          ) : null}
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 flex-shrink-0" title={t('common.close', { defaultValue: 'Close' })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </Ctx.Provider>
  )
}

/** Record an undoable structure move (no-op outside the provider). */
export function useStructureUndo() {
  return useContext(Ctx)
}
