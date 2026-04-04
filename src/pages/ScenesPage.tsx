import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useDocuments, useCreateDocument, useDeleteDocument } from '@wip/react'
import { useQueryClient } from '@tanstack/react-query'
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
  Save,
  Scissors,
  Trash2,
  ShieldCheck,
  Check,
  XCircle,
  AlertTriangle,
  EyeOff,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { useBookStructure, type BookStructure } from '../lib/useBookStructure'
import { useEntityTerms, validateSceneAnnotations, type AnnotationResult } from '../lib/useValidateScene'
import CreateEntityModal from '../components/CreateEntityModal'
import { notifyDraftChange, DRAFT_DISCARD_EVENT } from '../components/UnsavedDraftBanner'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'

// ── Data interfaces ──────────────────────────────────────

interface EventData {
  title: string
  event_type?: string
  story_time_raw?: string
  story_time_sort?: number
  location?: string
  characters?: string[]
  summary?: string
  prose?: string
  plot_threads?: string[]
  emotional_beat?: string
  notes?: string
  suppressed_suggestions?: string[]
}

interface ChapterData {
  title: string
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
  structure,
  onSelect,
  onFlowView,
  onCreateScene,
}: {
  events: Array<{ document_id: string; data: EventData }>
  chapters: Array<{ document_id: string; data: ChapterData }>
  structure: BookStructure | undefined
  onSelect: (id: string) => void
  onFlowView: (chapterId: string) => void
  onCreateScene: () => void
}) {
  // Build a lookup from document_id to event
  const eventMap = useMemo(() => {
    const map = new Map<string, { document_id: string; data: EventData }>()
    events.forEach((e) => map.set(e.document_id, e))
    return map
  }, [events])

  // Build a lookup from document_id to chapter
  const chapterMap = useMemo(() => {
    const map = new Map<string, { document_id: string; data: ChapterData }>()
    chapters.forEach((c) => map.set(c.document_id, c))
    return map
  }, [chapters])

  // Ordered chapters with their scenes, plus unassigned scenes
  const { orderedChapters, unassigned } = useMemo(() => {
    if (!structure) {
      // No structure yet — all scenes are unassigned
      return { orderedChapters: [] as Array<{ chapterId: string; chapterDoc: { document_id: string; data: ChapterData } | undefined; chapterNumber: number; scenes: Array<{ document_id: string; data: EventData }> }>, unassigned: [...events] }
    }

    const assignedSceneIds = new Set(structure.getAllSceneIds())

    const ordered = structure.raw.chapters.map((slot, index) => {
      const chapterDoc = chapterMap.get(slot.chapter_id)
      const scenes = slot.scene_ids
        .map((sid) => eventMap.get(sid))
        .filter((e): e is { document_id: string; data: EventData } => e != null)
      return {
        chapterId: slot.chapter_id,
        chapterDoc,
        chapterNumber: index + 1,
        scenes,
      }
    })

    const unassignedScenes = events.filter((e) => !assignedSceneIds.has(e.document_id))

    return { orderedChapters: ordered, unassigned: unassignedScenes }
  }, [structure, events, eventMap, chapterMap])

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

      {orderedChapters.length > 0 ? (
        <div className="space-y-4">
          {orderedChapters.map((ch) => (
            <div key={ch.chapterId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-text">
                    Chapter {ch.chapterNumber}
                    {ch.chapterDoc?.data.title ? `: ${ch.chapterDoc.data.title}` : ''}
                  </span>
                  <span className="text-xs text-text-muted">{ch.scenes.length} scene{ch.scenes.length !== 1 ? 's' : ''}</span>
                </div>
                {ch.scenes.length > 0 ? (
                  <button
                    onClick={() => onFlowView(ch.chapterId)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Flow view
                  </button>
                ) : null}
              </div>

              {ch.scenes.length > 0 ? (
                <div>
                  {ch.scenes.map((scene, i) => (
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
          ))}
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

      {orderedChapters.length === 0 && unassigned.length === 0 ? (
        <p className="text-text-muted">No scenes yet. Click "New Scene" to create one.</p>
      ) : null}
    </div>
  )
}

// ── Metadata Strip (top) ─────────────────────────────────

function MetadataStrip({
  scene,
  chapterTitle,
  chapterNumber,
  sceneNumber,
  expanded,
  onToggle,
}: {
  scene: EventData
  chapterTitle?: string
  chapterNumber?: number
  sceneNumber?: number
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
            Ch. {chapterNumber ?? '?'}
            {chapterTitle ? `: ${chapterTitle}` : ''}
          </span>
          <span className="text-text-light">·</span>
          <span className="text-text-muted">Scene {sceneNumber ?? '?'}</span>
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
            <div className="ml-12 mr-3 mb-2 space-y-2 break-words">
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

type ContextTab = 'characters' | 'location' | 'threads' | 'rules' | 'notes' | 'validate'

function ContextPanel({
  scene,
  characterDocs,
  locationDocs,
  threadDocs,
  ruleDocs,
  noteDocs,
  validationResults,
  onValidationConfirm,
  onValidationDismiss,
  onValidationRemove,
  onValidationUnsuppress,
}: {
  scene: EventData
  characterDocs: Array<{ document_id: string; data: CharacterDocData }>
  locationDocs: Array<{ document_id: string; data: LocationData }>
  threadDocs: Array<{ document_id: string; data: PlotThreadData }>
  ruleDocs: Array<{ document_id: string; data: WorldRuleData }>
  noteDocs: Array<{ document_id: string; data: { title: string; content: string; note_type: string } }>
  validationResults: AnnotationResult[] | null
  onValidationConfirm: (result: AnnotationResult) => void
  onValidationDismiss: (result: AnnotationResult) => void
  onValidationRemove: (result: AnnotationResult) => void
  onValidationUnsuppress: (result: AnnotationResult) => void
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

  const validationActionCount = validationResults
    ? validationResults.filter(r => r.state === 'detected' || r.state === 'missing').length
    : undefined

  const tabs: Array<{ key: ContextTab; label: string; icon: typeof Users; count?: number; highlight?: boolean }> = [
    { key: 'characters', label: 'Characters', icon: Users, count: scene.characters?.length ?? 0 },
    { key: 'location', label: 'Location', icon: MapPin },
    { key: 'threads', label: 'Threads', icon: GitBranch, count: activeThreads.length },
    { key: 'rules', label: 'Rules', icon: Globe, count: ruleDocs.length },
    { key: 'notes', label: 'Notes', icon: StickyNote, count: noteDocs.length },
    { key: 'validate', label: 'Validate', icon: ShieldCheck, count: validationActionCount, highlight: (validationActionCount ?? 0) > 0 },
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
            {t.count != null && t.count > 0 ? (
              <span className={`ml-0.5 text-[10px] ${t.highlight ? 'text-amber-600 font-bold' : 'opacity-60'}`}>{t.count}</span>
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
              <div className="space-y-2 break-words">
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
                <div key={t.document_id} className="bg-surface rounded p-2 break-words">
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
                <div key={r.document_id} className="bg-surface rounded p-2 overflow-hidden">
                  <div className="text-sm font-medium text-text break-words">{r.data.name}</div>
                  <p className="text-xs text-text-muted mt-0.5 break-words">{r.data.rule}</p>
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
                <div key={n.document_id} className="bg-surface rounded p-2 break-words">
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

        {tab === 'validate' ? (
          <ValidationPanel
            results={validationResults ?? []}
            onConfirm={onValidationConfirm}
            onDismiss={onValidationDismiss}
            onRemove={onValidationRemove}
            onUnsuppress={onValidationUnsuppress}
          />
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
  events,
  structure,
  chapterId,
  onExit,
}: {
  events: Array<{ document_id: string; data: EventData }>
  structure: BookStructure | undefined
  chapterId: string
  onExit: () => void
}) {
  // Build event lookup
  const eventMap = useMemo(() => {
    const map = new Map<string, EventData>()
    events.forEach((e) => map.set(e.document_id, e.data))
    return map
  }, [events])

  const chapterNum = structure?.getChapterNumber(chapterId)

  // Get ordered scenes for this chapter from structure
  const scenes = useMemo(() => {
    if (!structure) return []
    const sceneIds = structure.getScenesForChapter(chapterId)
    return sceneIds
      .map((sid) => eventMap.get(sid))
      .filter((s): s is EventData => s != null)
  }, [structure, chapterId, eventMap])

  // Find chapter title from events list (chapters are loaded separately in parent)
  // We receive it indirectly — the parent could pass it, but we can derive from structure
  // For the title, we need the chapter documents. Let's accept it won't be available here
  // and just show the number. The parent passes chapterId, and the chapter doc lookup
  // happens in the parent. We'll keep it simple.

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-text">
            Chapter {chapterNum ?? '?'}
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

// ── Validation Results Panel ─────────────────────────────

const STATE_CONFIG: Record<AnnotationResult['state'], { icon: typeof Check; label: string; color: string; bgColor: string }> = {
  confirmed: { icon: Check, label: 'Confirmed', color: 'text-green-600', bgColor: 'bg-green-50' },
  missing: { icon: AlertTriangle, label: 'Missing from prose', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  detected: { icon: Eye, label: 'Detected — not listed', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  suppressed: { icon: EyeOff, label: 'Intentionally excluded', color: 'text-gray-400', bgColor: 'bg-gray-50' },
}

const CATEGORY_LABELS: Record<string, string> = {
  character: 'Characters',
  location: 'Locations',
  plot_thread: 'Plot Threads',
}

function ValidationPanel({
  results,
  onConfirm,
  onDismiss,
  onRemove,
  onUnsuppress,
}: {
  results: AnnotationResult[]
  onConfirm: (result: AnnotationResult) => void
  onDismiss: (result: AnnotationResult) => void
  onRemove: (result: AnnotationResult) => void
  onUnsuppress: (result: AnnotationResult) => void
}) {
  if (results.length === 0) {
    return (
      <div className="text-xs text-text-muted p-3 text-center py-8">
        No validation results. Click Validate to scan prose.
      </div>
    )
  }

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, AnnotationResult[]>()
    for (const r of results) {
      const list = map.get(r.category) ?? []
      list.push(r)
      map.set(r.category, list)
    }
    return map
  }, [results])

  const actionable = results.filter(r => r.state !== 'confirmed')

  return (
    <div className="space-y-3 p-3">
      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>{results.filter(r => r.state === 'confirmed').length} confirmed</span>
        <span className="text-gray-300">|</span>
        <span className={actionable.length > 0 ? 'text-amber-600 font-medium' : ''}>{actionable.length} need attention</span>
      </div>

      {(['character', 'location', 'plot_thread'] as const).map(cat => {
        const items = grouped.get(cat)
        if (!items || items.length === 0) return null

        return (
          <div key={cat}>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
              {CATEGORY_LABELS[cat]}
            </div>
            <div className="space-y-1">
              {items.map(r => {
                const config = STATE_CONFIG[r.state]
                const Icon = config.icon
                return (
                  <div
                    key={`${r.category}-${r.termValue}`}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${config.bgColor}`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.color}`} />
                    <span className="flex-1 min-w-0 truncate font-medium text-text">{r.label}</span>

                    {/* Actions */}
                    {r.state === 'detected' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onConfirm(r)}
                          className="text-green-600 hover:text-green-800 p-0.5"
                          title="Add to scene"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDismiss(r)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                          title="Exclude — don't suggest again"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {r.state === 'missing' && (
                      <button
                        onClick={() => onRemove(r)}
                        className="text-amber-600 hover:text-red-600 p-0.5 flex-shrink-0"
                        title="Remove stale annotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.state === 'suppressed' && (
                      <button
                        onClick={() => onUnsuppress(r)}
                        className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0"
                        title="Restore — allow suggestions again"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
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
  structure,
  structureDocId,
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
  structure: BookStructure | undefined
  structureDocId: string | undefined
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
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDirtyRef = useRef(false)
  const baselineHtmlRef = useRef('')
  const queryClient = useQueryClient()
  const createDocument = useCreateDocument()
  const deleteDocument = useDeleteDocument()
  const [validationResults, setValidationResults] = useState<AnnotationResult[] | null>(null)
  const { characterTerms, locationTerms, plotThreadTerms, isLoading: termsLoading } = useEntityTerms()

  const scene = useMemo(
    () => events.find((e) => e.document_id === sceneId),
    [events, sceneId]
  )
  const sceneData = scene?.data

  // localStorage key for auto-backup
  const draftKey = `aa-scene-draft-${sceneId}`

  // Use structure for chapter/scene info
  const scenePosition = useMemo(
    () => structure?.getScenePosition(sceneId),
    [structure, sceneId]
  )

  const chapterNumber = useMemo(
    () => structure?.getChapterNumberForScene(sceneId),
    [structure, sceneId]
  )

  const sceneNumber = useMemo(
    () => scenePosition ? scenePosition.sceneIndex + 1 : undefined,
    [scenePosition]
  )

  // Find chapter document for metadata
  const chapter = useMemo(() => {
    const chapterId = structure?.getChapterForScene(sceneId)
    if (!chapterId) return undefined
    return chapters.find((c) => c.document_id === chapterId)
  }, [structure, sceneId, chapters])

  // Build event lookup for navigation
  const eventMap = useMemo(() => {
    const map = new Map<string, { document_id: string; data: EventData }>()
    events.forEach((e) => map.set(e.document_id, e))
    return map
  }, [events])

  // Order scenes within same chapter for prev/next using structure
  const { prevScene, nextScene } = useMemo(() => {
    if (!structure || !scenePosition) {
      return { prevScene: undefined, nextScene: undefined }
    }
    const chapterSceneIds = structure.getScenesForChapter(scenePosition.chapterId)
    const idx = chapterSceneIds.indexOf(sceneId)
    const prevId = idx > 0 ? chapterSceneIds[idx - 1] : undefined
    const nextId = idx < chapterSceneIds.length - 1 ? chapterSceneIds[idx + 1] : undefined
    const prev = prevId ? eventMap.get(prevId) : undefined
    const next = nextId ? eventMap.get(nextId) : undefined
    return { prevScene: prev, nextScene: next }
  }, [structure, scenePosition, sceneId, eventMap])

  // Resolve initial content: localStorage draft if newer, else WIP prose
  const initialContent = useMemo(() => {
    const wipProse = sceneData?.prose ?? ''
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw) as { content: string; savedAt: number }
        // Only use draft if it differs from WIP and is recent (< 24h)
        const ageMs = Date.now() - draft.savedAt
        if (ageMs < 24 * 60 * 60 * 1000 && draft.content !== wipProse) {
          return draft.content
        }
      }
    } catch { /* ignore corrupt localStorage */ }
    return wipProse
  }, [sceneId]) // eslint-disable-line react-hooks/exhaustive-deps

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
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            'prose prose-sm max-w-none focus:outline-none min-h-[300px] text-text leading-relaxed',
          style: "font-family: 'Georgia', 'Times New Roman', serif; font-size: 16px; line-height: 1.8;",
        },
      },
      onCreate: ({ editor: e }) => {
        // Capture TipTap's normalized HTML as the baseline for dirty comparison
        baselineHtmlRef.current = e.getHTML()
      },
      onUpdate: ({ editor: e }) => {
        const changed = e.getHTML() !== baselineHtmlRef.current
        setIsDirty(changed)
        isDirtyRef.current = changed
      },
    },
    [sceneId]
  )

  // Mark dirty on mount if we loaded a localStorage draft that differs from WIP
  useEffect(() => {
    if (initialContent !== (sceneData?.prose ?? '')) {
      setIsDirty(true)
      isDirtyRef.current = true
    } else {
      setIsDirty(false)
      isDirtyRef.current = false
    }
    setLastSaved(null)
  }, [sceneId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Write draft to localStorage with title for the global banner
  const writeDraft = useCallback((html: string) => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({ content: html, title: sceneData?.title ?? '', savedAt: Date.now() })
    )
    notifyDraftChange()
  }, [draftKey, sceneData?.title])

  // Flush current editor content to localStorage immediately
  const flushDraft = useCallback(() => {
    if (!editor) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (editor.getText().trim()) {
      writeDraft(editor.getHTML())
    }
  }, [editor, writeDraft])

  // Auto-backup to localStorage every 3 seconds on change
  useEffect(() => {
    if (!editor) return
    const handler = () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        if (isDirtyRef.current && editor.getText().trim()) {
          writeDraft(editor.getHTML())
        }
      }, 3000)
    }
    editor.on('update', handler)
    // Flush draft on unmount (navigating away)
    return () => {
      editor.off('update', handler)
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      // Only save draft if user actually made edits
      if (isDirtyRef.current && editor.getText().trim()) {
        writeDraft(editor.getHTML())
      }
    }
  }, [editor, draftKey, writeDraft])

  // Listen for discard events from the banner — reset editor to WIP version
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.sceneId !== sceneId || !editor) return
      const wipProse = sceneData?.prose ?? ''
      editor.commands.setContent(wipProse)
      baselineHtmlRef.current = editor.getHTML()
      setIsDirty(false)
      isDirtyRef.current = false
      setLastSaved(null)
    }
    window.addEventListener(DRAFT_DISCARD_EVENT, handler)
    return () => window.removeEventListener(DRAFT_DISCARD_EVENT, handler)
  }, [editor, sceneId, sceneData?.prose])

  // Save prose to WIP — creates a new version with all existing data + updated prose
  const handleSave = useCallback(() => {
    if (!editor || !sceneData) return
    const prose = editor.getHTML()
    createDocument.mutate(
      {
        template_id: TEMPLATES.EVENT,
        namespace: 'aa',
        data: { ...sceneData, prose },
      },
      {
        onSuccess: () => {
          // Reset baseline to current content so further edits compare against saved state
          if (editor) baselineHtmlRef.current = editor.getHTML()
          setIsDirty(false)
          isDirtyRef.current = false
          setLastSaved(new Date())
          // Clear localStorage draft since we've saved to WIP
          localStorage.removeItem(draftKey)
          notifyDraftChange()
        },
      }
    )
  }, [editor, sceneData, createDocument, draftKey])

  const currentWordCount = editor ? wordCount(editor.getText()) : 0

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const target = direction === 'prev' ? prevScene : nextScene
      if (target) {
        flushDraft()
        onNavigate(target.document_id)
      }
    },
    [prevScene, nextScene, onNavigate, flushDraft]
  )

  const handleBack = useCallback(() => {
    flushDraft()
    onBack()
  }, [onBack, flushDraft])

  const handleDelete = useCallback(() => {
    deleteDocument.mutate(
      { id: sceneId },
      {
        onSuccess: () => {
          localStorage.removeItem(draftKey)
          notifyDraftChange()
          onBack()
        },
      }
    )
  }, [deleteDocument, sceneId, draftKey, onBack])

  const [splitting, setSplitting] = useState(false)

  const handleSplit = useCallback(async () => {
    if (!editor || !sceneData || !structure || !structureDocId) return
    const { from } = editor.state.selection

    // Find the block-level split point: walk up from cursor to find top-level node boundary
    const doc = editor.state.doc
    let splitPos = from

    // Resolve to a top-level block boundary (depth 1 = direct child of doc)
    const resolved = doc.resolve(splitPos)
    if (resolved.depth > 1) {
      // Move to the end of the nearest top-level block
      const topIndex = resolved.index(1)
      let pos = 0
      doc.forEach((node, offset, index) => {
        if (index === topIndex) pos = offset + node.nodeSize
      })
      if (pos > 0) splitPos = pos + 1 // +1 for the doc opening
    }

    // Generate HTML for before and after the split
    const json = editor.getJSON()
    const allContent = json.content || []
    // Find which top-level node the cursor is in
    let cumPos = 1 // TipTap doc starts at pos 1
    let splitIndex = 0
    for (let i = 0; i < allContent.length; i++) {
      const nodeSize = editor.state.doc.child(i).nodeSize
      if (cumPos + nodeSize > from) {
        splitIndex = i + 1 // split AFTER this node
        break
      }
      cumPos += nodeSize
    }

    // Ensure we don't split at the very start or end
    if (splitIndex === 0) splitIndex = 1
    if (splitIndex >= allContent.length) {
      alert('Place the cursor between paragraphs to split the scene.')
      return
    }

    const firstHalf = allContent.slice(0, splitIndex)
    const secondHalf = allContent.slice(splitIndex)

    // Use ProseMirror's DOMSerializer to convert JSON slices back to HTML
    const { schema } = editor.state
    const { DOMSerializer } = await import('@tiptap/pm/model')
    const serializer = DOMSerializer.fromSchema(schema)
    const jsonToHtml = (content: any[]) => {
      const node = schema.nodeFromJSON({ type: 'doc', content })
      const fragment = serializer.serializeFragment(node.content)
      const div = document.createElement('div')
      div.appendChild(fragment)
      return div.innerHTML
    }
    const firstHtml = jsonToHtml(firstHalf)
    const secondHtml = jsonToHtml(secondHalf)

    setSplitting(true)
    try {
      // 1. Save first half to current scene
      await new Promise<void>((resolve, reject) => {
        createDocument.mutate(
          {
            template_id: TEMPLATES.EVENT,
            namespace: 'aa',
            data: { ...sceneData, prose: firstHtml },
          },
          { onSuccess: () => resolve(), onError: reject }
        )
      })

      // 2. Create new scene with second half
      const newTitle = `${sceneData.title} (continued)`
      const newSceneId = await new Promise<string>((resolve, reject) => {
        createDocument.mutate(
          {
            template_id: TEMPLATES.EVENT,
            namespace: 'aa',
            data: {
              title: newTitle,
              event_type: sceneData.event_type,
              story_time_raw: sceneData.story_time_raw,
              story_time_sort: (sceneData.story_time_sort ?? 0) + 1,
              location: sceneData.location,
              characters: sceneData.characters,
              summary: '',
              prose: secondHtml,
              plot_threads: sceneData.plot_threads,
              emotional_beat: '',
            },
          },
          {
            onSuccess: (data: any) => resolve(data.document_id),
            onError: reject,
          }
        )
      })

      // 3. Update book structure — insert new scene after current scene
      const pos = structure.getScenePosition(sceneId)
      if (pos) {
        const newChapters = structure.raw.chapters.map((slot, ci) => {
          if (ci !== pos.chapterIndex) return slot
          const newSceneIds = [...slot.scene_ids]
          newSceneIds.splice(pos.sceneIndex + 1, 0, newSceneId)
          return { ...slot, scene_ids: newSceneIds }
        })
        await new Promise<void>((resolve, reject) => {
          createDocument.mutate(
            {
              template_id: TEMPLATES.BOOK_STRUCTURE,
              namespace: 'aa',
              data: { ...structure.raw, chapters: newChapters },
            },
            { onSuccess: () => resolve(), onError: reject }
          )
        })
      }

      // 4. Invalidate cache so both scenes load fresh from WIP
      localStorage.removeItem(draftKey)
      notifyDraftChange()
      await queryClient.invalidateQueries()

      // Navigate to the new scene
      onNavigate(newSceneId)
    } catch (err: any) {
      alert(`Split failed: ${err.message || 'Unknown error'}`)
    } finally {
      setSplitting(false)
    }
  }, [editor, sceneData, structure, structureDocId, sceneId, createDocument, draftKey, onNavigate])

  // ── Validation ──────────────────────────────────────────
  const handleValidate = useCallback(() => {
    if (!sceneData || termsLoading) return
    const prose = editor?.getHTML() ?? sceneData.prose ?? ''
    const results = validateSceneAnnotations(
      prose,
      sceneData.characters ?? [],
      sceneData.location,
      sceneData.plot_threads ?? [],
      sceneData.suppressed_suggestions ?? [],
      characterTerms,
      locationTerms,
      plotThreadTerms,
    )
    setValidationResults(results)
  }, [sceneData, editor, termsLoading, characterTerms, locationTerms, plotThreadTerms])

  // Clear validation results when switching scenes
  useEffect(() => {
    setValidationResults(null)
  }, [sceneId])

  // Save scene data with mutations (used by validation actions)
  const saveSceneData = useCallback((updatedData: EventData) => {
    createDocument.mutate(
      {
        template_id: TEMPLATES.EVENT,
        namespace: 'aa',
        data: updatedData as unknown as Record<string, unknown>,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries()
        },
      }
    )
  }, [createDocument, queryClient])

  const handleValidationConfirm = useCallback((result: AnnotationResult) => {
    if (!sceneData) return
    const updated = { ...sceneData }
    if (result.category === 'character') {
      updated.characters = [...(updated.characters ?? []), result.termValue]
    } else if (result.category === 'location') {
      updated.location = result.termValue
    } else if (result.category === 'plot_thread') {
      updated.plot_threads = [...(updated.plot_threads ?? []), result.termValue]
    }
    saveSceneData(updated)
    // Update results locally
    setValidationResults(prev =>
      prev?.map(r => r === result ? { ...r, state: 'confirmed' as const } : r) ?? null
    )
  }, [sceneData, saveSceneData])

  const handleValidationDismiss = useCallback((result: AnnotationResult) => {
    if (!sceneData) return
    const updated = { ...sceneData }
    updated.suppressed_suggestions = [...(updated.suppressed_suggestions ?? []), result.termValue]
    saveSceneData(updated)
    setValidationResults(prev =>
      prev?.map(r => r === result ? { ...r, state: 'suppressed' as const } : r) ?? null
    )
  }, [sceneData, saveSceneData])

  const handleValidationRemove = useCallback((result: AnnotationResult) => {
    if (!sceneData) return
    const updated = { ...sceneData }
    if (result.category === 'character') {
      updated.characters = (updated.characters ?? []).filter(c => c !== result.termValue)
    } else if (result.category === 'location') {
      if (updated.location === result.termValue) updated.location = undefined
    } else if (result.category === 'plot_thread') {
      updated.plot_threads = (updated.plot_threads ?? []).filter(p => p !== result.termValue)
    }
    saveSceneData(updated)
    // Remove from results
    setValidationResults(prev => prev?.filter(r => r !== result) ?? null)
  }, [sceneData, saveSceneData])

  const handleValidationUnsuppress = useCallback((result: AnnotationResult) => {
    if (!sceneData) return
    const updated = { ...sceneData }
    updated.suppressed_suggestions = (updated.suppressed_suggestions ?? []).filter(s => s !== result.termValue)
    saveSceneData(updated)
    setValidationResults(prev =>
      prev?.map(r => r === result ? { ...r, state: 'detected' as const } : r) ?? null
    )
  }, [sceneData, saveSceneData])

  const validationBadgeCount = validationResults
    ? validationResults.filter(r => r.state === 'detected' || r.state === 'missing').length
    : 0

  if (!sceneData) {
    return (
      <div className="p-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4">
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
          <div className="text-sm">
            {sceneData.title}
            {isDirty ? <span className="text-amber-400 ml-1">*</span> : null}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs">{currentWordCount} words</span>
            <button
              onClick={handleSave}
              disabled={!isDirty || createDocument.isPending}
              className="flex items-center gap-1.5 text-sm hover:text-white transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              <Save className="w-4 h-4" />
              {createDocument.isPending ? 'Saving...' : 'Save'}
            </button>
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
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Scenes</span>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text truncate">
            {sceneData.title}
            {isDirty ? <span className="text-amber-500 ml-1">*</span> : null}
          </h2>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || createDocument.isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isDirty
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-text-muted cursor-default'
          } disabled:opacity-50`}
        >
          <Save className="w-3.5 h-3.5" />
          {createDocument.isPending ? 'Saving...' : 'Save'}
        </button>

        {/* Split */}
        <button
          onClick={handleSplit}
          disabled={splitting || !structure || !structureDocId}
          className="text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title="Split scene at cursor position"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Validate */}
        <button
          onClick={handleValidate}
          disabled={termsLoading}
          className="relative text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title="Validate scene annotations"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {validationBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {validationBadgeCount}
            </span>
          )}
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-red-600">Delete scene?</span>
            <button
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
              className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteDocument.isPending ? '...' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs font-medium bg-gray-100 text-text-muted rounded hover:bg-gray-200 transition-colors"
            >
              No
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-text-muted hover:text-red-600 p-1 transition-colors"
            title="Delete scene"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mode toggles */}
        <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
          <button
            onClick={() => setMode('full')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              mode === 'full' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text'
            }`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            {mode === 'full' ? 'Editing' : 'Edit'}
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
        chapterTitle={chapter?.data.title}
        chapterNumber={chapterNumber}
        sceneNumber={sceneNumber}
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
              {lastSaved ? (
                <span className="text-green-600 mr-2">Saved</span>
              ) : isDirty ? (
                <span className="text-amber-500 mr-2">Unsaved changes</span>
              ) : null}
              Ch. {chapterNumber ?? '?'} · Scene {sceneNumber ?? '?'}
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
              validationResults={validationResults}
              onValidationConfirm={handleValidationConfirm}
              onValidationDismiss={handleValidationDismiss}
              onValidationRemove={handleValidationRemove}
              onValidationUnsuppress={handleValidationUnsuppress}
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
  const [flowChapterId, setFlowChapterId] = useState<string | null>(
    searchParams.get('flow') ?? null
  )

  const { structure, structureDocId } = useBookStructure()

  // Sync incoming URL params → state (e.g. banner resume navigation)
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId && urlId !== selectedSceneId) {
      setSelectedSceneId(urlId)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL params when selection changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedSceneId) params.set('id', selectedSceneId)
    else if (flowChapterId != null) params.set('flow', flowChapterId)
    setSearchParams(params, { replace: true })
  }, [selectedSceneId, flowChapterId, setSearchParams])

  const { data: events, isLoading: loadingEvents } = useDocuments({
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
  const { data: characterDocsRaw } = useDocuments({
    template_id: TEMPLATES.CHARACTER,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })
  const { data: locationDocsRaw } = useDocuments({
    template_id: TEMPLATES.LOCATION,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })
  const { data: threadDocsRaw } = useDocuments({
    template_id: TEMPLATES.PLOT_THREAD,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })
  const { data: ruleDocsRaw } = useDocuments({
    template_id: TEMPLATES.WORLD_RULE,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })
  const { data: noteDocsRaw } = useDocuments({
    template_id: TEMPLATES.NOTE,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
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
  if (flowChapterId != null) {
    return (
      <FlowView
        events={allEvents}
        structure={structure}
        chapterId={flowChapterId}
        onExit={() => setFlowChapterId(null)}
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
        structure={structure}
        structureDocId={structureDocId}
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
      structure={structure}
      onSelect={(id) => setSelectedSceneId(id)}
      onFlowView={(chapterId) => setFlowChapterId(chapterId)}
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
