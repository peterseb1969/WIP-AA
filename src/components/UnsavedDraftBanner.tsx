import { useState, useEffect, useCallback, useRef } from 'react'
import { useWipClient } from '@wip/react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

interface DraftEntry {
  sceneId: string
  title: string
  savedAt: number
}

/** Custom event name fired when scene drafts change in localStorage */
export const DRAFT_CHANGED_EVENT = 'aa-draft-changed'

/** Custom event fired when user discards a draft — scene editor should reset */
export const DRAFT_DISCARD_EVENT = 'aa-draft-discard'

/** Fire this after writing or removing a scene draft to refresh the banner */
export function notifyDraftChange() {
  window.dispatchEvent(new Event(DRAFT_CHANGED_EVENT))
}

/** Fire this to tell the scene editor to discard and reload from WIP */
export function notifyDraftDiscard(sceneId: string) {
  window.dispatchEvent(new CustomEvent(DRAFT_DISCARD_EVENT, { detail: { sceneId } }))
}

/** Remove all scene drafts from localStorage */
export function clearAllDrafts() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('aa-scene-draft-')) keys.push(key)
  }
  keys.forEach((k) => localStorage.removeItem(k))
  notifyDraftChange()
}

function scanDrafts(): DraftEntry[] {
  const result: DraftEntry[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('aa-scene-draft-')) continue
      const sceneId = key.replace('aa-scene-draft-', '')
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const draft = JSON.parse(raw) as { content: string; title?: string; savedAt: number }
      if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
        result.push({ sceneId, title: draft.title || 'Untitled scene', savedAt: draft.savedAt })
      }
    }
  } catch { /* ignore corrupt localStorage */ }
  return result
}

export default function UnsavedDraftBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [drafts, setDrafts] = useState<DraftEntry[]>(scanDrafts)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const refresh = useCallback(() => setDrafts(scanDrafts()), [])

  useEffect(() => {
    window.addEventListener('storage', refresh)
    window.addEventListener(DRAFT_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener(DRAFT_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  // Clear dismissed set when drafts change (e.g. new draft appears)
  useEffect(() => {
    setDismissed((prev) => {
      const activeIds = new Set(drafts.map((d) => d.sceneId))
      const next = new Set<string>()
      prev.forEach((id) => { if (activeIds.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
  }, [drafts])

  const handleResume = useCallback((sceneId: string) => {
    const target = `/scenes?id=${sceneId}`
    // If already on the scenes page with this scene selected, force remount via key
    const currentParams = new URLSearchParams(location.search)
    if (location.pathname === '/scenes' && currentParams.get('id') === sceneId) {
      // Navigate away and back to force remount
      navigate(target, { replace: true, state: { ts: Date.now() } })
    } else {
      navigate(target)
    }
  }, [navigate, location])

  const handleDismiss = useCallback((sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed((prev) => new Set(prev).add(sceneId))
  }, [])

  const handleDiscard = useCallback((sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.removeItem(`aa-scene-draft-${sceneId}`)
    notifyDraftDiscard(sceneId)
    notifyDraftChange()
  }, [])

  // A draft whose text equals what WIP already has is not unsaved at all
  // (e.g. a backup written just before a successful save, or by older
  // versions of the editor) — remove it silently instead of nagging.
  const wip = useWipClient()
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let removed = false
      for (const d of drafts) {
        try {
          const raw = localStorage.getItem(`aa-scene-draft-${d.sceneId}`)
          const content = raw ? (JSON.parse(raw) as { content?: string }).content : undefined
          const doc = await wip.documents.getDocument(d.sceneId)
          if (!cancelled && content !== undefined && (doc.data as { prose?: string }).prose === content) {
            localStorage.removeItem(`aa-scene-draft-${d.sceneId}`)
            removed = true
          }
        } catch { /* keep the draft if we can't check */ }
      }
      if (removed && !cancelled) notifyDraftChange()
    })()
    return () => { cancelled = true }
  }, [drafts, wip])

  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // The scene open in the editor shows its own save state (the Save button),
  // so it is left out. With autosave, what remains here is a save that
  // failed — shown as a quiet top-bar icon, never over the page.
  const openSceneId = location.pathname === '/scenes' ? new URLSearchParams(location.search).get('id') : null
  const visible = drafts.filter((d) => !dismissed.has(d.sceneId) && d.sceneId !== openSceneId)
  if (visible.length === 0) return null

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('draft_banner.unsaved_draft')}
        className="flex items-center gap-1 p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm"
      >
        <AlertTriangle className="w-4 h-4" />
        {visible.length}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          <div className="px-3 py-1 text-xs text-text-light">{t('draft_banner.unsaved_draft')}</div>
          {visible.map((d) => (
            <div key={d.sceneId} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface">
              <button
                onClick={() => { setOpen(false); handleResume(d.sceneId) }}
                className="flex-1 min-w-0 text-left truncate text-text hover:text-primary"
                title={t('draft_banner.click_resume')}
              >
                {d.title}
              </button>
              <button
                onClick={(e) => handleDiscard(d.sceneId, e)}
                className="p-1 text-text-muted hover:text-red-600 flex-shrink-0"
                title={t('draft_banner.discard_title')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleDismiss(d.sceneId, e)}
                className="p-1 text-text-muted hover:text-text flex-shrink-0"
                title={t('draft_banner.hide_title')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
