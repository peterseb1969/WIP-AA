import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

/**
 * Move a scene to a chapter and a position in it. The dialog is the
 * confirmation — the caller saves on "Move" and offers undo afterwards.
 *
 * Positions are expressed the way the book structure stores order: insert
 * before a scene (`beforeId`), or at the end (`null`).
 */
export default function MoveSceneDialog({
  sceneId,
  sceneTitle,
  chapters,
  currentChapterId,
  scenesInChapter,
  titleOf,
  saving,
  onMove,
  onClose,
}: {
  sceneId: string
  sceneTitle: string
  /** Every chapter, in book order. */
  chapters: Array<{ id: string; label: string }>
  currentChapterId?: string
  /** Scene ids of a chapter, in order. */
  scenesInChapter: (chapterId: string) => string[]
  titleOf: (sceneId: string) => string
  saving: boolean
  onMove: (chapterId: string, beforeId: string | null) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [chapterId, setChapterId] = useState(currentChapterId ?? chapters[0]?.id ?? '')

  // The other scenes of the chosen chapter, in order (this one excluded).
  const others = useMemo(
    () => (chapterId ? scenesInChapter(chapterId) : []).filter((id) => id !== sceneId),
    [chapterId, scenesInChapter, sceneId],
  )

  // Where the scene sits now, in the same terms (null = last).
  const currentBefore = useMemo(() => {
    if (!currentChapterId) return undefined
    const ids = scenesInChapter(currentChapterId)
    const i = ids.indexOf(sceneId)
    return i >= 0 ? ids[i + 1] ?? null : undefined
  }, [currentChapterId, scenesInChapter, sceneId])

  // Default: unchanged in the current chapter, at the end elsewhere.
  const [beforeId, setBeforeId] = useState<string | null>(
    chapterId === currentChapterId && currentBefore !== undefined ? currentBefore : null,
  )
  const pickChapter = (id: string) => {
    setChapterId(id)
    setBeforeId(id === currentChapterId && currentBefore !== undefined ? currentBefore : null)
  }

  const unchanged = chapterId === currentChapterId && beforeId === currentBefore
  const positions: Array<{ before: string | null; label: string }> = [
    ...(others.length ? [{ before: others[0]!, label: t('move.at_beginning') }] : []),
    ...others.slice(0, -1).map((id, i) => ({ before: others[i + 1]!, label: t('move.after', { scene: titleOf(id) }) })),
    { before: null, label: others.length ? t('move.at_end') : t('move.only_scene') },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-text truncate">{t('move.title', { scene: sceneTitle })}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">{t('move.chapter')}</label>
            <select
              value={chapterId}
              onChange={(e) => pickChapter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:border-primary"
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}{c.id === currentChapterId ? ` ${t('move.current')}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm font-medium text-text mb-1">{t('move.position')}</div>
            <div className="space-y-1">
              {positions.map((p) => (
                <label key={p.before ?? 'end'} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface cursor-pointer text-sm text-text">
                  <input
                    type="radio"
                    name="move-position"
                    checked={beforeId === p.before}
                    onChange={() => setBeforeId(p.before)}
                  />
                  <span className="truncate">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text">{t('common.cancel')}</button>
          <button
            onClick={() => onMove(chapterId, beforeId)}
            disabled={!chapterId || unchanged || saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? t('move.moving') : t('move.move')}
          </button>
        </div>
      </div>
    </div>
  )
}
