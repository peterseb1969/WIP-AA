import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useDocuments } from '@wip/react'
import {
  PenTool,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  BookOpen,
  Maximize2,
  Minimize2,
  Eye,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Globe,
  StickyNote,
  FileText,
  Plus,
} from 'lucide-react'
import { TEMPLATES } from '../lib/constants'
import CreateEntityModal from '../components/CreateEntityModal'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'

// ── Data interfaces ──────────────────────────────────────

interface EventData {
  title: string
  event_type?: string
  chapter_number?: number
  scene_order?: number
  story_time_raw?: string
  story_time_sort?: number
  location?: string
  characters?: string[]
  summary?: string
  prose?: string
  plot_threads?: string[]
  emotional_beat?: string
  notes?: string
}

interface ChapterData {
  number: number
  title?: string
  status?: string
}

interface LocationData {
  name: string
  type?: string
  atmosphere?: string
  rules?: string
}

interface CharacterDocData {
  name: string
  role?: string
  description?: string
  personality?: string
  goals?: string
}

interface PlotThreadData {
  title: string
  status?: string
  description?: string
}

interface WorldRuleData {
  name: string
  domain?: string
  rule: string
}

// ── Constants ────────────────────────────────────────────

type EditorMode = 'full' | 'composition' | 'flow'

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

// ── Scene Selector (landing when no scene selected) ─────

