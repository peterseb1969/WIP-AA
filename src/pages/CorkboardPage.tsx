import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import {
  LayoutGrid,
  PenTool,
  Filter,
  Palette,
  GripVertical,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import { useBookStructure, useStructureEditor, chapterDropBefore, displayNumberAfterMove } from '../lib/useBookStructure'
import { startPointerDrag, isUpperHalf } from '../lib/pointerDrag'
import { chapterLabel, sceneTitleShown } from '../lib/titles'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'
import { Avatar } from '../components/MediaSection'
import { useCharacterPortraits } from '../lib/media'

// ── Data interfaces ──────────────────────────────────────

interface EventData {
  title: string
  event_type?: string
  location?: string
  characters?: string[]
  summary?: string
  prose?: string
  plot_threads?: string[]
  emotional_beat?: string
}

interface ChapterData {
  title?: string
  status?: string
  pov_character?: string
}

// ── Constants ────────────────────────────────────────────

type GroupBy = 'chapter' | 'character' | 'thread' | 'none'
type ColorBy = 'chapter_status' | 'event_type' | 'pov'

const EVENT_TYPE_COLORS: Record<string, string> = {
  SCENE: 'border-l-blue-400',
  BACKSTORY: 'border-l-purple-400',
  FLASHBACK: 'border-l-indigo-400',
  FLASH_FORWARD: 'border-l-pink-400',
  DREAM: 'border-l-violet-400',
  PROLOGUE: 'border-l-teal-400',
  EPILOGUE: 'border-l-teal-400',
  INTERLUDE: 'border-l-amber-400',
}

const CHAPTER_STATUS_BORDER: Record<string, string> = {
  OUTLINE: 'border-l-gray-400',
  DRAFT: 'border-l-amber-400',
  REVISED: 'border-l-blue-400',
  FINAL: 'border-l-green-400',
}

const POV_COLORS = [
  'border-l-blue-400',
  'border-l-rose-400',
  'border-l-emerald-400',
  'border-l-purple-400',
  'border-l-amber-400',
  'border-l-teal-400',
  'border-l-indigo-400',
  'border-l-orange-400',
]

// ── Word count helper ────────────────────────────────────

function wordCount(text?: string): number {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).length
}

// ── Scene Card ───────────────────────────────────────────

