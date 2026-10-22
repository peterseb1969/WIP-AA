import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { BookOpen, PenTool, ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical, Hash } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NAMESPACE, TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import { useBookStructure, useStructureEditor, chapterDropBefore, displayNumberAfterMove, ruleOf, type NumberingRule } from '../lib/useBookStructure'
import { chapterLabel, chapterTitleShown, sceneTitleShown } from '../lib/titles'
import { useEntityNames } from '../lib/entityNames'
import { startPointerDrag, isUpperHalf } from '../lib/pointerDrag'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'
import MediaSection from '../components/MediaSection'

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
  chapterId,
  displayNumber,
  rule,
  data,
  scenes,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onNumbering,
  dnd,
}: {
  chapterId: string
  /** The number shown (rules applied); null = unnumbered, undefined = not in the book structure. */
  displayNumber: number | null | undefined
  /** This chapter's numbering rule; absent when the book has no structure. */
  rule?: NumberingRule
  data: ChapterData
  scenes: Array<{ document_id: string; data: EventData }>
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onNumbering?: () => void
  /** Present when chapters can be reordered (the book has a structure). */
  dnd?: {
    chapterId: string
    onPointerDown: (e: React.PointerEvent) => void
    isDragging: boolean
    lineAbove: boolean
    lineBelow: boolean
  }
}) {
  const { t } = useTranslation()
  const names = useEntityNames()
  const status = data.status || 'OUTLINE'

  return (
    <div data-chapter-group={dnd?.chapterId} className={`relative ${dnd?.isDragging ? 'opacity-40' : ''}`}>
    {dnd?.lineAbove ? <div className="absolute -top-2 left-0 right-0 h-1 rounded bg-primary" /> : null}
    {dnd?.lineBelow ? <div className="absolute -bottom-2 left-0 right-0 h-1 rounded bg-primary" /> : null}
    <div role="article" aria-label={data.title} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
        // Edit and Delete stay plain buttons; a press anywhere else can start a drag.
        onPointerDown={dnd ? (e) => { if (!(e.target as HTMLElement).closest('button')) dnd.onPointerDown(e) } : undefined}
        title={dnd ? t('chapters_page.drag_title') : undefined}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 transition-colors cursor-pointer select-none group/heading"
      >
        {dnd ? (
          <GripVertical className="w-4 h-4 -ml-2 -mr-1 text-text-light group-hover/heading:text-text-muted flex-shrink-0 cursor-grab" />
        ) : null}
        {/* Every chapter expands now: besides its scenes it holds its images. */}
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}

        <span aria-label={t('numbering.shown')} className={`text-lg font-semibold w-12 ${displayNumber != null ? 'text-primary' : 'text-text-light'}`}>
          {displayNumber ?? '–'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">
              {chapterTitleShown(data.title) || (displayNumber != null
                ? t('scenes.chapter_label', { number: displayNumber })
                : t('chapters_page.untitled_unnumbered'))}
            </span>
            <StatusBadge label={status} colorClass={CHAPTER_STATUS_COLORS[status]} />
            {rule?.kind === 'start' ? (
              <span className="text-xs text-text-light">{t('numbering.restarts_at', { number: rule.number })}</span>
            ) : rule?.kind === 'none' ? (
              <span className="text-xs text-text-light">{t('numbering.unnumbered')}</span>
            ) : null}
          </div>
          {data.pov_character ? (
            <div className="text-xs text-text-muted mt-0.5">
              {t('chapters_page.pov_label', { character: names.label('character', data.pov_character) })}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted flex-shrink-0">
          <span>{t('common.scene_count', { count: scenes.length })}</span>
          {onNumbering ? (
            <button
              onClick={(e) => { e.stopPropagation(); onNumbering() }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
              title={t('numbering.button_title')}
            >
              <Hash className="w-3 h-3" />
              {t('numbering.button')}
            </button>
          ) : null}
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
                  {sceneTitleShown(scene.data.title)}
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
      {expanded ? (
        <div className="border-t border-gray-100 px-4 pt-4 pl-[4.5rem]">
          <MediaSection entityId={chapterId} kind="chapter" />
        </div>
      ) : null}
    </div>
    </div>
  )
}

export default function ChaptersPage() {
  const { t } = useTranslation()
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  // The edited document — a title change renames it (see lib/rename.ts).
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()

  const { structure, isLoading: loadingStructure } = useBookStructure()
  const structureEditor = useStructureEditor()
  // Chapter drag: the dragged chapter, where the pointer is, and the chapter
  // id it would go before (null = end of the book, undefined = no move).
  const [drag, setDrag] = useState<{ id: string; title: string; x: number; y: number } | null>(null)
  const [dropBefore, setDropBefore] = useState<string | null | undefined>(undefined)
  const [moveError, setMoveError] = useState<string | null>(null)
  // Chapter whose Numbering dialog is open.
  const [numbering, setNumbering] = useState<{ chapterId: string; title: string } | null>(null)

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

  /**
   * Drag a chapter by its row: dropped on the upper half of another chapter
   * it goes before it, on the lower half after it.
   */
  const startChapterPress = (e: React.PointerEvent, chapterId: string, title: string) => {
    const ids = structure?.getChapterIds() ?? []
    startPointerDrag<{ before: string | null }>(e, {
      findTarget: (x, y) => {
        const row = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-chapter-group]')
        if (!row) return null
        const before = chapterDropBefore(ids, chapterId, row.dataset.chapterGroup!, isUpperHalf(row, y))
        return before === undefined ? null : { before }
      },
      onMove: (x, y, target) => {
        setDropBefore(target ? target.before : undefined)
        setDrag({ id: chapterId, title, x, y })
      },
      onEnd: (target) => {
        setDrag(null)
        setDropBefore(undefined)
        if (!target) return
        setMoveError(null)
        const number = displayNumberAfterMove(structure?.raw.chapters ?? [], chapterId, target.before)
        const label = number != null
          ? t('undo.moved_chapter', { chapter: title, number })
          : t('undo.moved_chapter_plain', { chapter: title })
        structureEditor.moveChapter(chapterId, target.before, label).catch((err) =>
          setMoveError(err instanceof Error ? err.message : t('chapters_page.move_failed')))
      },
    })
  }

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
    ? structure.raw.chapters.map((slot) => {
        const ch = chapterMap.get(slot.chapter_id)
        const scenes = slot.scene_ids
          .map((sid) => eventMap.get(sid))
          .filter(Boolean) as Array<{ document_id: string; data: EventData }>
        return {
          chapterId: slot.chapter_id,
          displayNumber: structure.getDisplayNumber(slot.chapter_id),
          rule: ruleOf(slot) as NumberingRule | undefined,
          chapter: ch,
          scenes,
        }
      })
    : // Fallback: no structure yet, show chapters unordered
      [...(chapters?.items ?? [])].map((ch) => ({
        chapterId: ch.document_id,
        displayNumber: undefined,
        rule: undefined as NumberingRule | undefined,
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

      {structure && orderedChapters.length > 1 ? (
        <p className="text-xs text-text-muted -mt-3 mb-4">
          {structureEditor.isSaving ? t('corkboard.saving_order') : t('chapters_page.drag_hint')}
        </p>
      ) : null}
      {moveError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{moveError}</div>
      ) : null}
      {drag ? (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 bg-white rounded-lg border border-primary shadow-lg text-sm font-semibold text-text max-w-60 truncate"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          {drag.title}
        </div>
      ) : null}

      {orderedChapters.length > 0 ? (
        <div className="space-y-3">
          {orderedChapters.map((entry) => {
            if (!entry.chapter) return null
            return (
              <ChapterRow
                key={entry.chapterId}
                chapterId={entry.chapterId}
                displayNumber={entry.displayNumber}
                rule={entry.rule}
                onNumbering={structure ? () => setNumbering({ chapterId: entry.chapterId, title: chapterLabel(t, entry.displayNumber, entry.chapter!.data.title, true) }) : undefined}
                data={entry.chapter.data}
                scenes={entry.scenes}
                expanded={expandedChapters.has(entry.chapterId)}
                onToggle={() => toggleChapter(entry.chapterId)}
                onEdit={() => { setEditData(entry.chapter!.data as unknown as Record<string, unknown>); setEditId(entry.chapterId) }}
                onDelete={() => setConfirmDelete(entry.chapterId)}
                dnd={structure ? {
                  chapterId: entry.chapterId,
                  // Named as shown now: undo labels must still make sense after the numbers change.
                  onPointerDown: (e) => startChapterPress(e, entry.chapterId, chapterLabel(t, entry.displayNumber, entry.chapter!.data.title, true)),
                  isDragging: drag?.id === entry.chapterId,
                  lineAbove: dropBefore === entry.chapterId,
                  lineBelow: dropBefore === null && entry.chapterId === structure.raw.chapters.at(-1)?.chapter_id,
                } : undefined}
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

      {numbering && structure ? (
        <NumberingDialog
          title={numbering.title}
          rule={ruleOf(structure.raw.chapters.find((slot) => slot.chapter_id === numbering.chapterId) ?? { chapter_id: '', scene_ids: [] })}
          suggestedStart={structure.getDisplayNumber(numbering.chapterId) ?? 1}
          onClose={() => setNumbering(null)}
          onSave={(rule) => structureEditor.setNumbering(numbering.chapterId, rule, t(`numbering.undo_${rule.kind}`, {
            chapter: numbering.title,
            number: rule.kind === 'start' ? rule.number : undefined,
          }))}
        />
      ) : null}

      {showCreate ? (
        <CreateEntityModal
          entityType={showCreate}
          onClose={() => setShowCreate(null)}
          onCreated={(id) => {
            // New chapters join the book structure (at the end) so scenes can
            // be placed in them and they show up in book order everywhere.
            if (showCreate === 'chapter' && id) structureEditor.addChapter(id)
          }}
        />
      ) : null}

      {editData ? (
        <CreateEntityModal
          entityType="chapter"
          mode="edit"
          existingData={editData}
          documentId={editId}
          onClose={() => setEditData(null)}
          onCreated={() => setEditData(null)}
        />
      ) : null}
    </div>
  )
}

/**
 * A chapter's numbering rule: continue the count from the chapter before,
 * restart it here at a chosen number (later chapters count on from it), or
 * no number at all (prologue, interlude, epilogue).
 */
function NumberingDialog({ title, rule, suggestedStart, onClose, onSave }: {
  title: string
  rule: NumberingRule
  suggestedStart: number
  onClose: () => void
  onSave: (rule: NumberingRule) => Promise<void>
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<NumberingRule['kind']>(rule.kind)
  const [start, setStart] = useState(String(rule.kind === 'start' ? rule.number : suggestedStart))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startNumber = Number(start)
  const valid = kind !== 'start' || (Number.isInteger(startNumber) && start.trim() !== '')

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSave(kind === 'start' ? { kind, number: startNumber } : { kind })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const option = (value: NumberingRule['kind'], label: string, hint: string, extra?: React.ReactNode) => (
    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${kind === value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
      <input type="radio" name="numbering" checked={kind === value} onChange={() => setKind(value)} className="mt-1" />
      <span className="flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        <span className="block text-xs text-text-muted">{hint}</span>
        {extra}
      </span>
    </label>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="numbering-title" className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 id="numbering-title" className="text-lg font-semibold text-text mb-1">{t('numbering.title')}</h3>
        <p className="text-sm text-text-muted mb-4">{title}</p>
        <div className="space-y-2 mb-4">
          {option('continue', t('numbering.continue'), t('numbering.continue_hint'))}
          {option('start', t('numbering.start'), t('numbering.start_hint'), kind === 'start' ? (
            <input
              type="number"
              aria-label={t('numbering.start')}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              autoFocus
              className="mt-2 w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
            />
          ) : null)}
          {option('none', t('numbering.none'), t('numbering.none_hint'))}
        </div>
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors">
            {t('common.cancel')}
          </button>
          <button onClick={save} disabled={busy || !valid}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
