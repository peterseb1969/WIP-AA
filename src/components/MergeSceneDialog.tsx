import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

interface Neighbour { id: string; title: string; words: number }

/**
 * Merge the open scene with its previous or next scene in the same
 * chapter. The text is always joined in reading order (earlier + later);
 * the writer picks whose title and details the merged scene keeps. The
 * dialog is the confirmation; the merge is undoable from the top bar.
 */
export default function MergeSceneDialog({
  current,
  prev,
  next,
  saving,
  error,
  onMerge,
  onClose,
}: {
  current: { title: string; words: number }
  prev?: Neighbour
  next?: Neighbour
  saving: boolean
  error: string | null
  onMerge: (otherId: string, otherIsNext: boolean, keepEarlier: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [withNext, setWithNext] = useState<boolean>(!!next)
  const [keepEarlier, setKeepEarlier] = useState(true)

  const other = withNext ? next : prev
  const earlier = withNext ? current.title : prev?.title ?? ''
  const later = withNext ? next?.title ?? '' : current.title
  const resultTitle = keepEarlier ? earlier : later
  const words = current.words + (other?.words ?? 0)

  const option = (n: Neighbour | undefined, isNext: boolean) => (
    <label className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${n ? 'hover:bg-surface cursor-pointer text-text' : 'text-text-light'}`}>
      <input type="radio" name="merge-with" disabled={!n} checked={withNext === isNext && !!n} onChange={() => setWithNext(isNext)} />
      <span className="truncate">
        {isNext ? t('merge_scene.with_next') : t('merge_scene.with_previous')}
        {n ? ` — “${n.title}” (${t('common.words', { count: n.words })})` : ` — ${t('merge_scene.none_in_chapter')}`}
      </span>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="merge-scene-title" className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="merge-scene-title" className="text-lg font-semibold text-text truncate">{t('merge_scene.title', { scene: current.title })}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-text-muted hover:text-text p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1">
            {option(prev, false)}
            {option(next, true)}
          </div>

          {other && (
            <div>
              <div className="text-sm font-medium text-text mb-1">{t('merge_scene.keep')}</div>
              {[true, false].map((first) => (
                <label key={String(first)} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface cursor-pointer text-sm text-text">
                  <input type="radio" name="merge-keep" checked={keepEarlier === first} onChange={() => setKeepEarlier(first)} />
                  <span className="truncate">{`“${first ? earlier : later}”`}</span>
                </label>
              ))}
            </div>
          )}

          {other && (
            <p className="text-sm text-text-muted rounded-md bg-surface px-3 py-2">
              {t('merge_scene.preview', { a: earlier, b: later, title: resultTitle, words })}
            </p>
          )}

          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text">{t('common.cancel')}</button>
          <button
            onClick={() => other && onMerge(other.id, withNext, keepEarlier)}
            disabled={!other || saving}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? t('merge_scene.merging') : t('merge_scene.merge')}
          </button>
        </div>
      </div>
    </div>
  )
}
