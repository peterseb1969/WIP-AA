import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import {
  Clock,
  MapPin,
  Filter,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { useBookStructure } from '../lib/useBookStructure'
import { chapterLabel, sceneTitleShown } from '../lib/titles'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'
import { Avatar } from '../components/MediaSection'
import { usePortraitOf } from '../lib/media'
import { useEntityNames } from '../lib/entityNames'

// ── Data interfaces ──────────────────────────────────────

interface EventData {
  title: string
  event_type?: string
  story_time_raw?: string
  story_time_sort?: number
  location?: string
  characters?: string[]
  summary?: string
  emotional_beat?: string
}

interface ChapterData {
  title: string
  status?: string
}

// ── Constants ────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, string> = {
  SCENE: 'bg-blue-100 text-blue-800',
  BACKSTORY: 'bg-purple-100 text-purple-800',
  FLASHBACK: 'bg-indigo-100 text-indigo-800',
  FLASH_FORWARD: 'bg-pink-100 text-pink-800',
  DREAM: 'bg-violet-100 text-violet-800',
  PROLOGUE: 'bg-teal-100 text-teal-800',
  EPILOGUE: 'bg-teal-100 text-teal-800',
  INTERLUDE: 'bg-amber-100 text-amber-800',
}

// ── Timeline Event Card ──────────────────────────────────

