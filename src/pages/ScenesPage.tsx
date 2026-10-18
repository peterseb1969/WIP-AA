import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useDocuments, useCreateDocument, useDeleteDocument, useWipClient, wipKeys } from '@wip/react'
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
  Sparkles,
  Loader2,
  ArrowRightLeft,
  Merge,
  Image as ImageIcon,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { useBookStructure, useStructureEditor, type BookStructure } from '../lib/useBookStructure'
import { useResizableWidth } from '../lib/useResizableWidth'
import { buildUserMessage, runAnalysis, type PromptData } from '../lib/analysis'
import { useStructureUndo } from '../lib/structureUndo'
import { useEntityTerms, validateSceneAnnotations, type AnnotationResult } from '../lib/useValidateScene'
import CreateEntityModal from '../components/CreateEntityModal'
import MoveSceneDialog from '../components/MoveSceneDialog'
import MergeSceneDialog from '../components/MergeSceneDialog'
import { notifyDraftChange, DRAFT_DISCARD_EVENT } from '../components/UnsavedDraftBanner'
import StatusBadge from '../components/StatusBadge'
import BackLink from '../components/BackLink'
import MediaSection, { Avatar } from '../components/MediaSection'
import { useAttachments, useCharacterPortraits } from '../lib/media'

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
  const { t } = useTranslation()

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
        <h1 className="text-2xl font-semibold text-text">{t('scenes.title')}</h1>
        <span className="text-sm text-text-muted">({t('common.scene_count', { count: events.length })})</span>
        <button
          onClick={onCreateScene}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('scenes.new')}
        </button>
      </div>

      <p className="text-sm text-text-muted mb-6">
        {t('scenes.select_prompt')}
      </p>

      {orderedChapters.length > 0 ? (
        <div className="space-y-4">
          {orderedChapters.map((ch) => (
            <div key={ch.chapterId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-text">
                    {t('scenes.chapter_label', { number: ch.chapterNumber })}
                    {ch.chapterDoc?.data.title ? `: ${ch.chapterDoc.data.title}` : ''}
                  </span>
                  <span className="text-xs text-text-muted">{t('common.scene_count', { count: ch.scenes.length })}</span>
                </div>
                {ch.scenes.length > 0 ? (
                  <button
                    onClick={() => onFlowView(ch.chapterId)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('scenes.flow_view')}
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
                <div className="p-4 text-sm text-text-muted">{t('scenes.no_scenes_in_chapter')}</div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Scenes not assigned to any chapter */}
      {unassigned.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 border-dashed overflow-hidden mt-4">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <span className="font-semibold text-text-muted">{t('scenes.unassigned')}</span>
            <span className="text-xs text-text-muted">{t('common.scene_count', { count: unassigned.length })}</span>
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
        <p className="text-text-muted">{t('scenes.empty')}</p>
      ) : null}
    </div>
  )
}

// ── Metadata Strip (top) ─────────────────────────────────

function MetadataStrip({
  scene,
  sceneNumber,
  chapterLabel,
  hasChapters,
  onOpenMove,
  moveError,
  expanded,
  onToggle,
}: {
  scene: EventData
  sceneNumber?: number
  /** "Ch. N: Title", or undefined when the scene is in no chapter. */
  chapterLabel?: string
  hasChapters: boolean
  onOpenMove: () => void
  moveError: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Compact strip — always visible. The Move button sits outside the
          toggle button (buttons can't nest). */}
      <div className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-surface/50 transition-colors">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted max-w-64 truncate">{chapterLabel ?? t('scenes.no_chapter')}</span>
          {chapterLabel ? (
            <>
              <span className="text-text-light">·</span>
              <span className="text-text-muted">Scene {sceneNumber ?? '?'}</span>
            </>
          ) : null}
          <button
            onClick={onOpenMove}
            disabled={!hasChapters}
            title={hasChapters ? t('scenes.move_to_chapter') : t('scenes.no_chapters_yet')}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-text-muted border border-gray-200 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3 h-3" />
            {t('move.button')}
          </button>
          {moveError ? <span className="text-xs text-red-600">{moveError}</span> : null}
        </div>

      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-4 text-left min-w-0"
      >
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
      </div>

      {/* Expanded metadata */}
      {expanded ? (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_title')}</label>
            <div className="text-sm text-text">{scene.title}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_location')}</label>
            <div className="text-sm text-text">{scene.location ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_story_time')}</label>
            <div className="text-sm text-text">{scene.story_time_raw ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_event_type')}</label>
            <div className="text-sm text-text">{scene.event_type ?? 'SCENE'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_emotional_beat')}</label>
            <div className="text-sm text-text italic">{scene.emotional_beat ?? '—'}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_characters')}</label>
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
              <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_summary')}</label>
              <div className="text-sm text-text">{scene.summary}</div>
            </div>
          ) : null}
          {scene.notes ? (
            <div className="col-span-full">
              <label className="text-xs font-medium text-text-muted block mb-1">{t('scenes.metadata_notes')}</label>
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
  const { t } = useTranslation()
  const [expandedChar, setExpandedChar] = useState<string | null>(null)
  const portraits = useCharacterPortraits()

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
      <div className="text-xs text-text-muted p-3">{t('scenes.no_characters')}</div>
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
            <Avatar fileId={portraits.get(c.name.toLowerCase())} name={c.name} className="w-7 h-7" textClassName="text-xs font-medium" />
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
                  <span className="text-xs font-medium text-primary">{t('scenes.char_personality')}: </span>
                  <span className="text-xs text-text-muted">{c.doc.personality}</span>
                </div>
              ) : null}
              {c.doc.goals ? (
                <div>
                  <span className="text-xs font-medium text-primary">{t('scenes.char_goals')}: </span>
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

// Autosave timing (see the saving section in SceneEditor).
const AUTOSAVE_IDLE_MS = 45_000
const AUTOSAVE_MAX_MS = 5 * 60_000

type ContextTab = 'characters' | 'location' | 'threads' | 'rules' | 'notes' | 'media' | 'validate' | 'analysis'

/** One run of a library prompt against the open scene. */
interface AnalysisState {
  promptName: string
  startedAt: number
  status: 'running' | 'done' | 'error'
  text?: string
}

function AnalysisPanel({ analysis }: { analysis: AnalysisState | null }) {
  const { t } = useTranslation()
  if (!analysis) {
    return <p className="text-sm text-text-muted">{t('scenes.analysis_hint')}</p>
  }
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-text-light uppercase tracking-wide">{analysis.promptName}</div>
      {analysis.status === 'running' ? (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('scenes.analysing')}
        </div>
      ) : analysis.status === 'error' ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{analysis.text}</div>
      ) : (
        <div className="text-sm text-text whitespace-pre-wrap leading-relaxed">{analysis.text}</div>
      )}
    </div>
  )
}

function ContextPanel({
  sceneId,
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
  analysis,
}: {
  sceneId: string
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
  analysis: AnalysisState | null
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ContextTab>('characters')

  // Starting an analysis brings its tab to the front.
  useEffect(() => {
    if (analysis) setTab('analysis')
  }, [analysis?.startedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Find location doc matching scene.location
  const locationDoc = useMemo(
    () => locationDocs.find((l) => l.data.name.toLowerCase() === (scene.location ?? '').toLowerCase()),
    [locationDocs, scene.location]
  )

  // Find threads matching scene.plot_threads
  const activeThreads = useMemo(
    () =>
      threadDocs.filter((item) =>
        scene.plot_threads?.some(
          (pt) => String(pt).toLowerCase() === item.data.title.toLowerCase()
        )
      ),
    [threadDocs, scene.plot_threads]
  )

  const { attachments } = useAttachments(sceneId)

  const validationActionCount = validationResults
    ? validationResults.filter(r => r.state === 'detected' || r.state === 'missing').length
    : undefined

  const tabs: Array<{ key: ContextTab; labelKey: string; icon: typeof Users; count?: number; highlight?: boolean }> = [
    { key: 'characters', labelKey: 'scenes.panel_characters', icon: Users, count: scene.characters?.length ?? 0 },
    { key: 'location', labelKey: 'scenes.panel_location', icon: MapPin },
    { key: 'threads', labelKey: 'scenes.panel_threads', icon: GitBranch, count: activeThreads.length },
    { key: 'rules', labelKey: 'scenes.panel_rules', icon: Globe, count: ruleDocs.length },
    { key: 'notes', labelKey: 'scenes.panel_notes', icon: StickyNote, count: noteDocs.length },
    { key: 'media', labelKey: 'scenes.panel_media', icon: ImageIcon, count: attachments.length },
    { key: 'validate', labelKey: 'scenes.panel_validate', icon: ShieldCheck, count: validationActionCount, highlight: (validationActionCount ?? 0) > 0 },
    { key: 'analysis', labelKey: 'scenes.panel_analysis', icon: Sparkles },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white px-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition-colors border-b-2 ${
              tab === tb.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
            title={t(tb.labelKey)}
          >
            <tb.icon className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t(tb.labelKey)}</span>
            {tb.count != null && tb.count > 0 ? (
              <span className={`ml-0.5 text-[10px] ${tb.highlight ? 'text-amber-600 font-bold' : 'opacity-60'}`}>{tb.count}</span>
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
                    <span className="text-xs font-medium text-primary">{t('scenes.loc_atmosphere')}: </span>
                    <span className="text-xs text-text-muted">{locationDoc.data.atmosphere}</span>
                  </div>
                ) : null}
                {locationDoc.data.rules ? (
                  <div>
                    <span className="text-xs font-medium text-primary">{t('scenes.loc_rules')}: </span>
                    <span className="text-xs text-text-muted">{locationDoc.data.rules}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-xs text-text-muted">
                {scene.location ? t('scenes.no_location_doc', { name: scene.location }) : t('scenes.no_location_set')}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'threads' ? (
          <div className="p-3 space-y-2">
            {activeThreads.length > 0 ? (
              activeThreads.map((item) => (
                <div key={item.document_id} className="bg-surface rounded p-2 break-words">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{item.data.title}</span>
                    {item.data.status ? (
                      <StatusBadge
                        label={item.data.status}
                        colorClass={
                          item.data.status === 'OPEN'
                            ? 'bg-blue-100 text-blue-800'
                            : item.data.status === 'DEVELOPING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                        }
                      />
                    ) : null}
                  </div>
                  {item.data.description ? (
                    <p className="text-xs text-text-muted mt-1">{item.data.description}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted">{t('scenes.no_threads')}</div>
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
              <div className="text-xs text-text-muted">{t('scenes.no_rules')}</div>
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
              <div className="text-xs text-text-muted">{t('scenes.no_notes')}</div>
            )}
          </div>
        ) : null}

        {tab === 'media' ? (
          <div className="p-2">
            <MediaSection entityId={sceneId} kind="scene" compact />
          </div>
        ) : null}
        {tab === 'analysis' ? <AnalysisPanel analysis={analysis} /> : null}
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
  const { t } = useTranslation()

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
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide">{t('scenes.previous')}</div>
          {prevScene ? (
            <>
              <div className="text-xs font-medium text-text truncate">{prevScene.title}</div>
              {prevScene.summary ? (
                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{prevScene.summary}</div>
              ) : null}
            </>
          ) : (
            <div className="text-xs text-text-light">{t('scenes.start_of_chapter')}</div>
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
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide">{t('scenes.next')}</div>
          {nextScene ? (
            <>
              <div className="text-xs font-medium text-text truncate">{nextScene.title}</div>
              {nextScene.summary ? (
                <div className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{nextScene.summary}</div>
              ) : null}
            </>
          ) : (
            <div className="text-xs text-text-light">{t('scenes.end_of_chapter')}</div>
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
  const { t } = useTranslation()

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
            {t('scenes.chapter_label', { number: chapterNum ?? '?' })}
          </h2>
          <p className="text-sm text-text-muted mt-1">{t('scenes.flow_subtitle')}</p>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
          {t('scenes.exit_flow')}
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
                {scene.prose ?? scene.summary ?? t('common.no_prose')}
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
        <p className="text-text-muted text-center py-12">{t('scenes.no_scenes_in_chapter')}</p>
      ) : null}
    </div>
  )
}

// ── Validation Results Panel ─────────────────────────────

const STATE_CONFIG: Record<AnnotationResult['state'], { icon: typeof Check; labelKey: string; color: string; bgColor: string }> = {
  confirmed: { icon: Check, labelKey: 'scenes.state_confirmed', color: 'text-green-600', bgColor: 'bg-green-50' },
  missing: { icon: AlertTriangle, labelKey: 'scenes.state_missing', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  detected: { icon: Eye, labelKey: 'scenes.state_detected', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  suppressed: { icon: EyeOff, labelKey: 'scenes.state_suppressed', color: 'text-gray-400', bgColor: 'bg-gray-50' },
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  character: 'scenes.category_character',
  location: 'scenes.category_location',
  plot_thread: 'scenes.category_plot_thread',
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
  const { t } = useTranslation()

  if (results.length === 0) {
    return (
      <div className="text-xs text-text-muted p-3 text-center py-8">
        {t('scenes.validation_empty')}
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
        <span>{t('scenes.validation_confirmed', { count: results.filter(r => r.state === 'confirmed').length })}</span>
        <span className="text-gray-300">|</span>
        <span className={actionable.length > 0 ? 'text-amber-600 font-medium' : ''}>{t('scenes.validation_attention', { count: actionable.length })}</span>
      </div>

      {(['character', 'location', 'plot_thread'] as const).map(cat => {
        const items = grouped.get(cat)
        if (!items || items.length === 0) return null

        return (
          <div key={cat}>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
              {t(CATEGORY_LABEL_KEYS[cat] ?? cat)}
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
                          title={t('scenes.action_add')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDismiss(r)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                          title={t('scenes.action_dismiss')}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {r.state === 'missing' && (
                      <button
                        onClick={() => onRemove(r)}
                        className="text-amber-600 hover:text-red-600 p-0.5 flex-shrink-0"
                        title={t('scenes.action_remove')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {r.state === 'suppressed' && (
                      <button
                        onClick={() => onUnsuppress(r)}
                        className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0"
                        title={t('scenes.action_restore')}
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
  const { t } = useTranslation()
  const [mode, setMode] = useState<EditorMode>('full')
  const [metadataExpanded, setMetadataExpanded] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const { width: panelWidth, onPointerDown: startPanelResize, reset: resetPanelWidth } =
    useResizableWidth('aa-scene-panel-width', 320, 240, 640)
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
  // Only real unsaved changes get a backup — writing one for an unchanged
  // scene left a "draft" identical to the saved text that nothing ever
  // removed, so the unsaved-draft reminder showed it forever.
  const flushDraft = useCallback(() => {
    if (!editor) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (isDirtyRef.current && editor.getText().trim()) {
      writeDraft(editor.getHTML())
    }
  }, [editor, writeDraft])

  // ── Saving: autosave + explicit Save ─────────────────────
  // Prose is saved as a merge PATCH of `prose` only, so a save never touches
  // the scene's other fields. Autosave runs after AUTOSAVE_IDLE_MS without
  // typing, at most every AUTOSAVE_MAX_MS while typing non-stop, when the
  // scene is left and when the tab is hidden; Save and Cmd/Ctrl+S save at
  // once. The localStorage draft is only a crash backup between saves — it
  // outlives a save only when the save failed.
  const saveClient = useWipClient()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtySinceRef = useRef<number | null>(null)

  const saveProse = useCallback(async () => {
    if (!editor || editor.isDestroyed || !isDirtyRef.current || savingRef.current) return
    const prose = editor.getHTML()
    savingRef.current = true
    setSaving(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    try {
      await saveClient.documents.updateDocument(sceneId, { prose })
      baselineHtmlRef.current = prose
      // Typing may have continued while the save was in flight.
      const stillDirty = !editor.isDestroyed && editor.getHTML() !== prose
      isDirtyRef.current = stillDirty
      setIsDirty(stillDirty)
      dirtySinceRef.current = stillDirty ? Date.now() : null
      setLastSaved(new Date())
      setSaveError(null)
      if (!stillDirty) {
        localStorage.removeItem(draftKey)
        notifyDraftChange()
      }
      queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [editor, saveClient, sceneId, draftKey, queryClient])

  // When the saved prose changes from outside the editor (an undo of a
  // merge, another tab) and the writer has no unsaved edits, show it —
  // otherwise the next keystroke would autosave the stale text back.
  useEffect(() => {
    if (!editor || editor.isDestroyed || isDirtyRef.current || savingRef.current) return
    const saved = sceneData?.prose ?? ''
    if (saved !== baselineHtmlRef.current && saved !== editor.getHTML()) {
      editor.commands.setContent(saved, { emitUpdate: false })
      baselineHtmlRef.current = editor.getHTML()
    }
  }, [editor, sceneData?.prose])

  // Schedule autosave on every change.
  useEffect(() => {
    if (!editor) return
    const onUpdate = () => {
      if (!isDirtyRef.current) return
      if (dirtySinceRef.current == null) dirtySinceRef.current = Date.now()
      if (Date.now() - dirtySinceRef.current >= AUTOSAVE_MAX_MS) {
        saveProse()
        return
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => { saveProse() }, AUTOSAVE_IDLE_MS)
    }
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [editor, saveProse])

  // Save when the tab is hidden (switching apps, minimising — usually also
  // before the machine sleeps), and on Cmd/Ctrl+S instead of the browser's
  // "Save page" dialog.
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') saveProse() }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveProse()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('keydown', onKey)
    }
  }, [saveProse])

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
      // Leaving the scene with unsaved edits: keep the local backup and save
      // to WIP; the backup is removed once that save succeeds (a failed save
      // leaves it, and the draft reminder offers to resume).
      if (isDirtyRef.current && editor.getText().trim()) {
        const prose = editor.getHTML()
        writeDraft(prose)
        saveClient.documents.updateDocument(sceneId, { prose })
          .then(() => {
            localStorage.removeItem(draftKey)
            notifyDraftChange()
            queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })
          })
          .catch(() => { /* backup stays */ })
      }
    }
  }, [editor, draftKey, writeDraft, saveClient, sceneId, queryClient])

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

  const handleSave = useCallback(() => { saveProse() }, [saveProse])

  // What the Save button says: the save state, at a fixed width.
  const saveLabel = saving
    ? t('scenes.saving_prose')
    : saveError
      ? t('scenes.save_failed')
      : isDirty
        ? t('scenes.save')
        : lastSaved
          ? t('scenes.saved_at', { time: lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
          : t('scenes.saved')

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
  const wipClient = useWipClient()

  // ── Chapter assignment ──────────────────────────────────
  const structureEditor = useStructureEditor()
  const [moveError, setMoveError] = useState<string | null>(null)
  const chapterOptions = useMemo(() => {
    const placed = structure?.getChapterIds() ?? []
    const byId = new Map(chapters.map((c) => [c.document_id, c]))
    const opts = placed.map((id, i) => ({
      id,
      label: `${t('dashboard.ch_short', { number: i + 1 })}${byId.get(id)?.data.title ? `: ${byId.get(id)!.data.title}` : ''}`,
    }))
    chapters
      .filter((c) => !placed.includes(c.document_id))
      .forEach((c) => opts.push({ id: c.document_id, label: c.data.title || c.document_id }))
    return opts
  }, [structure, chapters, t])

  const [moveOpen, setMoveOpen] = useState(false)

  // Moves the scene into `chapterId`, before `beforeId` (null = at the end).
  const handleMove = useCallback(async (chapterId: string, beforeId: string | null) => {
    setMoveError(null)
    try {
      const placed = structure?.getChapterIds() ?? []
      const at = placed.indexOf(chapterId)
      const chapterLabel = at >= 0
        ? t('dashboard.ch_short', { number: at + 1 })
        : chapterOptions.find((o) => o.id === chapterId)?.label ?? ''
      await structureEditor.moveScene(sceneId, chapterId, beforeId,
        t('undo.moved', { scene: sceneData?.title ?? '', chapter: chapterLabel }))
      setMoveOpen(false)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : String(err))
    }
  }, [structureEditor, sceneId, chapterOptions, structure, sceneData?.title, t])

  // ── Analysis (prompt library) ───────────────────────────
  const { data: promptDocs } = useDocuments({
    template_id: TEMPLATES.PROMPT,
    status: 'active',
    page_size: 100,
    namespace: NAMESPACE,
  })
  const prompts = useMemo(
    () => (promptDocs?.items ?? [])
      .map((p) => p.data as unknown as PromptData)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [promptDocs],
  )
  const [analysisMenuOpen, setAnalysisMenuOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null)

  const handleAnalyse = useCallback(async (prompt: PromptData) => {
    if (!sceneData || !editor) return
    setAnalysisMenuOpen(false)
    setPanelCollapsed(false)
    const startedAt = Date.now()
    setAnalysis({ promptName: prompt.name, startedAt, status: 'running' })
    const inScene = (names: unknown[] | undefined) => new Set((names ?? []).map((n) => String(n).toLowerCase()))
    const sceneChars = inScene(sceneData.characters)
    const sceneThreads = inScene(sceneData.plot_threads)
    const user = buildUserMessage(prompt, {
      scene: sceneData as unknown as Record<string, unknown>,
      proseText: editor.getText({ blockSeparator: '\n\n' }),
      characters: characterDocs.filter((c) => sceneChars.has(c.data.name.toLowerCase())).map((c) => c.data as unknown as Record<string, unknown>),
      location: locationDocs.find((l) => l.data.name.toLowerCase() === (sceneData.location ?? '').toLowerCase())?.data as unknown as Record<string, unknown> | undefined,
      plotThreads: threadDocs.filter((th) => sceneThreads.has(th.data.title.toLowerCase())).map((th) => th.data as unknown as Record<string, unknown>),
      worldRules: ruleDocs.map((r) => r.data as unknown as Record<string, unknown>),
      chapter: chapter?.data as unknown as Record<string, unknown> | undefined,
      prevScene: prevScene?.data as unknown as Record<string, unknown> | undefined,
      nextScene: nextScene?.data as unknown as Record<string, unknown> | undefined,
    })
    // Ignore a result that arrives after a newer run was started.
    const finish = (next: Pick<AnalysisState, 'status' | 'text'>) =>
      setAnalysis((cur) => (cur?.startedAt === startedAt ? { ...cur, ...next } : cur))
    try {
      finish({ status: 'done', text: await runAnalysis(prompt.system_prompt, user) })
    } catch (err) {
      finish({ status: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }, [sceneData, editor, characterDocs, locationDocs, threadDocs, ruleDocs, chapter, prevScene, nextScene])

  // A finished analysis belongs to the scene it was run on.
  useEffect(() => { setAnalysis(null) }, [sceneId])

  /** `base`, or `base` with " 2", " 3", … inserted before the closing
   *  parenthesis — the first title no scene in WIP has. Asks WIP rather
   *  than the loaded scene list, which is paged and may be stale. */
  const uniqueSceneTitle = useCallback(async (base: string) => {
    for (let n = 1; n < 100; n++) {
      const candidate = n === 1 ? base : base.replace(/\)$/, ` ${n})`)
      const found = await wipClient.documents.queryDocuments(
        {
          template_id: TEMPLATES.EVENT,
          filters: [{ field: 'data.title', operator: 'eq', value: candidate }],
          page_size: 1,
        },
        NAMESPACE,
      )
      if (!found.total) return candidate
    }
    throw new Error(`No free title found for "${base}".`)
  }, [wipClient])

  // ── Merge with the previous / next scene ────────────────
  const undoStack = useStructureUndo()
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  /**
   * Text is joined in reading order (earlier + later); the scene whose
   * title and details are kept survives, the other is taken out of the
   * structure and soft-deleted. Order of writes, safest first: kept scene
   * (now holds both texts), delete the other, then the structure — a
   * failure part-way can duplicate text but never lose it. Autosave is held
   * off for the duration, as in split.
   */
  const handleMerge = useCallback(async (otherId: string, otherIsNext: boolean, keepEarlier: boolean) => {
    const other = eventMap.get(otherId)
    if (!editor || !sceneData || !other) return
    setMergeError(null)
    setMerging(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    savingRef.current = true
    try {
      const cur = { id: sceneId, data: { ...sceneData, prose: editor.getHTML() } as EventData }
      const oth = { id: otherId, data: other.data }
      const [earlier, later] = otherIsNext ? [cur, oth] : [oth, cur]
      const kept = keepEarlier ? earlier : later
      const removed = keepEarlier ? later : earlier
      const union = (a?: unknown[], b?: unknown[]) => [...new Set([...(a ?? []), ...(b ?? [])].map(String))]
      const merged = {
        prose: (earlier.data.prose ?? '') + (later.data.prose ?? ''),
        characters: union(earlier.data.characters, later.data.characters),
        plot_threads: union(earlier.data.plot_threads, later.data.plot_threads),
        summary: [earlier.data.summary, later.data.summary].filter(Boolean).join(' '),
      }
      const keptBefore = {
        prose: kept.data.prose ?? '',
        characters: kept.data.characters ?? [],
        plot_threads: kept.data.plot_threads ?? [],
        summary: kept.data.summary ?? '',
      }
      const keptResult = await saveClient.documents.updateDocument(kept.id, merged)
      await saveClient.documents.deleteDocument(removed.id)
      const order = await structureEditor.removeScene(removed.id)
      if (order.documentId && order.version != null && keptResult.version != null) {
        undoStack?.record({
          label: t('undo.merged', { a: earlier.data.title, b: later.data.title }),
          documentId: order.documentId,
          previous: order.previous,
          version: order.version,
          merge: {
            templateId: TEMPLATES.EVENT,
            namespace: NAMESPACE,
            removed: { data: removed.data as unknown as Record<string, unknown> },
            kept: { id: kept.id, fields: keptBefore, version: keptResult.version },
          },
        })
      }
      // Nothing in the open editor is unsaved any more.
      if (kept.id === sceneId) {
        editor.commands.setContent(merged.prose, { emitUpdate: false })
        baselineHtmlRef.current = editor.getHTML()
      }
      isDirtyRef.current = false
      setIsDirty(false)
      dirtySinceRef.current = null
      localStorage.removeItem(draftKey)
      notifyDraftChange()
      await queryClient.invalidateQueries()
      setMergeOpen(false)
      if (kept.id !== sceneId) onNavigate(kept.id)
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : String(err))
    } finally {
      savingRef.current = false
      setMerging(false)
    }
  }, [editor, sceneData, sceneId, eventMap, saveClient, structureEditor, undoStack, draftKey, queryClient, onNavigate, t])

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
    // The split writes both halves itself. Autosave must stay out of it: a
    // pending idle save, or the save-on-leave when we navigate to the new
    // scene, would otherwise write the editor's FULL text back over the
    // first half. Block it for the duration; restored if the split fails.
    const wasDirty = isDirtyRef.current
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    savingRef.current = true
    try {
      // The new scene goes into the book structure right after this one;
      // a scene missing from the structure would be created but never shown.
      const pos = structure.getScenePosition(sceneId)
      if (!pos) throw new Error('This scene is not in the book structure.')

      // AA_EVENT's identity is its title, so creating a scene under a title
      // that already exists UPDATES that scene instead — a second split of
      // the same scene used to overwrite the first "(continued)" scene's
      // prose. Pick a title no scene in WIP uses yet.
      const newTitle = await uniqueSceneTitle(`${sceneData.title} (continued)`)

      // 1. Create the new scene with the second half FIRST, so a failure
      //    further on can at worst duplicate text, never lose it.
      const created = await createDocument.mutateAsync({
        template_id: TEMPLATES.EVENT,
        namespace: NAMESPACE,
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
      })
      // Last-resort guard (e.g. an inactive scene with this title, or a
      // concurrent edit): the create matched an existing scene. Stop before
      // truncating the original; the overwritten text is in that scene's
      // version history.
      if (!created.is_new || !created.document_id) {
        throw new Error(`A scene titled "${newTitle}" already existed and was updated instead of created. The original scene was left unchanged.`)
      }
      const newSceneId = created.document_id

      // 2. Save the first half to the current scene (prose only), and make
      //    the editor hold exactly that, so nothing counts as unsaved.
      await saveClient.documents.updateDocument(sceneId, { prose: firstHtml })
      editor.commands.setContent(firstHtml, { emitUpdate: false })
      baselineHtmlRef.current = editor.getHTML()
      isDirtyRef.current = false
      setIsDirty(false)
      dirtySinceRef.current = null

      // 3. Update book structure — insert new scene after current scene
      const newChapters = structure.raw.chapters.map((slot, ci) => {
        if (ci !== pos.chapterIndex) return slot
        const newSceneIds = [...slot.scene_ids]
        newSceneIds.splice(pos.sceneIndex + 1, 0, newSceneId)
        return { ...slot, scene_ids: newSceneIds }
      })
      await createDocument.mutateAsync({
        template_id: TEMPLATES.BOOK_STRUCTURE,
        namespace: NAMESPACE,
        data: { ...structure.raw, chapters: newChapters },
      })

      // 4. Invalidate cache so both scenes load fresh from WIP
      localStorage.removeItem(draftKey)
      notifyDraftChange()
      await queryClient.invalidateQueries()

      // Navigate to the new scene
      onNavigate(newSceneId)
    } catch (err: any) {
      // Unsaved edits stay unsaved (and get autosaved) if the split failed
      // before the first half was written.
      if (wasDirty && editor.getHTML() !== baselineHtmlRef.current) isDirtyRef.current = true
      alert(`Split failed: ${err.message || 'Unknown error'}`)
    } finally {
      savingRef.current = false
      setSplitting(false)
    }
  }, [editor, sceneData, structure, structureDocId, sceneId, createDocument, uniqueSceneTitle, draftKey, onNavigate, saveClient])

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
        namespace: NAMESPACE,
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
          {t('common.scenes')}
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
            <span className="text-xs">{t('common.words', { count: currentWordCount })}</span>
            <button
              onClick={handleSave}
              disabled={(!isDirty && !saveError) || saving}
              title={saveError ?? t('scenes.save_shortcut')}
              className={`flex items-center gap-1.5 text-sm transition-colors disabled:cursor-default ${saveError ? 'text-red-300' : 'hover:text-white disabled:opacity-60'}`}
            >
              <Save className="w-4 h-4" />
              {saveLabel}
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
          <span className="hidden sm:inline">{t('common.scenes')}</span>
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
          disabled={(!isDirty && !saveError) || saving}
          title={saveError ?? t('scenes.save_shortcut')}
          className={`flex items-center justify-center gap-1.5 min-w-28 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            saveError
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : isDirty
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-gray-100 text-text-muted cursor-default'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {saveLabel}
        </button>

        {/* Split */}
        <button
          onClick={handleSplit}
          disabled={splitting || !structure || !structureDocId}
          className="text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title={t('scenes.split')}
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* Merge with the previous / next scene */}
        <button
          onClick={() => { setMergeError(null); setMergeOpen(true) }}
          disabled={!prevScene && !nextScene}
          className="text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title={t('merge.button')}
        >
          <Merge className="w-3.5 h-3.5" />
        </button>

        {/* Move to another chapter / position */}
        <button
          onClick={() => setMoveOpen(true)}
          disabled={!chapterOptions.length}
          className="text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title={t('scenes.move_to_chapter')}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>

        {/* Validate */}
        <button
          onClick={handleValidate}
          disabled={termsLoading}
          className="relative text-text-muted hover:text-primary p-1 transition-colors disabled:opacity-30"
          title={t('scenes.validate_btn')}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {validationBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {validationBadgeCount}
            </span>
          )}
        </button>

        {/* Analyse — run a prompt from the library */}
        <div className="relative">
          <button
            onClick={() => setAnalysisMenuOpen((o) => !o)}
            className="text-text-muted hover:text-primary p-1 transition-colors"
            title={t('scenes.analyse_btn')}
          >
            {analysis?.status === 'running'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
          </button>
          {analysisMenuOpen && (
            <div className="absolute left-0 top-full mt-1 z-30 w-56 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
              {prompts.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleAnalyse(p)}
                  className="block w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface"
                  title={p.description}
                >
                  {p.name}
                </button>
              ))}
              {!prompts.length && (
                <p className="px-3 py-1.5 text-xs text-text-muted">{t('scenes.no_prompts')}</p>
              )}
              <Link
                to="/prompts"
                className="block border-t border-gray-100 mt-1 px-3 py-1.5 text-xs text-primary hover:bg-surface"
              >
                {t('scenes.manage_prompts')}
              </Link>
            </div>
          )}
        </div>

        {/* Delete */}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-red-600">{t('scenes.delete_scene_title')}</span>
            <button
              onClick={handleDelete}
              disabled={deleteDocument.isPending}
              className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteDocument.isPending ? '...' : t('common.yes')}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs font-medium bg-gray-100 text-text-muted rounded hover:bg-gray-200 transition-colors"
            >
              {t('common.no')}
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-text-muted hover:text-red-600 p-1 transition-colors"
            title={t('scenes.delete_scene_title')}
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
            {t('scenes.composition_mode')}
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
        sceneNumber={sceneNumber}
        chapterLabel={scenePosition ? chapterOptions.find((o) => o.id === scenePosition.chapterId)?.label : undefined}
        hasChapters={chapterOptions.length > 0}
        onOpenMove={() => setMoveOpen(true)}
        moveError={moveError}
        expanded={metadataExpanded}
        onToggle={() => setMetadataExpanded(!metadataExpanded)}
      />
      {mergeOpen && (
        <MergeSceneDialog
          current={{ title: sceneData.title, words: currentWordCount }}
          prev={prevScene ? { id: prevScene.document_id, title: prevScene.data.title, words: wordCount((prevScene.data.prose ?? '').replace(/<[^>]+>/g, ' ')) } : undefined}
          next={nextScene ? { id: nextScene.document_id, title: nextScene.data.title, words: wordCount((nextScene.data.prose ?? '').replace(/<[^>]+>/g, ' ')) } : undefined}
          saving={merging}
          error={mergeError}
          onMerge={handleMerge}
          onClose={() => setMergeOpen(false)}
        />
      )}
      {moveOpen && (
        <MoveSceneDialog
          sceneId={sceneId}
          sceneTitle={sceneData.title}
          chapters={chapterOptions}
          currentChapterId={scenePosition?.chapterId}
          scenesInChapter={(id) => structure?.getScenesForChapter(id) ?? []}
          titleOf={(id) => eventMap.get(id)?.data.title ?? id}
          saving={structureEditor.isSaving}
          onMove={handleMove}
          onClose={() => setMoveOpen(false)}
        />
      )}

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
            <span>{t('common.words', { count: currentWordCount })}</span>
            <span>
              {t('dashboard.ch_short', { number: chapterNumber ?? '?' })} · Scene {sceneNumber ?? '?'}
            </span>
          </div>
        </div>

        {/* Context panel (right) — drag its left edge to resize */}
        {!panelCollapsed ? (
          <div
            className="relative border-l border-gray-200 bg-white flex-shrink-0 hidden md:flex flex-col"
            style={{ width: panelWidth }}
          >
            <div
              onPointerDown={startPanelResize}
              onDoubleClick={resetPanelWidth}
              title={t('scenes.resize_panel')}
              className="absolute inset-y-0 -left-1 w-2 cursor-col-resize z-10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
            />
            <ContextPanel
              sceneId={sceneId}
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
              analysis={analysis}
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
  const { t } = useTranslation()
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
      (threadDocsRaw?.items ?? []).map((item) => ({
        document_id: item.document_id,
        data: item.data as unknown as PlotThreadData,
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
        <div className="text-text-muted">{t('scenes.loading')}</div>
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