function SceneSelector({
  events,
  chapters,
  onSelect,
  onFlowView,
  onCreateScene,
}: {
  events: Array<{ document_id: string; data: EventData }>
  chapters: Array<{ document_id: string; data: ChapterData }>
  onSelect: (id: string) => void
  onFlowView: (chapterNum: number) => void
  onCreateScene: () => void
}) {
  const { byChapter, unassigned } = useMemo(() => {
    const map = new Map<number, Array<{ document_id: string; data: EventData }>>()
    const noChapter: Array<{ document_id: string; data: EventData }> = []
    events.forEach((e) => {
      const ch = e.data.chapter_number
      if (ch != null) {
        if (!map.has(ch)) map.set(ch, [])
        map.get(ch)!.push(e)
      } else {
        noChapter.push(e)
      }
    })
    map.forEach((scenes) =>
      scenes.sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0))
    )
    return { byChapter: map, unassigned: noChapter }
  }, [events])

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.data.number - b.data.number),
    [chapters]
  )

  return (
    <div className="p-6 max-w-4xl">
      <BackLink />
      <div className="flex items-center gap-3 mb-6">
        <PenTool className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Scene Editor</h1>
        <span className="text-sm text-text-muted">({events.length} scenes)</span>
        <button
          onClick={onCreateScene}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Scene
        </button>
      </div>

      <p className="text-sm text-text-muted mb-6">
        Select a scene to edit, or enter Flow view to read an entire chapter.
      </p>

      {sortedChapters.length > 0 ? (
        <div className="space-y-4">
          {sortedChapters.map((ch) => {
            const scenes = byChapter.get(ch.data.number) ?? []
            return (
              <div key={ch.document_id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-text">
                      Chapter {ch.data.number}
                      {ch.data.title ? `: ${ch.data.title}` : ''}
                    </span>
                    <span className="text-xs text-text-muted">{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</span>
                  </div>
                  {scenes.length > 0 ? (
                    <button
                      onClick={() => onFlowView(ch.data.number)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Flow view
                    </button>
                  ) : null}
                </div>

                {scenes.length > 0 ? (
                  <div>
                    {scenes.map((scene, i) => (
                      <button
                        key={scene.document_id}
                        onClick={() => onSelect(scene.document_id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-medium text-primary">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text truncate">{scene.data.title}</div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {scene.data.location ? scene.data.location : ''}
                            {scene.data.characters?.length
                              ? `${scene.data.location ? ' — ' : ''}${scene.data.characters.map(String).join(', ')}`
                              : ''}
                          </div>
                        </div>
                        {scene.data.event_type ? (
                          <StatusBadge
                            label={scene.data.event_type}
                            colorClass={EVENT_TYPE_COLORS[scene.data.event_type] ?? 'bg-gray-100 text-gray-700'}
                          />
                        ) : null}
                        {scene.data.emotional_beat ? (
                          <span className="text-xs text-text-light italic max-w-28 truncate hidden sm:block">
                            {scene.data.emotional_beat}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-text-muted">No scenes in this chapter yet.</div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Scenes not assigned to any chapter */}
      {unassigned.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 border-dashed overflow-hidden mt-4">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <span className="font-semibold text-text-muted">Unassigned Scenes</span>
            <span className="text-xs text-text-muted">{unassigned.length} scene{unassigned.length !== 1 ? 's' : ''}</span>
          </div>
          <div>
            {unassigned.map((scene) => (
              <button
                key={scene.document_id}
                onClick={() => onSelect(scene.document_id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-text-muted">
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text truncate">{scene.data.title}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {scene.data.location ? scene.data.location : ''}
                    {scene.data.characters?.length
                      ? `${scene.data.location ? ' — ' : ''}${scene.data.characters.map(String).join(', ')}`
                      : ''}
                  </div>
                </div>
                {scene.data.event_type ? (
                  <StatusBadge
                    label={scene.data.event_type}
                    colorClass={EVENT_TYPE_COLORS[scene.data.event_type] ?? 'bg-gray-100 text-gray-700'}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sortedChapters.length === 0 && unassigned.length === 0 ? (
        <p className="text-text-muted">No scenes yet. Click "New Scene" to create one.</p>
      ) : null}
    </div>
  )
}

// ── Metadata Strip (top) ─────────────────────────────────

function MetadataStrip({
  scene,
  chapter,
  expanded,
  onToggle,
}: {
  scene: EventData
  chapter?: ChapterData
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Compact strip — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-2.5 text-left hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">
            Ch. {scene.chapter_number ?? '?'}
            {chapter?.title ? `: ${chapter.title}` : ''}
          </span>
          <span className="text-text-light">·</span>
          <span className="text-text-muted">Scene {scene.scene_order ?? '?'}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted flex-1 min-w-0">
          {scene.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {scene.location}
            </span>
          ) : null}
          {scene.story_time_raw ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {scene.story_time_raw}
            </span>
          ) : null}
          {scene.event_type ? (
            <StatusBadge
              label={scene.event_type}
              colorClass={EVENT_TYPE_COLORS[scene.event_type] ?? 'bg-gray-100 text-gray-700'}
            />
          ) : null}
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}
      </button>

      {/* Expanded metadata */}
      {expanded ? (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Title</label>
            <div className="text-sm text-text">{scene.title}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Location</label>
            <div className="text-sm text-text">{scene.location ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Story Time</label>
            <div className="text-sm text-text">{scene.story_time_raw ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Event Type</label>
            <div className="text-sm text-text">{scene.event_type ?? 'SCENE'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Emotional Beat</label>
            <div className="text-sm text-text italic">{scene.emotional_beat ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">Characters</label>
            <div className="flex flex-wrap gap-1">
              {scene.characters?.length ? (
                scene.characters.map((c, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-primary/5 rounded text-xs text-primary">
                    {String(c)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-text-light">—</span>
              )}
            </div>
          </div>
          {scene.summary ? (
            <div className="col-span-full">
              <label className="text-xs font-medium text-text-muted block mb-1">Summary</label>
              <div className="text-sm text-text">{scene.summary}</div>
            </div>
          ) : null}
          {scene.notes ? (
            <div className="col-span-full">
              <label className="text-xs font-medium text-text-muted block mb-1">Notes</label>
              <div className="text-sm text-text-muted italic">{scene.notes}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ── Characters Panel (right) ─────────────────────────────

function CharactersPanel({
  characterNames,
  characterDocs,
}: {
  characterNames: string[]
  characterDocs: Array<{ document_id: string; data: CharacterDocData }>
}) {
  const [expandedChar, setExpandedChar] = useState<string | null>(null)

  // Match character docs by name
  const present = useMemo(() => {
    return characterNames.map((name) => {
      const doc = characterDocs.find(
        (d) => d.data.name.toLowerCase() === name.toLowerCase()
      )
      return { name, doc: doc?.data }
    })
  }, [characterNames, characterDocs])

  if (present.length === 0) {
    return (
      <div className="text-xs text-text-muted p-3">No characters in this scene.</div>
    )
  }

  return (
    <div className="space-y-1">
      {present.map((c) => (
        <div key={c.name}>
          <button
            onClick={() => setExpandedChar(expandedChar === c.name ? null : c.name)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface rounded transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{c.name}</div>
              {c.doc?.role ? (
                <div className="text-xs text-text-muted">{c.doc.role.toLowerCase()}</div>
              ) : null}
            </div>
            {expandedChar === c.name ? (
              <ChevronUp className="w-3 h-3 text-text-muted" />
            ) : (
              <ChevronDown className="w-3 h-3 text-text-muted" />
            )}
          </button>

          {expandedChar === c.name && c.doc ? (
            <div className="ml-12 mr-3 mb-2 space-y-2">
              {c.doc.description ? (
                <p className="text-xs text-text-muted">{c.doc.description}</p>
              ) : null}
              {c.doc.personality ? (
                <div>
                  <span className="text-xs font-medium text-primary">Personality: </span>
                  <span className="text-xs text-text-muted">{c.doc.personality}</span>
                </div>
              ) : null}
              {c.doc.goals ? (
                <div>
                  <span className="text-xs font-medium text-primary">Goals: </span>
                  <span className="text-xs text-text-muted">{c.doc.goals}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ── Context Panel (right, tabbed) ────────────────────────

type ContextTab = 'characters' | 'location' | 'threads' | 'rules' | 'notes'

function ContextPanel({
  scene,
  characterDocs,
  locationDocs,
  threadDocs,
  ruleDocs,
  noteDocs,
}: {
  scene: EventData
  characterDocs: Array<{ document_id: string; data: CharacterDocData }>
  locationDocs: Array<{ document_id: string; data: LocationData }>
  threadDocs: Array<{ document_id: string; data: PlotThreadData }>
  ruleDocs: Array<{ document_id: string; data: WorldRuleData }>
  noteDocs: Array<{ document_id: string; data: { title: string; content: string; note_type: string } }>
}) {
  const [tab, setTab] = useState<ContextTab>('characters')

  // Find location doc matching scene.location
  const locationDoc = useMemo(
    () => locationDocs.find((l) => l.data.name.toLowerCase() === (scene.location ?? '').toLowerCase()),
    [locationDocs, scene.location]
  )

  // Find threads matching scene.plot_threads
  const activeThreads = useMemo(
    () =>
      threadDocs.filter((t) =>
        scene.plot_threads?.some(
          (pt) => String(pt).toLowerCase() === t.data.title.toLowerCase()
        )
      ),
    [threadDocs, scene.plot_threads]
  )

  const tabs: Array<{ key: ContextTab; label: string; icon: typeof Users; count?: number }> = [
    { key: 'characters', label: 'Characters', icon: Users, count: scene.characters?.length ?? 0 },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'threads', label: 'Threads', icon: GitBranch, count: activeThreads.length },
    { key: 'rules', label: 'Rules', icon: Globe, count: ruleDocs.length },
    { key: 'notes', label: 'Notes', icon: StickyNote, count: noteDocs.length },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
            title={t.label}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t.label}</span>
            {t.count ? (
              <span className="ml-0.5 text-[10px] opacity-60">{t.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'characters' ? (
          <CharactersPanel
            characterNames={scene.characters?.map(String) ?? []}
            characterDocs={characterDocs}
          />
        ) : null}

        {tab === 'location' ? (
          <div className="p-3">
            {locationDoc ? (
              <div className="space-y-2">
                <div className="font-medium text-sm text-text">{locationDoc.data.name}</div>
                {locationDoc.data.type ? (
                  <StatusBadge label={locationDoc.data.type} colorClass="bg-blue-100 text-blue-800" />
                ) : null}
                {locationDoc.data.atmosphere ? (
                  <div>
                    <span className="text-xs font-medium text-primary">Atmosphere: </span>
                    <span className="text-xs text-text-muted">{locationDoc.data.atmosphere}</span>
                  </div>
                ) : null}
                {locationDoc.data.rules ? (
                  <div>
                    <span className="text-xs font-medium text-primary">Rules: </span>
                    <span className="text-xs text-text-muted">{locationDoc.data.rules}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-text-muted">
                {scene.location ? `"${scene.location}" — no location document found.` : 'No location set for this scene.'}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'threads' ? (
          <div className="p-3 space-y-2">
            {activeThreads.length > 0 ? (
              activeThreads.map((t) => (
                <div key={t.document_id} className="bg-surface rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{t.data.title}</span>
                    {t.data.status ? (
                      <StatusBadge
                        label={t.data.status}
                        colorClass={
                          t.data.status === 'OPEN'
                            ? 'bg-blue-100 text-blue-800'
                            : t.data.status === 'DEVELOPING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                        }
                      />
                    ) : null}
                  </div>
                  {t.data.description ? (
                    <p className="text-xs text-text-muted mt-1">{t.data.description}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">No plot threads linked to this scene.</div>
            )}
          </div>
        ) : null}

        {tab === 'rules' ? (
          <div className="p-3 space-y-2">
            {ruleDocs.length > 0 ? (
              ruleDocs.map((r) => (
                <div key={r.document_id} className="bg-surface rounded p-2">
                  <div className="text-sm font-medium text-text">{r.data.name}</div>
                  <p className="text-xs text-text-muted mt-0.5">{r.data.rule}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">No world rules defined.</div>
            )}
          </div>
        ) : null}

        {tab === 'notes' ? (
          <div className="p-3 space-y-2">
            {noteDocs.length > 0 ? (
              noteDocs.map((n) => (
                <div key={n.document_id} className="bg-surface rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{n.data.title}</span>
                    <StatusBadge label={n.data.note_type} colorClass="bg-gray-100 text-gray-700" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-3">{n.data.content}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">No notes.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Continuity Strip (bottom) ────────────────────────────

function ContinuityStrip({
  prevScene,
  nextScene,
  onNavigate,
}: {
  prevScene?: EventData
  nextScene?: EventData
  onNavigate: (direction: 'prev' | 'next') => void
}) {
  return (
    <div className="bg-white border-t border-gray-200 flex">
      {/* Previous */}
      <button
        onClick={() => onNavigate('prev')}
        disabled={!prevScene}
        className="flex-1 flex items-center gap-2 px-4 py-2.5 text-left hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-default border-r border-gray-100"
      >
        <ChevronLeft className="w-4 h-4 text-text-muted flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Previous</div>
          {prevScene ? (
            <>
              <div className="text-xs font-medium text-text truncate">{prevScene.title}</div>
              {prevScene.summary ? (
                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{prevScene.summary}</div>
              ) : null}
            </>
          ) : (
            <div className="text-xs text-text-light">Start of chapter</div>
          )}
        </div>
      </button>

      {/* Next */}
      <button
        onClick={() => onNavigate('next')}
        disabled={!nextScene}
        className="flex-1 flex items-center gap-2 px-4 py-2.5 text-right hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-default"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Next</div>
          {nextScene ? (
            <>
              <div className="text-xs font-medium text-text truncate">{nextScene.title}</div>
              {nextScene.summary ? (
                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{nextScene.summary}</div>
              ) : null}
            </>
          ) : (
            <div className="text-xs text-text-light">End of chapter</div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
      </button>
    </div>
  )
}

// ── Flow View ────────────────────────────────────────────

function FlowView({
  scenes,
  chapterNum,
  chapterTitle,
  onExit,
}: {
  scenes: EventData[]
  chapterNum: number
  chapterTitle?: string
  onExit: () => void
}) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-text">
            Chapter {chapterNum}{chapterTitle ? `: ${chapterTitle}` : ''}
          </h2>
          <p className="text-sm text-text-muted mt-1">Flow view — continuous reading</p>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
          Exit Flow view
        </button>
      </div>

      <div className="prose-container space-y-0">
        {scenes.map((scene, i) => (
          <div key={i} className="group">
            {i > 0 ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-16 border-t border-gray-300" />
                <div className="mx-3 text-xs text-text-light">···</div>
                <div className="w-16 border-t border-gray-300" />
              </div>
            ) : null}
            <div className="relative">
              <div
                className="text-base leading-relaxed text-text whitespace-pre-wrap font-serif"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {scene.prose ?? scene.summary ?? '(No prose yet)'}
              </div>
              {/* Subtle scene label on hover */}
              <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[10px] text-text-light -rotate-90 origin-left translate-y-4 whitespace-nowrap">
                  {scene.title}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {scenes.length === 0 ? (
        <p className="text-text-muted text-center py-12">No scenes in this chapter yet.</p>
      ) : null}
    </div>
  )
}

// ── Word Count ───────────────────────────────────────────

function wordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// ── Main Scene Editor ────────────────────────────────────

function SceneEditor({
  sceneId,
  events,
  chapters,
  characterDocs,
  locationDocs,
  threadDocs,
  ruleDocs,
  noteDocs,
  onBack,
  onNavigate,
}: {
  sceneId: string
  events: Array<{ document_id: string; data: EventData }>
  chapters: Array<{ document_id: string; data: ChapterData }>
  characterDocs: Array<{ document_id: string; data: CharacterDocData }>
  locationDocs: Array<{ document_id: string; data: LocationData }>
  threadDocs: Array<{ document_id: string; data: PlotThreadData }>
  ruleDocs: Array<{ document_id: string; data: WorldRuleData }>
  noteDocs: Array<{ document_id: string; data: { title: string; content: string; note_type: string } }>
  onBack: () => void
  onNavigate: (id: string) => void
}) {
  const [mode, setMode] = useState<EditorMode>('full')
  const [metadataExpanded, setMetadataExpanded] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const scene = useMemo(
    () => events.find((e) => e.document_id === sceneId),
    [events, sceneId]
  )
  const sceneData = scene?.data

  // Order scenes within same chapter for prev/next
  const chapterScenes = useMemo(() => {
    if (!sceneData?.chapter_number) return []
    return events
      .filter((e) => e.data.chapter_number === sceneData.chapter_number)
      .sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0))
  }, [events, sceneData?.chapter_number])

  const currentIndex = chapterScenes.findIndex((e) => e.document_id === sceneId)
  const prevScene = currentIndex > 0 ? chapterScenes[currentIndex - 1] : undefined
  const nextScene = currentIndex < chapterScenes.length - 1 ? chapterScenes[currentIndex + 1] : undefined

  const chapter = useMemo(
    () => chapters.find((c) => c.data.number === sceneData?.chapter_number),
    [chapters, sceneData?.chapter_number]
  )

  // TipTap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          code: false,
        }),
        Placeholder.configure({
          placeholder: 'Begin writing your scene...',
        }),
      ],
      content: sceneData?.prose ?? '',
      editorProps: {
        attributes: {
          class:
            'prose prose-sm max-w-none focus:outline-none min-h-[300px] text-text leading-relaxed',
          style: "font-family: 'Georgia', 'Times New Roman', serif; font-size: 16px; line-height: 1.8;",
        },
      },
    },
    [sceneId]
  )

  const currentWordCount = editor ? wordCount(editor.getText()) : 0

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const target = direction === 'prev' ? prevScene : nextScene
      if (target) onNavigate(target.document_id)
    },
    [prevScene, nextScene, onNavigate]
  )

  if (!sceneData) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to scenes
        </button>
        <p className="text-text-muted">Scene not found.</p>
      </div>
    )
  }

  // ── Composition Mode ─────────────────────────────────
  if (mode === 'composition') {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex flex-col">
        {/* Minimal top bar */}
        <div className="flex items-center justify-between px-6 py-3 text-white/60">
          <div className="text-sm">{sceneData.title}</div>
          <div className="flex items-center gap-4">
            <span className="text-xs">{currentWordCount} words</span>
            <button
              onClick={() => setMode('full')}
              className="flex items-center gap-1.5 text-sm hover:text-white transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>

        {/* Prose editor — full screen */}
        <div className="flex-1 overflow-y-auto flex justify-center">
          <div className="w-full max-w-2xl px-8 py-8">
            <EditorContent
              editor={editor}
              className="composition-editor text-white/90"
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Full Context Mode ────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-2 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Scenes</span>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text truncate">{sceneData.title}</h2>
        </div>

        {/* Mode toggles */}
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          <button
            onClick={() => setMode('full')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              mode === 'full' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Edit
          </button>
          <button
            onClick={() => setMode('composition')}
            className="px-2.5 py-1 text-xs rounded font-medium transition-colors text-text-muted hover:text-text"
          >
            <Maximize2 className="w-3.5 h-3.5 inline mr-1" />
            Focus
          </button>
        </div>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="text-text-muted hover:text-text p-1 transition-colors"
          title={panelCollapsed ? 'Show context panel' : 'Hide context panel'}
        >
          {panelCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Metadata strip */}
      <MetadataStrip
        scene={sceneData}
        chapter={chapter?.data}
        expanded={metadataExpanded}
        onToggle={() => setMetadataExpanded(!metadataExpanded)}
      />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Prose editor (center) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Word count bar */}
          <div className="bg-surface border-t border-gray-100 px-4 py-1.5 flex items-center justify-between text-xs text-text-muted">
            <span>{currentWordCount} words</span>
            <span>
              Ch. {sceneData.chapter_number ?? '?'} · Scene {sceneData.scene_order ?? '?'}
            </span>
          </div>
        </div>

        {/* Context panel (right) */}
        {!panelCollapsed ? (
          <div className="w-72 xl:w-80 border-l border-gray-200 bg-white flex-shrink-0 hidden md:flex flex-col">
            <ContextPanel
              scene={sceneData}
              characterDocs={characterDocs}
              locationDocs={locationDocs}
              threadDocs={threadDocs}
              ruleDocs={ruleDocs}
              noteDocs={noteDocs}
            />
          </div>
        ) : null}
      </div>

      {/* Continuity strip (bottom) */}
      <ContinuityStrip
        prevScene={prevScene?.data}
        nextScene={nextScene?.data}
        onNavigate={handleNavigate}
      />
    </div>
  )
}

// ── Page Root ────────────────────────────────────────────

export default function ScenesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    searchParams.get('id')
  )
  const [showCreate, setShowCreate] = useState(false)
  const [flowChapter, setFlowChapter] = useState<number | null>(
    searchParams.has('flow') ? Number(searchParams.get('flow')) : null
  )

  // Sync URL params when selection changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedSceneId) params.set('id', selectedSceneId)
    else if (flowChapter != null) params.set('flow', String(flowChapter))
    setSearchParams(params, { replace: true })
  }, [selectedSceneId, flowChapter, setSearchParams])

  const { data: events, isLoading: loadingEvents } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 200,
  })
  const { data: chapters } = useDocuments({
    template_id: TEMPLATES.CHAPTER,
    status: 'active',
    page_size: 50,
  })
  const { data: characterDocsRaw } = useDocuments({
    template_id: TEMPLATES.CHARACTER,
    status: 'active',
    page_size: 50,
  })
  const { data: locationDocsRaw } = useDocuments({
    template_id: TEMPLATES.LOCATION,
    status: 'active',
    page_size: 50,
  })
  const { data: threadDocsRaw } = useDocuments({
    template_id: TEMPLATES.PLOT_THREAD,
    status: 'active',
    page_size: 50,
  })
  const { data: ruleDocsRaw } = useDocuments({
    template_id: TEMPLATES.WORLD_RULE,
    status: 'active',
    page_size: 50,
  })
  const { data: noteDocsRaw } = useDocuments({
    template_id: TEMPLATES.NOTE,
    status: 'active',
    page_size: 50,
  })

  // Cast all documents
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
  const characterDocs = useMemo(
    () =>
      (characterDocsRaw?.items ?? []).map((c) => ({
        document_id: c.document_id,
        data: c.data as unknown as CharacterDocData,
      })),
    [characterDocsRaw]
  )
  const locationDocs = useMemo(
    () =>
      (locationDocsRaw?.items ?? []).map((l) => ({
        document_id: l.document_id,
        data: l.data as unknown as LocationData,
      })),
    [locationDocsRaw]
  )
  const threadDocs = useMemo(
    () =>
      (threadDocsRaw?.items ?? []).map((t) => ({
        document_id: t.document_id,
        data: t.data as unknown as PlotThreadData,
      })),
    [threadDocsRaw]
  )
  const ruleDocs = useMemo(
    () =>
      (ruleDocsRaw?.items ?? []).map((r) => ({
        document_id: r.document_id,
        data: r.data as unknown as WorldRuleData,
      })),
    [ruleDocsRaw]
  )
  const noteDocs = useMemo(
    () =>
      (noteDocsRaw?.items ?? []).map((n) => ({
        document_id: n.document_id,
        data: n.data as unknown as { title: string; content: string; note_type: string },
      })),
    [noteDocsRaw]
  )

  if (loadingEvents) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading scenes...</div>
      </div>
    )
  }

  // ── Flow View mode ───────────────────────────────────
  if (flowChapter != null) {
    const chapterScenes = allEvents
      .filter((e) => e.data.chapter_number === flowChapter)
      .sort((a, b) => (a.data.scene_order ?? 0) - (b.data.scene_order ?? 0))
    const chapter = allChapters.find((c) => c.data.number === flowChapter)

    return (
      <FlowView
        scenes={chapterScenes.map((s) => s.data)}
        chapterNum={flowChapter}
        chapterTitle={chapter?.data.title}
        onExit={() => setFlowChapter(null)}
      />
    )
  }

  // ── Scene Editor mode ────────────────────────────────
  if (selectedSceneId) {
    return (
      <SceneEditor
        sceneId={selectedSceneId}
        events={allEvents}
        chapters={allChapters}
        characterDocs={characterDocs}
        locationDocs={locationDocs}
        threadDocs={threadDocs}
        ruleDocs={ruleDocs}
        noteDocs={noteDocs}
        onBack={() => setSelectedSceneId(null)}
        onNavigate={(id) => setSelectedSceneId(id)}
      />
    )
  }

  // ── Scene Selector (landing) ─────────────────────────
  return (
    <>
    <SceneSelector
      events={allEvents}
      chapters={allChapters}
      onSelect={(id) => setSelectedSceneId(id)}
      onFlowView={(chNum) => setFlowChapter(chNum)}
      onCreateScene={() => setShowCreate(true)}
    />

    {showCreate ? (
      <CreateEntityModal
        entityType="scene"
        onClose={() => setShowCreate(false)}
      />
    ) : null}
    </>
  )
}
