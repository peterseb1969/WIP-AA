import { useState, useEffect, useCallback } from 'react'
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

  const visible = drafts.filter((d) => !dismissed.has(d.sceneId))
  if (visible.length === 0) return null

  return (
    <div className="space-y-0">
      {visible.map((d) => (
        <div
          key={d.sceneId}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200"
        >
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <button
            onClick={() => handleResume(d.sceneId)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left hover:underline"
          >
            <span className="text-sm font-semibold text-red-700">{t('draft_banner.unsaved_draft')}</span>
            <span className="text-sm text-red-700 truncate">{d.title}</span>
            <span className="text-xs text-red-400 flex-shrink-0">{t('draft_banner.click_resume')}</span>
          </button>
          <button
            onClick={(e) => handleDiscard(d.sceneId, e)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors flex-shrink-0"
            title={t('draft_banner.discard_title')}
          >
            <Trash2 className="w-3 h-3" />
            {t('draft_banner.discard')}
          </button>
          <button
            onClick={(e) => handleDismiss(d.sceneId, e)}
            className="p-1 text-red-400 hover:text-red-700 hover:bg-red-100 rounded transition-colors flex-shrink-0"
            title={t('draft_banner.hide_title')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
