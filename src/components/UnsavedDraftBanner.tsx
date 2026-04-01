import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

interface DraftEntry {
  sceneId: string
  title: string
  savedAt: number
}

export default function UnsavedDraftBanner() {
  const navigate = useNavigate()

  const drafts = useMemo(() => {
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
  }, [])

  if (drafts.length === 0) return null

  return (
    <div className="space-y-0">
      {drafts.map((d) => (
        <button
          key={d.sceneId}
          onClick={() => navigate(`/scenes?id=${d.sceneId}`)}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 text-left hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-red-700">Unsaved draft:</span>
          <span className="text-sm text-red-700 truncate">{d.title}</span>
          <span className="text-xs text-red-400 flex-shrink-0 ml-auto">Click to resume</span>
        </button>
      ))}
    </div>
  )
}
