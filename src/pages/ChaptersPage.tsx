import { useState } from 'react'
import { useDocuments } from '@wip/react'
import { BookOpen, PenTool, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TEMPLATES, CHAPTER_STATUS_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

interface ChapterData {
  number: number
  title?: string
  summary?: string
  themes?: string[]
  status?: string
  pov_character?: string
  notes?: string
}

interface EventData {
  title: string
  chapter_number?: number
  scene_order?: number
  story_time_raw?: string
  location?: string
  characters?: string[]
  summary?: string
  emotional_beat?: string
}

function ChapterRow({
  data,
  scenes,
  expanded,
  onToggle,
}: {
  data: ChapterData
  scenes: Array<{ document_id: string; data: EventData }>
  expanded: boolean
  onToggle: () => void
}) {
  const status = data.status || 'OUTLINE'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 transition-colors"
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
          {data.number}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">
              {data.title || 'Untitled'}
            </span>
            <StatusBadge label={status} colorClass={CHAPTER_STATUS_COLORS[status]} />
          </div>
          {data.pov_character ? (
            <div className="text-xs text-text-muted mt-0.5">
              POV: {data.pov_character}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted flex-shrink-0">
          <span>{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</span>
        </div>
      </button>

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
              to="/scenes"
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
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())

  const { data: chapters, isLoading: loadingChapters } = useDocuments({
    template_id: TEMPLATES.CHAPTER,
    status: 'active',
    page_size: 50,
  })

  const { data: events } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 200,
  })

  const toggleChapter = (num: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  // Group scenes by chapter number, sorted by scene_order
  const scenesByChapter = new Map<number, Array<{ document_id: string; data: EventData }>>()
  events?.items?.forEach((event) => {
    const d = event.data as unknown as EventData
    const chNum = d.chapter_number
    if (chNum != null) {
      if (!scenesByChapter.has(chNum)) scenesByChapter.set(chNum, [])
      scenesByChapter.get(chNum)!.push({ document_id: event.document_id, data: d })
    }
  })
  // Sort scenes within each chapter by scene_order
  scenesByChapter.forEach((scenes) => {
    scenes.sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0))
  })

  const sortedChapters = [...(chapters?.items ?? [])].sort((a, b) => {
    const an = (a.data as unknown as ChapterData).number
    const bn = (b.data as unknown as ChapterData).number
    return an - bn
  })

  if (loadingChapters) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading chapters...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Chapters</h1>
        <span className="text-sm text-text-muted">({chapters?.total ?? 0})</span>
      </div>

      {sortedChapters.length > 0 ? (
        <div className="space-y-3">
          {sortedChapters.map((ch) => {
            const data = ch.data as unknown as ChapterData
            const scenes = scenesByChapter.get(data.number) ?? []
            return (
              <ChapterRow
                key={ch.document_id}
                data={data}
                scenes={scenes}
                expanded={expandedChapters.has(data.number)}
                onToggle={() => toggleChapter(data.number)}
              />
            )
          })}
        </div>
      ) : (
        <p className="text-text-muted">No chapters yet. Use the AskBar to create one.</p>
      )}
    </div>
  )
}
