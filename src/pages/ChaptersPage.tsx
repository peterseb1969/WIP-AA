import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { BookOpen, PenTool, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NAMESPACE, TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import { useBookStructure } from '../lib/useBookStructure'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'

interface ChapterData {
  title: string
  summary?: string
  themes?: string[]
  status?: string
  pov_character?: string
  notes?: string
}

interface EventData {
  title: string
  story_time_raw?: string
  location?: string
  characters?: string[]
  summary?: string
  emotional_beat?: string
}

function ChapterRow({
  chapterNumber,
  data,
  scenes,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  chapterNumber: number
  data: ChapterData
  scenes: Array<{ document_id: string; data: EventData }>
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const status = data.status || 'OUTLINE'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 transition-colors cursor-pointer"
      >
        {scenes.length > 0 ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          )
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}

        <span className="text-lg font-semibold text-primary w-12">
          {chapterNumber}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">
              {data.title || t('common.untitled')}
            </span>
            <StatusBadge label={status} colorClass={CHAPTER_STATUS_COLORS[status]} />
          </div>
          {data.pov_character ? (
            <div className="text-xs text-text-muted mt-0.5">
              {t('chapters_page.pov_label', { character: data.pov_character })}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted flex-shrink-0">
          <span>{t('common.scene_count', { count: scenes.length })}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {t('common.edit')}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="text-text-muted hover:text-red-600 p-1 transition-colors"
            title="Delete chapter"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Summary */}
      {data.summary ? (
        <div className="px-4 pb-3 -mt-1 pl-[4.5rem]">
          <p className="text-sm text-text-muted line-clamp-2">{data.summary}</p>
        </div>
      ) : null}

      {/* Themes */}
      {data.themes?.length ? (
        <div className="px-4 pb-3 pl-[4.5rem] flex gap-1 flex-wrap">
          {data.themes.map((theme, i) => (
            <span key={i} className="px-2 py-0.5 bg-surface rounded text-xs text-text-muted">
              {String(theme)}
            </span>
          ))}
        </div>
      ) : null}

      {/* Expanded scenes */}
      {expanded && scenes.length > 0 ? (
        <div className="border-t border-gray-100">
          {scenes.map((scene, i) => (
            <Link
              key={scene.document_id}
              to={`/scenes?id=${scene.document_id}`}
              className="flex items-center gap-3 px-4 py-2.5 pl-[4.5rem] hover:bg-surface transition-colors border-b border-gray-50 last:border-b-0"
            >
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <PenTool className="w-3 h-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">
                  {scene.data.title}
                </div>
                <div className="text-xs text-text-muted">
                  {scene.data.location ? `${scene.data.location}` : ''}
                  {scene.data.characters?.length
                    ? ` — ${scene.data.characters.map(String).join(', ')}`
                    : ''}
                </div>
              </div>
              {scene.data.emotional_beat ? (
                <span className="text-xs text-text-light italic truncate max-w-32">
                  {scene.data.emotional_beat}
                </span>
              ) : null}
              <span className="text-xs text-text-light flex-shrink-0">
                #{i + 1}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function ChaptersPage() {
  const { t } = useTranslation()
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()

  const { structure, isLoading: loadingStructure } = useBookStructure()

  const { data: chapters, isLoading: loadingChapters } = useDocuments({
    template_id: TEMPLATES.CHAPTER,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })

  const { data: events } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 200,
    namespace: NAMESPACE,
  })

  // Build lookup maps
  const chapterMap = useMemo(() => {
    const map = new Map<string, { document_id: string; data: ChapterData }>()
    chapters?.items?.forEach((ch) => {
      map.set(ch.document_id, { document_id: ch.document_id, data: ch.data as unknown as ChapterData })
    })
    return map
  }, [chapters])

  const eventMap = useMemo(() => {
    const map = new Map<string, { document_id: string; data: EventData }>()
    events?.items?.forEach((ev) => {
      map.set(ev.document_id, { document_id: ev.document_id, data: ev.data as unknown as EventData })
    })
    return map
  }, [events])

  const toggleChapter = (docId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  if (loadingChapters || loadingStructure) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('chapters_page.loading')}</div>
      </div>
    )
  }

  // Build ordered chapter list from structure
  const orderedChapters = structure
    ? structure.raw.chapters.map((slot, index) => {
        const ch = chapterMap.get(slot.chapter_id)
        const scenes = slot.scene_ids
          .map((sid) => eventMap.get(sid))
          .filter(Boolean) as Array<{ document_id: string; data: EventData }>
        return { chapterId: slot.chapter_id, chapterNumber: index + 1, chapter: ch, scenes }
      })
    : // Fallback: no structure yet, show chapters unordered
      [...(chapters?.items ?? [])].map((ch) => ({
        chapterId: ch.document_id,
        chapterNumber: 0,
        chapter: { document_id: ch.document_id, data: ch.data as unknown as ChapterData },
        scenes: [] as Array<{ document_id: string; data: EventData }>,
      }))

  return (
    <div className="p-6 max-w-4xl">
      <BackLink />
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('chapters_page.title')}</h1>
        <span className="text-sm text-text-muted">({structure?.chapterCount ?? chapters?.total ?? 0})</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowCreate('scene')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('chapters_page.new_scene')}
          </button>
          <button
            onClick={() => setShowCreate('chapter')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('chapters_page.new_chapter')}
          </button>
        </div>
      </div>

      {orderedChapters.length > 0 ? (
        <div className="space-y-3">
          {orderedChapters.map((entry) => {
            if (!entry.chapter) return null
            return (
              <ChapterRow
                key={entry.chapterId}
                chapterNumber={entry.chapterNumber}
                data={entry.chapter.data}
                scenes={entry.scenes}
                expanded={expandedChapters.has(entry.chapterId)}
                onToggle={() => toggleChapter(entry.chapterId)}
                onEdit={() => setEditData(entry.chapter!.data as unknown as Record<string, unknown>)}
                onDelete={() => setConfirmDelete(entry.chapterId)}
              />
            )
          })}
        </div>
      ) : (
        <p className="text-text-muted">{t('chapters_page.empty')}</p>
      )}

      {confirmDelete ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-text mb-2">{t('chapters_page.delete_title')}</h3>
            <p className="text-sm text-text-muted mb-4">
              {t('chapters_page.delete_confirm')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteDoc.mutate({ id: confirmDelete }, { onSuccess: () => setConfirmDelete(null) })}
                disabled={deleteDoc.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteDoc.isPending ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <CreateEntityModal
          entityType={showCreate}
          onClose={() => setShowCreate(null)}
        />
      ) : null}

      {editData ? (
        <CreateEntityModal
          entityType="chapter"
          mode="edit"
          existingData={editData}
          onClose={() => setEditData(null)}
          onCreated={() => setEditData(null)}
        />
      ) : null}
    </div>
  )
}