function SceneCard({
  event,
  colorClass,
  dnd,
}: {
  event: { document_id: string; data: EventData }
  colorClass: string
  /** Present only where cards can be reordered (group by chapter). */
  dnd?: {
    onPointerDown: (e: React.PointerEvent) => void
    /** Chapter a drop on this card lands in; absent for cards outside every chapter. */
    chapterIndex?: number
    isDropTarget: boolean
    isDragging: boolean
  }
}) {
  const { t } = useTranslation()
  const wc = wordCount(event.data.prose)
  const portraits = useCharacterPortraits()

  return (
    <Link
      to={`/scenes?id=${event.document_id}`}
      // The browser's own link dragging stays off; dragging is pointer-based.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={dnd?.onPointerDown}
      data-scene-id={event.document_id}
      data-drop-chapter-index={dnd?.chapterIndex}
      className={`block bg-white rounded-lg border border-gray-200 border-l-4 ${colorClass} p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group select-none ${
        dnd?.isDropTarget ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${dnd?.isDragging ? 'opacity-40' : ''}`}
      style={{ minWidth: 180, maxWidth: 240 }}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4 className="text-sm font-semibold text-text line-clamp-2 leading-tight">
          {sceneTitleShown(event.data.title)}
        </h4>
        <PenTool className="w-3 h-3 text-text-light opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
      </div>

      {event.data.summary ? (
        <p className="text-xs text-text-muted line-clamp-3 mb-2 leading-relaxed">
          {event.data.summary}
        </p>
      ) : (
        <p className="text-xs text-text-light italic mb-2">{t('corkboard.no_synopsis')}</p>
      )}

      <div className="flex items-center justify-between text-[10px] text-text-light">
        <span>{wc > 0 ? t('common.words', { count: wc }) : t('common.words_zero')}</span>
        {event.data.event_type && event.data.event_type !== 'SCENE' ? (
          <StatusBadge
            label={event.data.event_type}
            colorClass="bg-gray-100 text-gray-600"
          />
        ) : null}
      </div>

      {event.data.characters?.length ? (
        <div className="flex flex-wrap gap-0.5 mt-1.5">
          {event.data.characters.slice(0, 3).map((c, i) => (
            <Avatar key={i} fileId={portraits.get(String(c).toLowerCase())} name={String(c)} className="w-5 h-5" textClassName="text-[9px] font-medium" />
          ))}
          {event.data.characters.length > 3 ? (
            <span className="text-[9px] text-text-light self-center ml-0.5">
              +{event.data.characters.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}

// ── Main Corkboard ───────────────────────────────────────

export default function CorkboardPage() {
  const { t } = useTranslation()
  const [groupBy, setGroupBy] = useState<GroupBy>('chapter')
  const [colorBy, setColorBy] = useState<ColorBy>('chapter_status')
  const [filterChapter, setFilterChapter] = useState<number | null>(null)

  const { structure } = useBookStructure()
  const structureEditor = useStructureEditor()
  // The scene or chapter being dragged and where the pointer is (for the floating copy).
  const [drag, setDrag] = useState<{ kind: 'scene' | 'chapter'; id: string; title: string; x: number; y: number } | null>(null)
  // A scene id (drop before that card) or `end:<chapterIndex>` (append).
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  // Chapter drag: the chapter id the dragged one goes before, or null for the end.
  const [chapterDrop, setChapterDrop] = useState<string | null | undefined>(undefined)
  const [moveError, setMoveError] = useState<string | null>(null)

  /**
   * Drag a card: the drop target is whatever is under the pointer — a card
   * (insert before it) or a chapter's free space (append).
   */
  const startPress = (e: React.PointerEvent, sceneId: string, title: string) =>
    startPointerDrag(e, {
      findTarget: (x, y) => {
        const el = document.elementFromPoint(x, y) as HTMLElement | null
        const card = el?.closest<HTMLElement>('[data-drop-chapter-index]')
        if (card && card.dataset.sceneId !== sceneId) {
          return { chapterIndex: Number(card.dataset.dropChapterIndex), beforeId: card.dataset.sceneId!, key: card.dataset.sceneId! }
        }
        const area = el?.closest<HTMLElement>('[data-drop-chapter]')
        if (area) return { chapterIndex: Number(area.dataset.dropChapter), beforeId: null, key: `end:${area.dataset.dropChapter}` }
        return null
      },
      onMove: (x, y, target) => {
        setDropTarget(target?.key ?? null)
        setDrag({ kind: 'scene', id: sceneId, title, x, y })
      },
      onEnd: (target) => {
        setDrag(null)
        setDropTarget(null)
        if (target) moveScene(sceneId, target.chapterIndex, target.beforeId)
      },
    })

  /**
   * Drag a chapter by its heading: dropped on the upper half of another
   * chapter it goes before it, on the lower half after it.
   */
  const startChapterPress = (e: React.PointerEvent, chapterId: string, title: string) => {
    const ids = structure?.getChapterIds() ?? []
    startPointerDrag<{ before: string | null }>(e, {
      findTarget: (x, y) => {
        const group = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-chapter-group]')
        if (!group) return null
        const before = chapterDropBefore(ids, chapterId, group.dataset.chapterGroup!, isUpperHalf(group, y))
        return before === undefined ? null : { before }
      },
      onMove: (x, y, target) => {
        setChapterDrop(target ? target.before : undefined)
        setDrag({ kind: 'chapter', id: chapterId, title, x, y })
      },
      onEnd: (target) => {
        setDrag(null)
        setChapterDrop(undefined)
        if (!target) return
        setMoveError(null)
        const number = displayNumberAfterMove(structure?.raw.chapters ?? [], chapterId, target.before)
        const label = number != null
          ? t('undo.moved_chapter', { chapter: title, number })
          : t('undo.moved_chapter_plain', { chapter: title })
        structureEditor.moveChapter(chapterId, target.before, label).catch((err) =>
          setMoveError(err instanceof Error ? err.message : t('corkboard.move_failed')))
      },
    })
  }

  const moveScene = (sceneId: string, chapterIndex: number, beforeId: string | null) => {
    setDropTarget(null)
    const chapterId = structure?.raw.chapters[chapterIndex]?.chapter_id
    if (!chapterId) return
    setMoveError(null)
    // (events and chapterMap are declared below; this only runs on drop.)
    const sceneTitle = (events?.items?.find((e) => e.document_id === sceneId)?.data as { title?: string } | undefined)?.title ?? ''
    const label = t('undo.moved', {
      scene: sceneTitleShown(sceneTitle),
      chapter: chapterLabel(t, structure?.getDisplayNumber(chapterId), chapterMap.get(chapterId)?.title),
    })
    structureEditor.moveScene(sceneId, chapterId, beforeId, label).catch((err) =>
      setMoveError(err instanceof Error ? err.message : t('corkboard.move_failed')))
  }

  const { data: events, isLoading } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 200,
    namespace: NAMESPACE,
  })
  const { data: chapters } = useDocuments({
    template_id: TEMPLATES.CHAPTER,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })

  const allEvents = useMemo(
    () =>
      (events?.items ?? []).map((e) => ({
        document_id: e.document_id,
        data: e.data as unknown as EventData,
      })),
    [events]
  )
  const allChapters = useMemo(
    () =>
      (chapters?.items ?? []).map((c) => ({
        document_id: c.document_id,
        data: c.data as unknown as ChapterData,
      })),
    [chapters]
  )

  // Build chapter lookup by document_id
  const chapterMap = useMemo(() => {
    const m = new Map<string, ChapterData>()
    allChapters.forEach((c) => m.set(c.document_id, c.data))
    return m
  }, [allChapters])

  // Build POV color map
  const povColorMap = useMemo(() => {
    const povs = new Set<string>()
    allChapters.forEach((c) => {
      if (c.data.pov_character) povs.add(c.data.pov_character)
    })
    const map = new Map<string, string>()
    let i = 0
    povs.forEach((pov) => {
      map.set(pov, POV_COLORS[i % POV_COLORS.length] ?? 'border-l-gray-300')
      i++
    })
    return map
  }, [allChapters])

  // Ordered scene IDs from the book structure (defines canonical sort order)
  const orderedSceneIds = useMemo(
    () => structure?.getAllSceneIds() ?? [],
    [structure]
  )

  // Helper: get structure-based sort index for a scene
  const sceneOrderIndex = useMemo(() => {
    const m = new Map<string, number>()
    orderedSceneIds.forEach((id, i) => m.set(id, i))
    return m
  }, [orderedSceneIds])

  const sortByStructure = <T extends { document_id: string }>(items: T[]): T[] =>
    [...items].sort(
      (a, b) => (sceneOrderIndex.get(a.document_id) ?? Infinity) - (sceneOrderIndex.get(b.document_id) ?? Infinity)
    )

  // Filter events
  const filtered = useMemo(() => {
    let items = allEvents
    if (filterChapter != null && structure) {
      items = items.filter((e) => structure.getChapterNumberForScene(e.document_id) === filterChapter)
    }
    return items
  }, [allEvents, filterChapter, structure])

  // Get card color class
  const getColorClass = (sceneId: string, event: EventData): string => {
    if (colorBy === 'event_type') {
      return EVENT_TYPE_COLORS[event.event_type ?? 'SCENE'] ?? 'border-l-gray-300'
    }
    const chapterId = structure?.getChapterForScene(sceneId)
    const ch = chapterId ? chapterMap.get(chapterId) : undefined
    if (colorBy === 'pov') {
      return ch?.pov_character
        ? povColorMap.get(ch.pov_character) ?? 'border-l-gray-300'
        : 'border-l-gray-300'
    }
    // chapter_status
    return CHAPTER_STATUS_BORDER[ch?.status ?? 'OUTLINE'] ?? 'border-l-gray-300'
  }

  // Group events
  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ label: t('corkboard.all_scenes'), events: sortByStructure(filtered) }]
    }

    if (groupBy === 'chapter') {
      // Group by chapter using structure ordering
      const byChapter = new Map<number, typeof filtered>()
      // Start from every chapter in the structure (or the filtered one) so
      // empty chapters still show — and can still receive a dropped scene.
      structure?.raw.chapters.forEach((_, i) => {
        if (filterChapter == null || filterChapter === i + 1) byChapter.set(i + 1, [])
      })
      filtered.forEach((e) => {
        const ch = structure?.getChapterNumberForScene(e.document_id) ?? 0
        if (!byChapter.has(ch)) byChapter.set(ch, [])
        byChapter.get(ch)!.push(e)
      })
      return [...byChapter.entries()]
        // Chapters in book order; scenes outside every chapter (0) last.
        .sort(([a], [b]) => (a || Infinity) - (b || Infinity))
        .map(([num, evts]) => {
          // Look up the chapter document to get title/status
          const chapterId = structure?.raw.chapters[num - 1]?.chapter_id
          const ch = chapterId ? chapterMap.get(chapterId) : undefined
          return {
            label: num === 0
              ? t('scenes.unassigned')
              : chapterLabel(t, chapterId ? structure?.getDisplayNumber(chapterId) : undefined, ch?.title, true),
            chapterId,
            // Named as shown now: undo labels must still make sense after the numbers change.
            chapterTitle: chapterLabel(t, chapterId ? structure?.getDisplayNumber(chapterId) : undefined, ch?.title, true),
            status: ch?.status,
            // 0 = scenes missing from the structure; those can't be a drop target.
            chapterIndex: num > 0 ? num - 1 : undefined,
            events: sortByStructure(evts),
          }
        })
    }

    if (groupBy === 'character') {
      const byChar = new Map<string, typeof filtered>()
      filtered.forEach((e) => {
        const chars = e.data.characters?.map(String) ?? ['(no characters)']
        chars.forEach((c) => {
          if (!byChar.has(c)) byChar.set(c, [])
          byChar.get(c)!.push(e)
        })
      })
      return [...byChar.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, evts]) => ({ label: name, events: evts }))
    }

    // thread
    const byThread = new Map<string, typeof filtered>()
    filtered.forEach((e) => {
      const threads = e.data.plot_threads?.map(String) ?? ['(no threads)']
      threads.forEach((t) => {
        if (!byThread.has(t)) byThread.set(t, [])
        byThread.get(t)!.push(e)
      })
    })
    return [...byThread.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, evts]) => ({ label: title, events: evts }))
  }, [filtered, groupBy, chapterMap, structure, sceneOrderIndex, filterChapter])

  // Chapters sorted by structure order for the filter dropdown
  const sortedChapters = useMemo(() => {
    if (!structure) return allChapters
    return structure.raw.chapters
      .map((slot, i) => {
        const ch = allChapters.find((c) => c.document_id === slot.chapter_id)
        return ch ? { ...ch, structureNumber: i + 1 } : null
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [allChapters, structure])

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('corkboard.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <BackLink />
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <LayoutGrid className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('corkboard.title')}</h1>
        <span className="text-sm text-text-muted">({t('common.scene_count', { count: allEvents.length })})</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">{t('corkboard.group_label')}</span>
          {(['chapter', 'character', 'thread', 'none'] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                groupBy === g
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              }`}
            >
              {{ chapter: t('corkboard.group_chapter'), character: t('corkboard.group_character'), thread: t('corkboard.group_thread'), none: t('corkboard.group_flat') }[g]}
            </button>
          ))}
        </div>

        {/* Color by */}
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-medium text-text-muted">{t('corkboard.color_label')}</span>
          {([
            { key: 'chapter_status' as ColorBy, label: t('corkboard.color_status') },
            { key: 'event_type' as ColorBy, label: t('corkboard.color_type') },
            { key: 'pov' as ColorBy, label: t('corkboard.color_pov') },
          ]).map((c) => (
            <button
              key={c.key}
              onClick={() => setColorBy(c.key)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                colorBy === c.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Chapter filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={filterChapter ?? ''}
            onChange={(e) =>
              setFilterChapter(e.target.value ? Number(e.target.value) : null)
            }
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-text"
          >
            <option value="">{t('corkboard.all_chapters')}</option>
            {sortedChapters.map((ch) => (
              <option key={ch.document_id} value={'structureNumber' in ch ? (ch.structureNumber as number) : 0}>
                {chapterLabel(t, structure?.getDisplayNumber(ch.document_id), ch.data.title)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {groupBy === 'chapter' && structure ? (
        <p className="text-xs text-text-muted -mt-3 mb-4">
          {structureEditor.isSaving ? t('corkboard.saving_order') : t('corkboard.drag_hint')}
          {!structureEditor.isSaving && filterChapter == null ? ` ${t('corkboard.drag_chapter_hint')}` : ''}
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

      {/* Card grid */}
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => {
            const chapterIndex = 'chapterIndex' in group ? group.chapterIndex : undefined
            const canDrop = groupBy === 'chapter' && chapterIndex !== undefined
            // Scenes outside every chapter can be dragged into one, not onto each other.
            const canDrag = groupBy === 'chapter'
            const endKey = `end:${chapterIndex}`
            const chapterId = 'chapterId' in group ? group.chapterId : undefined
            // Chapters are reordered only while all of them are shown.
            const canDragChapter = canDrop && !!chapterId && filterChapter == null
            const lineAbove = canDragChapter && chapterDrop === chapterId
            const lineBelow = canDragChapter && chapterDrop === null && chapterId === structure?.raw.chapters.at(-1)?.chapter_id
            return (
            <div
              key={chapterId ?? group.label}
              data-chapter-group={canDragChapter ? chapterId : undefined}
              className={`relative ${drag?.kind === 'chapter' && drag.id === chapterId ? 'opacity-40' : ''}`}
            >
              {lineAbove ? <div className="absolute -top-3.5 left-0 right-0 h-1 rounded bg-primary" /> : null}
              {lineBelow ? <div className="absolute -bottom-3.5 left-0 right-0 h-1 rounded bg-primary" /> : null}
              <div
                className={`flex items-center gap-2 mb-3 ${canDragChapter ? 'cursor-grab select-none group/heading' : ''}`}
                onPointerDown={canDragChapter ? (e) => startChapterPress(e, chapterId!, 'chapterTitle' in group ? group.chapterTitle : group.label) : undefined}
                title={canDragChapter ? t('corkboard.drag_chapter_title') : undefined}
              >
                {canDragChapter ? (
                  <GripVertical className="w-4 h-4 -ml-1 text-text-light group-hover/heading:text-text-muted flex-shrink-0" />
                ) : null}
                <h2 className="text-sm font-semibold text-text">{group.label}</h2>
                {'status' in group && group.status ? (
                  <StatusBadge
                    label={group.status as string}
                    colorClass={CHAPTER_STATUS_COLORS[group.status as string] ?? 'bg-gray-100 text-gray-700'}
                  />
                ) : null}
                <span className="text-xs text-text-muted">
                  ({t('common.scene_count', { count: group.events.length })})
                </span>
              </div>

              <div
                data-drop-chapter={canDrop ? chapterIndex : undefined}
                className={`flex flex-wrap gap-3 rounded-lg ${
                  canDrop && drag ? 'min-h-24 p-1 -m-1 border-2 border-dashed' : ''
                } ${canDrop && dropTarget === endKey ? 'border-primary bg-primary/5' : 'border-transparent'}`}
              >
                {group.events.map((event) => (
                  <SceneCard
                    key={event.document_id}
                    event={event}
                    colorClass={getColorClass(event.document_id, event.data)}
                    dnd={canDrag ? {
                      onPointerDown: (e) => startPress(e, event.document_id, event.data.title),
                      chapterIndex: canDrop ? chapterIndex : undefined,
                      isDropTarget: dropTarget === event.document_id,
                      isDragging: drag?.kind === 'scene' && drag.id === event.document_id,
                    } : undefined}
                  />
                ))}
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <p className="text-text-muted">{t('corkboard.empty')}</p>
      )}
    </div>
  )
}
