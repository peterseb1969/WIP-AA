import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import {
  LayoutGrid,
  PenTool,
  Filter,
  Palette,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import { useBookStructure, useStructureEditor } from '../lib/useBookStructure'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'

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
    onDragStart: () => void
    onDragEnd: () => void
    /** Absent for cards that can be dragged but not dropped on (no chapter). */
    onDropBefore?: () => void
    isDropTarget: boolean
    setDropTarget: (on: boolean) => void
  }
}) {
  const { t } = useTranslation()
  const wc = wordCount(event.data.prose)

  return (
    <Link
      to={`/scenes?id=${event.document_id}`}
      draggable={!!dnd}
      onDragStart={dnd ? (e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', event.document_id)
        dnd.onDragStart()
      } : undefined}
      onDragEnd={dnd?.onDragEnd}
      onDragOver={dnd?.onDropBefore ? (e) => { e.preventDefault(); e.stopPropagation(); dnd.setDropTarget(true) } : undefined}
      onDragLeave={dnd?.onDropBefore ? () => dnd.setDropTarget(false) : undefined}
      onDrop={dnd?.onDropBefore ? (e) => { e.preventDefault(); e.stopPropagation(); dnd.onDropBefore!() } : undefined}
      className={`block bg-white rounded-lg border border-gray-200 border-l-4 ${colorClass} p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group ${
        dnd?.isDropTarget ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{ minWidth: 180, maxWidth: 240 }}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <h4 className="text-sm font-semibold text-text line-clamp-2 leading-tight">
          {event.data.title}
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
            <span
              key={i}
              className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary"
              title={String(c)}
            >
              {String(c).charAt(0)}
            </span>
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
  const [dragId, setDragId] = useState<string | null>(null)
  // A scene id (drop before that card) or `end:<chapterIndex>` (append).
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  // Move a scene before `beforeId` in the chapter at `chapterIndex`, or to
  // its end when beforeId is null — including scenes not yet in any chapter.
  const moveScene = (sceneId: string, chapterIndex: number, beforeId: string | null) => {
    setDropTarget(null)
    const chapterId = structure?.raw.chapters[chapterIndex]?.chapter_id
    if (!chapterId) return
    setMoveError(null)
    // (events and chapterMap are declared below; this only runs on drop.)
    const sceneTitle = (events?.items?.find((e) => e.document_id === sceneId)?.data as { title?: string } | undefined)?.title ?? ''
    const chapterTitle = chapterMap.get(chapterId)?.title
    const label = t('undo.moved', {
      scene: sceneTitle,
      chapter: `${t('corkboard.group_chapter')} ${chapterIndex + 1}${chapterTitle ? `: ${chapterTitle}` : ''}`,
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
              : `${t('corkboard.group_chapter')} ${num}${ch?.title ? `: ${ch.title}` : ''}`,
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
                Ch. {'structureNumber' in ch ? String(ch.structureNumber) : '?'}{ch.data.title ? `: ${ch.data.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {groupBy === 'chapter' && structure ? (
        <p className="text-xs text-text-muted -mt-3 mb-4">
          {structureEditor.isSaving ? t('corkboard.saving_order') : t('corkboard.drag_hint')}
        </p>
      ) : null}
      {moveError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{moveError}</div>
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
            return (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
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
                className={`flex flex-wrap gap-3 rounded-lg ${
                  canDrop && dragId ? 'min-h-24 p-1 -m-1 border-2 border-dashed' : ''
                } ${canDrop && dropTarget === endKey ? 'border-primary bg-primary/5' : 'border-transparent'}`}
                onDragOver={canDrop ? (e) => { e.preventDefault(); setDropTarget(endKey) } : undefined}
                onDrop={canDrop ? (e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) moveScene(id, chapterIndex!, null)
                } : undefined}
              >
                {group.events.map((event) => (
                  <SceneCard
                    key={event.document_id}
                    event={event}
                    colorClass={getColorClass(event.document_id, event.data)}
                    dnd={canDrag ? {
                      onDragStart: () => setDragId(event.document_id),
                      onDragEnd: () => { setDragId(null); setDropTarget(null) },
                      onDropBefore: canDrop ? () => { if (dragId) moveScene(dragId, chapterIndex!, event.document_id) } : undefined,
                      isDropTarget: dropTarget === event.document_id && dragId !== event.document_id,
                      setDropTarget: (on) => setDropTarget(on ? event.document_id : null),
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