function TimelineEvent({ event }: { event: { document_id: string; data: EventData } }) {
  const portraitOfName = usePortraitOf()
  const names = useEntityNames()
  return (
    <Link
      to={`/scenes?id=${event.document_id}`}
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold text-text line-clamp-1">{sceneTitleShown(event.data.title)}</h4>
        {event.data.event_type ? (
          <StatusBadge
            label={event.data.event_type}
            colorClass={EVENT_TYPE_COLORS[event.data.event_type] ?? 'bg-gray-100 text-gray-700'}
          />
        ) : null}
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted mb-1.5">
        {event.data.location ? (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.data.location}
          </span>
        ) : null}
        {event.data.story_time_raw ? (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.data.story_time_raw}
          </span>
        ) : null}
      </div>

      {event.data.emotional_beat ? (
        <p className="text-xs text-text-muted italic line-clamp-1">{event.data.emotional_beat}</p>
      ) : null}

      {event.data.characters?.length ? (
        <div className="flex items-center gap-1 mt-2">
          {event.data.characters.slice(0, 4).map((c, i) => (
            <Avatar key={i} fileId={portraitOfName(c)} name={names.label('character', c)} className="w-5 h-5" textClassName="text-[9px] font-medium" />
          ))}
          {event.data.characters.length > 4 ? (
            <span className="text-[10px] text-text-light ml-0.5">
              +{event.data.characters.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}

// ── Main Timeline ────────────────────────────────────────

export default function TimelinePage() {
  const { t } = useTranslation()
  const names = useEntityNames()
  const [filterCharacter, setFilterCharacter] = useState<string | null>(null)
  const [filterLocation, setFilterLocation] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<'story' | 'chapter'>('story')

  const { structure } = useBookStructure()

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

  // Build a map from chapter document_id to ChapterData for title lookups
  const chapterDataMap = useMemo(() => {
    const m = new Map<string, ChapterData>()
    allChapters.forEach((c) => m.set(c.document_id, c.data))
    return m
  }, [allChapters])

  // Collect unique characters and locations for filters
  const allCharacters = useMemo(() => {
    const set = new Set<string>()
    allEvents.forEach((e) => e.data.characters?.forEach((c) => set.add(String(c))))
    return [...set].sort()
  }, [allEvents])

  const allLocations = useMemo(() => {
    const set = new Set<string>()
    allEvents.forEach((e) => {
      if (e.data.location) set.add(e.data.location)
    })
    return [...set].sort()
  }, [allEvents])

  // Filter
  const filtered = useMemo(() => {
    let items = allEvents
    if (filterCharacter) {
      items = items.filter((e) =>
        e.data.characters?.some((c) => String(c) === filterCharacter)
      )
    }
    if (filterLocation) {
      items = items.filter((e) => e.data.location === filterLocation)
    }
    return items
  }, [allEvents, filterCharacter, filterLocation])

  // Sort by story_time_sort, then chapter number (from structure), then scene index (from structure)
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ta = a.data.story_time_sort ?? 0
        const tb = b.data.story_time_sort ?? 0
        if (ta !== tb) return ta - tb
        const ca = structure?.getChapterNumberForScene(a.document_id) ?? 0
        const cb = structure?.getChapterNumberForScene(b.document_id) ?? 0
        if (ca !== cb) return ca - cb
        const sa = structure?.getScenePosition(a.document_id)?.sceneIndex ?? 0
        const sb = structure?.getScenePosition(b.document_id)?.sceneIndex ?? 0
        return sa - sb
      }),
    [filtered, structure]
  )

  // Group by chapter for chapter zoom level
  const grouped = useMemo(() => {
    if (zoomLevel === 'story') {
      // Group by story_time_sort to show parallel events
      const byTime = new Map<number, typeof sorted>()
      sorted.forEach((e) => {
        const t = e.data.story_time_sort ?? 0
        if (!byTime.has(t)) byTime.set(t, [])
        byTime.get(t)!.push(e)
      })
      return [...byTime.entries()].sort(([a], [b]) => a - b)
    }

    // chapter zoom — group by chapter number from structure
    const byCh = new Map<number, typeof sorted>()
    sorted.forEach((e) => {
      const ch = structure?.getChapterNumberForScene(e.document_id) ?? 0
      if (!byCh.has(ch)) byCh.set(ch, [])
      byCh.get(ch)!.push(e)
    })
    return [...byCh.entries()].sort(([a], [b]) => a - b)
  }, [sorted, zoomLevel, structure])

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('timeline.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <BackLink />
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('timeline.title')}</h1>
        <span className="text-sm text-text-muted">({t('common.event_count', { count: allEvents.length })})</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">{t('timeline.view_label')}</span>
          <button
            onClick={() => setZoomLevel('story')}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
              zoomLevel === 'story'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            <ZoomOut className="w-3 h-3" />
            {t('timeline.by_time')}
          </button>
          <button
            onClick={() => setZoomLevel('chapter')}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
              zoomLevel === 'chapter'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            <ZoomIn className="w-3 h-3" />
            {t('timeline.by_chapter')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={filterCharacter ?? ''}
            onChange={(e) => setFilterCharacter(e.target.value || null)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-text"
          >
            <option value="">{t('timeline.all_characters')}</option>
            {allCharacters.map((c) => (
              <option key={c} value={c}>{names.label('character', c)}</option>
            ))}
          </select>
          <select
            value={filterLocation ?? ''}
            onChange={(e) => setFilterLocation(e.target.value || null)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-text"
          >
            <option value="">{t('timeline.all_locations')}</option>
            {allLocations.map((l) => (
              <option key={l} value={l}>{names.label('location', l)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length > 0 ? (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-6">
            {grouped.map(([key, groupEvents]) => {
              // For chapter zoom, look up chapter title from the first event's chapter
              // Groups are keyed by chapter POSITION (for order); shown is the
              // chapter's display number and title.
              const chId = zoomLevel === 'chapter' && key > 0 && groupEvents[0]
                ? structure?.getChapterForScene(groupEvents[0].document_id)
                : undefined
              const displayNumber = chId ? structure?.getDisplayNumber(chId) : undefined

              return (
                <div key={key} className="relative">
                  {/* Time/chapter marker */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center z-10 relative">
                      <span className="text-xs font-bold text-primary">
                        {zoomLevel === 'chapter'
                          ? (chId ? displayNumber ?? '–' : '?')
                          : key === 0 ? '?' : key}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-text">
                        {zoomLevel === 'chapter'
                          ? (chId ? chapterLabel(t, displayNumber, chapterDataMap.get(chId)?.title, true) : t('scenes.unassigned'))
                          : groupEvents[0]?.data.story_time_raw ?? t('timeline.time_point', { number: key })
                        }
                      </span>
                      {groupEvents.length > 1 ? (
                        <span className="text-xs text-text-muted ml-2">
                          {t('timeline.parallel_events', { count: groupEvents.length })}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Events at this point */}
                  <div className="ml-12 grid gap-2 sm:grid-cols-2">
                    {groupEvents.map((event) => (
                      <TimelineEvent key={event.document_id} event={event} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-text-muted">
          {filterCharacter || filterLocation
            ? t('timeline.empty_filtered')
            : t('timeline.empty')}
        </p>
      )}
    </div>
  )
}
