import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import {
  LayoutGrid,
  PenTool,
  Filter,
  Palette,
} from 'lucide-react'
import { TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

// ── Data interfaces ──────────────────────────────────────

interface EventData {
  title: string
  event_type?: string
  chapter_number?: number
  scene_order?: number
  location?: string
  characters?: string[]
  summary?: string
  prose?: string
  plot_threads?: string[]
  emotional_beat?: string
}

interface ChapterData {
  number: number
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
}: {
  event: { document_id: string; data: EventData }
  colorClass: string
}) {
  const wc = wordCount(event.data.prose)

  return (
    <Link
      to={`/scenes?id=${event.document_id}`}
      className={`block bg-white rounded-lg border border-gray-200 border-l-4 ${colorClass} p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group`}
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
        <p className="text-xs text-text-light italic mb-2">No synopsis</p>
      )}

      <div className="flex items-center justify-between text-[10px] text-text-light">
        <span>{wc > 0 ? `${wc} words` : 'empty'}</span>
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
  const [groupBy, setGroupBy] = useState<GroupBy>('chapter')
  const [colorBy, setColorBy] = useState<ColorBy>('chapter_status')
  const [filterChapter, setFilterChapter] = useState<number | null>(null)

  const { data: events, isLoading } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 200,
  })
  const { data: chapters } = useDocuments({
    template_id: TEMPLATES.CHAPTER,
    status: 'active',
    page_size: 50,
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

  // Build chapter lookup
  const chapterMap = useMemo(() => {
    const m = new Map<number, ChapterData>()
    allChapters.forEach((c) => m.set(c.data.number, c.data))
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

  // Filter events
  const filtered = useMemo(() => {
    let items = allEvents
    if (filterChapter != null) {
      items = items.filter((e) => e.data.chapter_number === filterChapter)
    }
    return items
  }, [allEvents, filterChapter])

  // Get card color class
  const getColorClass = (event: EventData): string => {
    if (colorBy === 'event_type') {
      return EVENT_TYPE_COLORS[event.event_type ?? 'SCENE'] ?? 'border-l-gray-300'
    }
    if (colorBy === 'pov') {
      const ch = event.chapter_number != null ? chapterMap.get(event.chapter_number) : undefined
      return ch?.pov_character
        ? povColorMap.get(ch.pov_character) ?? 'border-l-gray-300'
        : 'border-l-gray-300'
    }
    // chapter_status
    const ch = event.chapter_number != null ? chapterMap.get(event.chapter_number) : undefined
    return CHAPTER_STATUS_BORDER[ch?.status ?? 'OUTLINE'] ?? 'border-l-gray-300'
  }

  // Group events
  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ label: 'All Scenes', events: [...filtered].sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0)) }]
    }

    if (groupBy === 'chapter') {
      const byChapter = new Map<number, typeof filtered>()
      filtered.forEach((e) => {
        const ch = e.data.chapter_number ?? 0
        if (!byChapter.has(ch)) byChapter.set(ch, [])
        byChapter.get(ch)!.push(e)
      })
      return [...byChapter.entries()]
        .sort(([a], [b]) => a - b)
        .map(([num, evts]) => {
          const ch = chapterMap.get(num)
          return {
            label: `Chapter ${num}${ch?.title ? `: ${ch.title}` : ''}`,
            status: ch?.status,
            events: evts.sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0)),
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
  }, [filtered, groupBy, chapterMap])

  const sortedChapters = useMemo(
    () => [...allChapters].sort((a, b) => a.data.number - b.data.number),
    [allChapters]
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading corkboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <LayoutGrid className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Corkboard</h1>
        <span className="text-sm text-text-muted">({allEvents.length} scenes)</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Group by */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">Group:</span>
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
              {g === 'none' ? 'Flat' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        {/* Color by */}
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs font-medium text-text-muted">Color:</span>
          {([
            { key: 'chapter_status' as ColorBy, label: 'Status' },
            { key: 'event_type' as ColorBy, label: 'Type' },
            { key: 'pov' as ColorBy, label: 'POV' },
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
            <option value="">All chapters</option>
            {sortedChapters.map((ch) => (
              <option key={ch.document_id} value={ch.data.number}>
                Ch. {ch.data.number}{ch.data.title ? `: ${ch.data.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card grid */}
      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
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
                  ({group.events.length} scene{group.events.length !== 1 ? 's' : ''})
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {group.events.map((event) => (
                  <SceneCard
                    key={event.document_id}
                    event={event}
                    colorClass={getColorClass(event.data)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted">No scenes to display.</p>
      )}
    </div>
  )
}
