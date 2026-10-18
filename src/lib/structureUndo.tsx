import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useUpdateDocument } from '@wip/react'
import { Undo2, History, X } from 'lucide-react'
import type { ChapterSlot } from './useBookStructure'

/**
 * Undo for book-structure moves (Corkboard drag-and-drop, scene moves).
 *
 * Every move records the chapter order it replaced and the structure
 * version it produced. Undo writes the old order back as a merge PATCH
 * with if_match on that version, so it can never overwrite a change made
 * since (another tab, another person): WIP answers concurrency_conflict and
 * the undo is refused with a message instead.
 *
 * The stack lives above the router, so it survives page changes, and is
 * mirrored to sessionStorage so it also survives a reload of the tab
 * (the if_match check keeps a stale entry from doing harm). The control
 * that offers it sits in the top bar — always there while something can
 * be undone, never covering the page.
 */

interface UndoEntry {
  label: string
  documentId: string
  /** Chapter order before the move — what undo restores. */
  previous: ChapterSlot[]
  /** Structure version the move produced; undo requires it to be current. */
  version: number
}

interface StructureUndo {
  record: (entry: UndoEntry) => void
  /** Undo the moves from `index` (0 = oldest) to the newest, newest first. */
  undoTo: (index: number) => Promise<void>
  entries: UndoEntry[]
  busy: boolean
  error: string | null
  clearError: () => void
}

const Ctx = createContext<StructureUndo | null>(null)
const STORAGE_KEY = 'aa-structure-undo'

function loadStack(): UndoEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UndoEntry[]) : []
  } catch {
    return []
  }
}

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function StructureUndoProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const updateDoc = useUpdateDocument()
  const [stack, setStack] = useState<UndoEntry[]>(loadStack)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack)) } catch { /* storage unavailable */ }
  }, [stack])

  const record = useCallback((entry: UndoEntry) => {
    setStack((s) => [...s, entry])
    setError(null)
  }, [])

  const undoTo = useCallback(async (index: number) => {
    if (busy || index < 0 || index >= stack.length) return
    setBusy(true)
    setError(null)
    let remaining = stack
    // Each undo restores the order before one move. The structure is then at
    // a new version, which the next-older entry must expect instead.
    let expected = stack[stack.length - 1]!.version
    try {
      while (remaining.length > index) {
        const entry = remaining[remaining.length - 1]!
        const result = await updateDoc.mutateAsync({
          documentId: entry.documentId,
          patch: { chapters: entry.previous },
          ifMatch: expected,
        })
        remaining = remaining.slice(0, -1)
        if (result.version != null) expected = result.version
        const below = remaining[remaining.length - 1]
        if (below) remaining = [...remaining.slice(0, -1), { ...below, version: expected }]
        setStack(remaining)
      }
    } catch (err) {
      const conflict = (err as { errorCode?: string }).errorCode === 'concurrency_conflict'
      // A changed structure invalidates every recorded step, not just this one.
      if (conflict) setStack([])
      setError(conflict ? t('undo.conflict') : t('undo.failed', { message: err instanceof Error ? err.message : String(err) }))
    } finally {
      setBusy(false)
    }
  }, [stack, busy, updateDoc, t])

  const undo = useCallback(() => undoTo(stack.length - 1), [undoTo, stack.length])

  // Cmd/Ctrl+Z undoes the last move on any page — but never while the
  // focus is in a text field or the editor, where it must undo typing.
  useEffect(() => {
    if (!stack.length) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isEditableTarget(e.target)) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stack.length, undo])

  return (
    <Ctx.Provider value={{ record, undoTo, entries: stack, busy, error, clearError: () => setError(null) }}>
      {children}
    </Ctx.Provider>
  )
}

/** Record an undoable structure move (null outside the provider). */
export function useStructureUndo() {
  return useContext(Ctx)
}

/**
 * Top-bar control: an Undo icon for the last move and a history list —
 * clicking an entry returns to the state before that move. Quiet by
 * design: only errors are spelled out.
 */
export function StructureUndoControl() {
  const { t } = useTranslation()
  const u = useStructureUndo()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // The history list closes on any click outside it, and on Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!u || (!u.entries.length && !u.error)) return null
  const last = u.entries[u.entries.length - 1]
  const iconBtn = 'p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-colors disabled:opacity-40'
  return (
    <div ref={boxRef} className="ml-auto flex items-center gap-1 text-sm relative">
      {u.error ? (
        <span className="flex items-center gap-1 text-red-600 truncate max-w-80" title={u.error}>
          <span className="truncate">{u.error}</span>
          <button onClick={u.clearError} className="opacity-60 hover:opacity-100 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
        </span>
      ) : null}
      {last ? (
        <>
          <button onClick={() => u.undoTo(u.entries.length - 1)} disabled={u.busy} className={iconBtn}
            title={`${t('undo.undo')}: ${last.label} (${t('undo.shortcut')})`}>
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen((o) => !o)} disabled={u.busy} className={iconBtn} title={t('undo.history')}>
            <History className="w-4 h-4" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
              <div className="px-3 py-1 text-xs text-text-light">{t('undo.history_hint')}</div>
              {u.entries.map((e, i) => ({ e, i })).reverse().map(({ e, i }) => (
                <button key={i} onClick={() => { setOpen(false); u.undoTo(i) }}
                  className="block w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface truncate">
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
