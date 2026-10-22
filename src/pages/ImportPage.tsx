import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateDocument, useDocuments, useWipClient } from '@wip/react'
import { useBookTerms } from '../lib/useBookTerms'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  BookOpen,
  Users,
  MapPin,
  GitBranch,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertTriangle,
  X,
  FileText,
  Merge,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES } from '../lib/constants'
import { clearAllDrafts } from '../components/UnsavedDraftBanner'
import BackLink from '../components/BackLink'
import { PROJECT_TIME_SYSTEM_DEFAULT, TermSelect } from '../components/CreateEntityModal'
import { titleFromFileName } from '../lib/titles'

const toTermValue = (text: string): string =>
  text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')

// Alias list for a registry term: the entity's own display name (when it
// differs from the term value) plus each merged-away name in BOTH display and
// term-value form — so a reference using either ("Sunny" or "SUNNY") resolves
// to this term instead of stranding the import.
const buildTermAliases = (name: string, tv: string, extra?: string[]): string[] => {
  const out = new Set<string>()
  if (name !== tv) out.add(name)
  for (const a of extra || []) {
    if (a && a !== tv) out.add(a)
    const at = toTermValue(a)
    if (at && at !== tv) out.add(at)
  }
  return [...out]
}

// Union of absorbed display names + their prior aliases, excluding the
// canonical name (case-insensitive) — what a merge carries onto the survivor.
const collectMergeAliases = (names: string[], canonical: string): string[] =>
  [...new Set(names)].filter(n => n.toLowerCase() !== canonical.toLowerCase())

const BASE_PATH = import.meta.env.BASE_URL || '/'

// ── Types ────────────────────────────────────────────────

interface ParsedScene {
  sceneOrder: number
  title: string
  prose: string
  included: boolean
}

// Mirrors server/import.ts. `key` is the position in the manuscript: chapter
// numbers can repeat (a Part Two starting again at 1), so results are keyed by it.
type ChapterKind = 'chapter' | 'prologue' | 'interlude' | 'epilogue' | 'front'

interface ParsedChapter {
  key: number
  /** null: a prologue, interlude, epilogue or front matter (no chapter number). */
  number: number | null
  kind: ChapterKind
  title: string
  scenes: ParsedScene[]
  included: boolean
}

const EVENT_TYPE_OF: Partial<Record<ChapterKind, string>> = { prologue: 'PROLOGUE', interlude: 'INTERLUDE', epilogue: 'EPILOGUE' }

interface ExtractedCharacter {
  name: string
  role: string
  description: string
  /** Names absorbed via merge — written as term aliases so references resolve. */
  aliases?: string[]
}

interface ExtractedLocation {
  name: string
  type: string
  atmosphere: string
  aliases?: string[]
}

interface ExtractedPlotThread {
  title: string
  description: string
  aliases?: string[]
}

type Step = 'upload' | 'structure' | 'entities' | 'confirm' | 'importing' | 'done'

/** The book's details, saved as its AA_PROJECT document. */
interface BookDetails {
  title: string
  author: string
  /** AA_GENRE term value, '' for none. */
  genre: string
}

// ── Step 1: Upload ───────────────────────────────────────

function UploadStep({
  onParsed,
}: {
  onParsed: (chapters: ParsedChapter[], rawText: string, suggestedTitle: string) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_PATH}api/import/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const chapters: ParsedChapter[] = data.chapters.map((ch: any) => ({
        ...ch,
        // Front matter (a title page, usually) is shown but left out unless ticked.
        included: ch.kind !== 'front',
        scenes: ch.scenes.map((s: any) => ({ ...s, included: ch.kind !== 'front' })),
      }))
      onParsed(chapters, text, titleFromFileName(fileName))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setText(content)
    setFileName(file.name)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text mb-2">
          {t('import.paste_label')}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder={"Chapter 1: The Beginning\n\nIt was a dark and stormy night...\n\n***\n\nThe next morning dawned clear and bright.\n\nChapter 2: The Journey\n\n..."}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:text-primary-dark cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {t('import.upload_txt')}
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            {wordCount > 0 ? (
              <span className="text-xs text-text-muted">{t('common.words', { count: wordCount })}</span>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <button
        onClick={handleParse}
        disabled={!text.trim() || loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
        {loading ? t('import.parsing') : t('import.parse_structure')}
      </button>
    </div>
  )
}

// ── Step 2: Structure Review ─────────────────────────────

function StructureStep({
  chapters,
  setChapters,
  onBack,
  onNext,
}: {
  chapters: ParsedChapter[]
  setChapters: (ch: ParsedChapter[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const [expandedChapter, setExpandedChapter] = useState<number | null>(0)

  const toggleChapter = (idx: number) => {
    const updated = [...chapters]
    updated[idx] = { ...updated[idx]!, included: !updated[idx]!.included }
    setChapters(updated)
  }

  const toggleScene = (chIdx: number, sIdx: number) => {
    const updated = [...chapters]
    const scenes = [...updated[chIdx]!.scenes]
    scenes[sIdx] = { ...scenes[sIdx]!, included: !scenes[sIdx]!.included }
    updated[chIdx] = { ...updated[chIdx]!, scenes }
    setChapters(updated)
  }

  const updateChapterTitle = (idx: number, title: string) => {
    const updated = [...chapters]
    updated[idx] = { ...updated[idx]!, title }
    setChapters(updated)
  }

  const updateSceneTitle = (chIdx: number, sIdx: number, title: string) => {
    const updated = [...chapters]
    const scenes = [...updated[chIdx]!.scenes]
    scenes[sIdx] = { ...scenes[sIdx]!, title }
    updated[chIdx] = { ...updated[chIdx]!, scenes }
    setChapters(updated)
  }

  const totalScenes = chapters.reduce((sum, ch) => sum + ch.scenes.filter(s => s.included).length, 0)
  const totalChapters = chapters.filter(ch => ch.included).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted" dangerouslySetInnerHTML={{ __html: t('import.detected_summary', { chapters: totalChapters, scenes: totalScenes }) }} />
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {chapters.map((ch, chIdx) => (
          <div
            key={chIdx}
            className={`border rounded-lg overflow-hidden ${ch.included ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
              <input
                type="checkbox"
                checked={ch.included}
                onChange={() => toggleChapter(chIdx)}
                aria-label={ch.title}
                className="rounded border-gray-300"
              />
              <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-text-muted w-16 flex-shrink-0">{ch.number != null ? t('dashboard.ch_short', { number: ch.number }) : t(`import.kind_${ch.kind}`)}</span>
              <input
                type="text"
                value={ch.title}
                onChange={(e) => updateChapterTitle(chIdx, e.target.value)}
                className="flex-1 text-sm font-medium text-text bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1 py-0.5"
              />
              <button
                onClick={() => setExpandedChapter(expandedChapter === chIdx ? null : chIdx)}
                className="text-xs text-text-muted hover:text-primary"
              >
                {t('common.scene_count', { count: ch.scenes.length })}
              </button>
            </div>

            {expandedChapter === chIdx ? (
              <div className="border-t border-gray-100 bg-surface/50">
                {ch.scenes.map((scene, sIdx) => (
                  <div
                    key={sIdx}
                    className={`flex items-center gap-3 px-4 py-2 pl-12 ${scene.included ? '' : 'opacity-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={scene.included}
                      onChange={() => toggleScene(chIdx, sIdx)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-text-muted w-6">{scene.sceneOrder}</span>
                    <input
                      type="text"
                      value={scene.title}
                      onChange={(e) => updateSceneTitle(chIdx, sIdx, e.target.value)}
                      className="flex-1 text-sm text-text bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1 py-0.5"
                    />
                    <span className="text-xs text-text-muted">
                      {t('common.words', { count: scene.prose.split(/\s+/).length })}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <button
          onClick={onNext}
          disabled={totalChapters === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
          {t('import.extract_entities')}
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Entity Review ────────────────────────────────

type TabKey = 'characters' | 'locations' | 'threads'

function EntitiesStep({
  characters,
  locations,
  plotThreads,
  setCharacters,
  setLocations,
  setPlotThreads,
  onReset,
  extracting,
  extractProgress,
  extractTotal,
  onBack,
  onNext,
}: {
  characters: ExtractedCharacter[]
  locations: ExtractedLocation[]
  plotThreads: ExtractedPlotThread[]
  setCharacters: (c: ExtractedCharacter[]) => void
  setLocations: (l: ExtractedLocation[]) => void
  setPlotThreads: (p: ExtractedPlotThread[]) => void
  onReset: () => void
  extracting: boolean
  extractProgress: number
  extractTotal: number
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const { data: roleTerms } = useBookTerms(TERMINOLOGIES.CHARACTER_ROLE, { page_size: 50 })
  const { data: locationTypeTerms } = useBookTerms(TERMINOLOGIES.LOCATION_TYPE, { page_size: 50 })
  const roleValues = (roleTerms?.items || []).map(item => item.value)
  const locationTypeValues = (locationTypeTerms?.items || []).map(item => item.value)

  const [tab, setTab] = useState<TabKey>('characters')
  const [mergeSelection, setMergeSelection] = useState<Set<number>>(new Set())
  const [merging, setMerging] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleMergeSelect = (idx: number) => {
    setMergeSelection(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  const currentItems = tab === 'characters' ? characters : tab === 'locations' ? locations : plotThreads

  const selectAllMerge = () => {
    setMergeSelection(new Set(currentItems.map((_, i) => i)))
  }
  const deselectAllMerge = () => {
    setMergeSelection(new Set())
  }

  const startMerge = () => { setMerging(true); setMergeSelection(new Set()) }
  const cancelMerge = () => { setMerging(false); setMergeSelection(new Set()) }

  const handleMerge = () => {
    if (mergeSelection.size < 2) return
    const indices = Array.from(mergeSelection).sort((a, b) => a - b)

    if (tab === 'characters') {
      const selected = indices.map(i => characters[i]!)
      const bestRole = selected.map(c => c.role).sort((a, b) => roleValues.indexOf(a) - roleValues.indexOf(b))[0] || selected[0]!.role
      const canonicalName = [...selected].sort((a, b) => b.name.length - a.name.length)[0]!.name
      const descriptions = [...new Set(selected.map(c => c.description).filter(Boolean))]
      const aliases = collectMergeAliases(selected.flatMap(c => [c.name, ...(c.aliases || [])]), canonicalName)
      const merged: ExtractedCharacter = { name: canonicalName, role: bestRole, description: descriptions.join('. '), aliases }
      setCharacters([merged, ...characters.filter((_, i) => !mergeSelection.has(i))])
    } else if (tab === 'locations') {
      const selected = indices.map(i => locations[i]!)
      const canonicalName = [...selected].sort((a, b) => b.name.length - a.name.length)[0]!.name
      const atmospheres = [...new Set(selected.map(l => l.atmosphere).filter(Boolean))]
      const aliases = collectMergeAliases(selected.flatMap(l => [l.name, ...(l.aliases || [])]), canonicalName)
      const merged: ExtractedLocation = { name: canonicalName, type: selected[0]!.type, atmosphere: atmospheres.join('. '), aliases }
      setLocations([merged, ...locations.filter((_, i) => !mergeSelection.has(i))])
    } else if (tab === 'threads') {
      const selected = indices.map(i => plotThreads[i]!)
      const canonicalTitle = [...selected].sort((a, b) => b.title.length - a.title.length)[0]!.title
      const descriptions = [...new Set(selected.map(p => p.description).filter(Boolean))]
      const aliases = collectMergeAliases(selected.flatMap(p => [p.title, ...(p.aliases || [])]), canonicalTitle)
      const merged: ExtractedPlotThread = { title: canonicalTitle, description: descriptions.join('. '), aliases }
      setPlotThreads([merged, ...plotThreads.filter((_, i) => !mergeSelection.has(i))])
    }
    cancelMerge()
  }

  if (extracting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-text-muted">
          {t('import.analysing', { current: extractProgress, total: extractTotal })}
        </p>
        <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(extractProgress / extractTotal) * 100}%` }}
          />
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'characters' as const, label: t('nav.characters'), icon: Users, count: characters.length },
    { key: 'locations' as const, label: t('nav.locations'), icon: MapPin, count: locations.length },
    { key: 'threads' as const, label: t('nav.plot_threads'), icon: GitBranch, count: plotThreads.length },
  ]

  const removeCharacter = (idx: number) => {
    setCharacters(characters.filter((_, i) => i !== idx))
  }

  const removeLocation = (idx: number) => {
    setLocations(locations.filter((_, i) => i !== idx))
  }

  const removeThread = (idx: number) => {
    setPlotThreads(plotThreads.filter((_, i) => i !== idx))
  }

  const updateCharacter = (idx: number, field: string, value: string) => {
    const updated = [...characters]
    updated[idx] = { ...updated[idx]!, [field]: value }
    setCharacters(updated)
  }

  const updateLocation = (idx: number, field: string, value: string) => {
    const updated = [...locations]
    updated[idx] = { ...updated[idx]!, [field]: value }
    setLocations(updated)
  }

  const updateThread = (idx: number, field: string, value: string) => {
    const updated = [...plotThreads]
    updated[idx] = { ...updated[idx]!, [field]: value }
    setPlotThreads(updated)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {t('import.entity_instructions')}
      </p>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => { setTab(tb.key); cancelMerge() }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tb.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <tb.icon className="w-4 h-4" />
            {tb.label}
            <span className="text-xs opacity-60">({tb.count})</span>
          </button>
        ))}
      </div>

      {/* Toolbar: merge + reset */}
      <div className="flex items-center gap-2 flex-wrap">
        {merging ? (
          <>
            <span className="text-xs text-text-muted">{t('import.merge_selection', { count: mergeSelection.size })}</span>
            <button
              onClick={selectAllMerge}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary transition-colors"
            >
              <CheckSquare className="w-3 h-3" />
              {t('import.all_btn')}
            </button>
            <button
              onClick={deselectAllMerge}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary transition-colors"
            >
              <Square className="w-3 h-3" />
              {t('import.none_btn')}
            </button>
            <button
              onClick={handleMerge}
              disabled={mergeSelection.size < 2}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              <Merge className="w-3.5 h-3.5" />
              {t('import.merge_btn')} {mergeSelection.size > 1 ? `(${mergeSelection.size})` : ''}
            </button>
            <button onClick={cancelMerge} className="text-xs text-text-muted hover:text-text">
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <>
            {currentItems.length > 1 ? (
              <button
                onClick={startMerge}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Merge className="w-3.5 h-3.5" />
                {t('import.merge_aliases')}
              </button>
            ) : null}
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('common.reset')}
            </button>
          </>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {tab === 'characters' ? (
          characters.length > 0 ? characters.map((c, i) => {
            const key = `c-${i}`
            const isExpanded = expanded.has(key)
            const isMergeSel = merging && mergeSelection.has(i)
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 bg-white border rounded-lg transition-colors ${
                  isMergeSel ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200'
                } ${merging ? 'cursor-pointer' : ''}`}
                onClick={merging ? () => toggleMergeSelect(i) : undefined}
              >
                {merging && <input type="checkbox" checked={isMergeSel} onChange={() => toggleMergeSelect(i)}
                  onClick={(e) => e.stopPropagation()} className="rounded border-primary mt-1 accent-primary" />}
                <div className="flex-1 space-y-1.5" onClick={(e) => { if (!merging) { e.stopPropagation(); toggleExpand(key) } }}>
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    <input type="text" value={c.name} onChange={(e) => updateCharacter(i, 'name', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-text bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1" />
                    <select value={c.role} onChange={(e) => updateCharacter(i, 'role', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs border-0 rounded px-2 py-1 ${roleValues.length > 0 && !roleValues.includes(c.role) ? 'bg-red-50 text-red-700' : 'bg-surface text-text-muted'}`}>
                      {roleValues.length > 0 && !roleValues.includes(c.role) && (
                        <option value={c.role}>{`${c.role} ${t('common.invalid_suffix')}`}</option>
                      )}
                      {roleValues.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {isExpanded && (
                    <input type="text" value={c.description} onChange={(e) => updateCharacter(i, 'description', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs text-text-muted bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1 ml-5" />
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeCharacter(i) }} className="text-text-muted hover:text-red-500 p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          }) : <p className="text-sm text-text-muted py-4">{t('import.no_characters')}</p>
        ) : null}

        {tab === 'locations' ? (
          locations.length > 0 ? locations.map((l, i) => {
            const key = `l-${i}`
            const isExpanded = expanded.has(key)
            const isMergeSel = merging && mergeSelection.has(i)
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 bg-white border rounded-lg transition-colors ${
                  isMergeSel ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200'
                } ${merging ? 'cursor-pointer' : ''}`}
                onClick={merging ? () => toggleMergeSelect(i) : undefined}
              >
                {merging && <input type="checkbox" checked={isMergeSel} onChange={() => toggleMergeSelect(i)}
                  onClick={(e) => e.stopPropagation()} className="rounded border-primary mt-1 accent-primary" />}
                <div className="flex-1 space-y-1.5" onClick={(e) => { if (!merging) { e.stopPropagation(); toggleExpand(key) } }}>
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    <input type="text" value={l.name} onChange={(e) => updateLocation(i, 'name', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-text bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1" />
                    <select value={l.type} onChange={(e) => updateLocation(i, 'type', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-xs border-0 rounded px-2 py-1 ${locationTypeValues.length > 0 && !locationTypeValues.includes(l.type) ? 'bg-red-50 text-red-700' : 'bg-surface text-text-muted'}`}>
                      {locationTypeValues.length > 0 && !locationTypeValues.includes(l.type) && (
                        <option value={l.type}>{`${l.type} ${t('common.invalid_suffix')}`}</option>
                      )}
                      {locationTypeValues.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  {isExpanded && (
                    <input type="text" value={l.atmosphere} onChange={(e) => updateLocation(i, 'atmosphere', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs text-text-muted bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1 ml-5" />
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeLocation(i) }} className="text-text-muted hover:text-red-500 p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          }) : <p className="text-sm text-text-muted py-4">{t('import.no_locations')}</p>
        ) : null}

        {tab === 'threads' ? (
          plotThreads.length > 0 ? plotThreads.map((p, i) => {
            const key = `t-${i}`
            const isExpanded = expanded.has(key)
            const isMergeSel = merging && mergeSelection.has(i)
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 bg-white border rounded-lg transition-colors ${
                  isMergeSel ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200'
                } ${merging ? 'cursor-pointer' : ''}`}
                onClick={merging ? () => toggleMergeSelect(i) : undefined}
              >
                {merging && <input type="checkbox" checked={isMergeSel} onChange={() => toggleMergeSelect(i)}
                  onClick={(e) => e.stopPropagation()} className="rounded border-primary mt-1 accent-primary" />}
                <div className="flex-1 space-y-1.5" onClick={(e) => { if (!merging) { e.stopPropagation(); toggleExpand(key) } }}>
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    <input type="text" value={p.title} onChange={(e) => updateThread(i, 'title', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-text bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1" />
                  </div>
                  {isExpanded && (
                    <input type="text" value={p.description} onChange={(e) => updateThread(i, 'description', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs text-text-muted bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary focus:outline-none px-1 ml-5" />
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeThread(i) }} className="text-text-muted hover:text-red-500 p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          }) : <p className="text-sm text-text-muted py-4">{t('import.no_threads')}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Check className="w-4 h-4" />
          {t('import.review_import')}
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Confirm ──────────────────────────────────────

function ConfirmStep({
  chapters,
  characters,
  locations,
  plotThreads,
  book,
  setBook,
  existingProjectTitle,
  onBack,
  onImport,
}: {
  chapters: ParsedChapter[]
  characters: ExtractedCharacter[]
  locations: ExtractedLocation[]
  plotThreads: ExtractedPlotThread[]
  book: BookDetails
  setBook: (book: BookDetails) => void
  /** Title of the project the book already has; the import keeps it. */
  existingProjectTitle: string | undefined
  onBack: () => void
  onImport: () => void
}) {
  const { t } = useTranslation()
  const includedChapters = chapters.filter(ch => ch.included)
  const includedScenes = includedChapters.reduce((sum, ch) => sum + ch.scenes.filter(s => s.included).length, 0)

  const total = includedChapters.length + includedScenes + characters.length + locations.length + plotThreads.length

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted" dangerouslySetInnerHTML={{ __html: t('import.confirm_total', { total }) }} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <BookOpen className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-text">{includedChapters.length}</div>
          <div className="text-xs text-text-muted">{t('nav.chapters')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-text">{includedScenes}</div>
          <div className="text-xs text-text-muted">{t('common.scenes')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-text">{characters.length}</div>
          <div className="text-xs text-text-muted">{t('nav.characters')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-text">{locations.length}</div>
          <div className="text-xs text-text-muted">{t('nav.locations')}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <GitBranch className="w-6 h-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-text">{plotThreads.length}</div>
          <div className="text-xs text-text-muted">{t('nav.plot_threads')}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-text">{t('import.book_details_title')}</h2>
        {existingProjectTitle !== undefined ? (
          <p className="text-sm text-text-muted">{t('import.book_details_existing', { title: existingProjectTitle })}</p>
        ) : (
          <>
            <p className="text-sm text-text-muted">{t('import.book_details_hint')}</p>
            <div>
              <label htmlFor="import-book-title" className="block text-sm font-medium text-text mb-1">
                {t('entities.project.fields.title.label')} <span className="text-danger">*</span>
              </label>
              <input
                id="import-book-title"
                value={book.title}
                onChange={(e) => setBook({ ...book, title: e.target.value })}
                placeholder={t('entities.project.fields.title.placeholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="import-book-author" className="block text-sm font-medium text-text mb-1">
                  {t('entities.project.fields.author.label')}
                </label>
                <input
                  id="import-book-author"
                  value={book.author}
                  onChange={(e) => setBook({ ...book, author: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="import-book-genre" className="block text-sm font-medium text-text mb-1">
                  {t('entities.project.fields.genre.label')}
                </label>
                <TermSelect
                  id="import-book-genre"
                  terminologyId={TERMINOLOGIES.GENRE}
                  value={book.genre}
                  onChange={(genre) => setBook({ ...book, genre: String(genre) })}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          {t('import.confirm_warning')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <button
          onClick={onImport}
          disabled={existingProjectTitle === undefined && !book.title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          {t('import.create_import')}
        </button>
      </div>
    </div>
  )
}

// ── Page Root ────────────────────────────────────────────

export default function ImportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createDocument = useCreateDocument()
  const wipClient = useWipClient()

  const [step, setStep] = useState<Step>('upload')
  const [chapters, setChapters] = useState<ParsedChapter[]>([])
  const [_rawText, setRawText] = useState('')
  const [characters, setCharacters] = useState<ExtractedCharacter[]>([])
  const [locations, setLocations] = useState<ExtractedLocation[]>([])
  const [plotThreads, setPlotThreads] = useState<ExtractedPlotThread[]>([])
  // Snapshots of AI extraction results for Reset
  const [originalCharacters, setOriginalCharacters] = useState<ExtractedCharacter[]>([])
  const [originalLocations, setOriginalLocations] = useState<ExtractedLocation[]>([])
  const [originalPlotThreads, setOriginalPlotThreads] = useState<ExtractedPlotThread[]>([])
  const [chapterSummaries, setChapterSummaries] = useState<Map<number, string>>(new Map())
  const [chapterCharacters, setChapterCharacters] = useState<Map<number, string[]>>(new Map())
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const [extractTotal, setExtractTotal] = useState(0)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importError, setImportError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [resetting, setResetting] = useState(false)
  const [book, setBook] = useState<BookDetails>({ title: '', author: '', genre: '' })
  const queryClient = useQueryClient()

  // The book's project (title, author, genre, …). A reset keeps it, so a
  // re-import keeps it too; otherwise the import creates it.
  const { data: projects } = useDocuments({ template_id: TEMPLATES.PROJECT, status: 'active', namespace: NAMESPACE })
  const existingProject = projects?.items?.[0]
  const existingProjectTitle = existingProject
    ? String((existingProject.data as { title?: string }).title ?? '')
    : undefined

  // Freshness guard. Re-importing into a namespace that already holds a book
  // can't consolidate existing character terms — term creation is create-only,
  // so review-step merges silently fail to apply against terms that already
  // exist. Detect existing characters and require a reset before a fresh
  // import rather than letting the user hit that footgun.
  const { data: existingChars } = useBookTerms(TERMINOLOGIES.CHARACTERS, { page_size: 1 })
  const checkingFreshness = existingChars === undefined
  const hasExistingBook = (existingChars?.items?.length ?? 0) > 0

  const handleResetBook = useCallback(async () => {
    setResetting(true)
    try {
      const res = await fetch(`${BASE_PATH}api/book/reset`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templates: ['AA_CHAPTER', 'AA_EVENT', 'AA_CHARACTER', 'AA_LOCATION', 'AA_PLOT_THREAD', 'AA_NOTE', 'AA_WORLD_RULE', 'AA_BOOK_STRUCTURE'],
          clearNames: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'ok') {
        alert(t('import.reset_failed', { error: data.error || res.statusText }))
        return
      }
      await queryClient.invalidateQueries()
      await queryClient.refetchQueries()
    } catch (err: any) {
      alert(t('import.reset_failed', { error: err.message }))
    } finally {
      setResetting(false)
    }
  }, [queryClient, t])

  const handleParsed = (chs: ParsedChapter[], text: string, suggestedTitle: string) => {
    setChapters(chs)
    setRawText(text)
    setBook((b) => (b.title ? b : { ...b, title: suggestedTitle }))
    setStep('structure')
  }

  const handleExtract = useCallback(async () => {
    const included = chapters.filter(ch => ch.included)
    setExtractTotal(included.length)
    setExtractProgress(0)
    setExtracting(true)
    setStep('entities')

    const allCharacters: ExtractedCharacter[] = []
    const allLocations: ExtractedLocation[] = []
    const allThreads: ExtractedPlotThread[] = []
    const summaries = new Map<number, string>()
    const perChapterChars = new Map<number, string[]>()

    // Process chapters sequentially to avoid rate limits
    for (let i = 0; i < included.length; i++) {
      const ch = included[i]!
      const chapterText = ch.scenes.map(s => s.prose).join('\n\n***\n\n')
      setExtractProgress(i + 1)

      try {
        const res = await fetch(`${BASE_PATH}api/import/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chapterText, title: ch.title }),
        })
        const data = await res.json()
        if (res.ok) {
          // Deduplicate by name (case-insensitive)
          const chapterCharNames: string[] = []
          for (const c of data.characters || []) {
            chapterCharNames.push(toTermValue(c.name))
            if (!allCharacters.some(existing => existing.name.toLowerCase() === c.name.toLowerCase())) {
              allCharacters.push({ name: c.name, role: c.role, description: c.description })
            }
          }
          perChapterChars.set(ch.key, chapterCharNames)
          for (const l of data.locations || []) {
            if (!allLocations.some(existing => existing.name.toLowerCase() === l.name.toLowerCase())) {
              allLocations.push({ name: l.name, type: l.type, atmosphere: l.atmosphere })
            }
          }
          for (const p of data.plotThreads || []) {
            if (!allThreads.some(existing => existing.title.toLowerCase() === p.title.toLowerCase())) {
              allThreads.push({ title: p.title, description: p.description })
            }
          }
          if (data.summary) {
            summaries.set(ch.key, data.summary)
          }
        }
      } catch (err) {
        console.error(`Extract failed for "${ch.title}":`, err)
      }
    }

    setCharacters(allCharacters)
    setLocations(allLocations)
    setPlotThreads(allThreads)
    // Save snapshots for Reset
    setOriginalCharacters(allCharacters.map(c => ({ ...c })))
    setOriginalLocations(allLocations.map(l => ({ ...l })))
    setOriginalPlotThreads(allThreads.map(p => ({ ...p })))
    setChapterSummaries(summaries)
    setChapterCharacters(perChapterChars)
    setExtracting(false)
  }, [chapters])

  const handleImport = useCallback(async () => {
    setStep('importing')
    setImportError('')

    const includedChapters = chapters.filter(ch => ch.included)

    const createProject = existingProjectTitle === undefined
    const bookTitle = createProject ? book.title.trim() : existingProjectTitle

    // +1 for the book structure document created at the end, +1 for the project
    const includedSceneCount = includedChapters.reduce((sum, ch) => sum + ch.scenes.filter(s => s.included).length, 0)
    const total = includedChapters.length + includedSceneCount +
      characters.length + locations.length + plotThreads.length + 1 + (createProject ? 1 : 0)
    setImportTotal(total)
    setImportProgress(0)

    let created = 0

    const createOne = (templateId: string, data: Record<string, unknown>): Promise<string> => {
      return new Promise((resolve, reject) => {
        createDocument.mutate(
          { template_id: templateId, namespace: NAMESPACE, data },
          {
            onSuccess: (result) => {
              created++
              setImportProgress(created)
              // The book structure lists chapters and scenes by id: a create
              // without one must stop the import, not store `undefined` there.
              if (result.document_id) resolve(result.document_id)
              else reject(new Error(`${templateId}: created without a document id`))
            },
            onError: (err) => { created++; setImportProgress(created); reject(err) },
          }
        )
      })
    }

    try {
      // The project first: if it is refused, nothing else has been written yet.
      if (createProject) {
        await createOne(TEMPLATES.PROJECT, {
          title: bookTitle,
          time_system: PROJECT_TIME_SYSTEM_DEFAULT,
          ...(book.author.trim() ? { author: book.author.trim() } : {}),
          ...(book.genre ? { genre: book.genre } : {}),
        })
      }

      // Auto-create terms in index terminologies before creating documents
      for (const c of characters) {
        const tv = toTermValue(c.name)
        try { await wipClient.defStore.createTerm(TERMINOLOGIES.CHARACTERS, { value: tv, label: c.name, aliases: buildTermAliases(c.name, tv, c.aliases) }, { namespace: NAMESPACE }) } catch { /* may exist */ }
      }
      for (const l of locations) {
        const tv = toTermValue(l.name)
        try { await wipClient.defStore.createTerm(TERMINOLOGIES.LOCATIONS, { value: tv, label: l.name, aliases: buildTermAliases(l.name, tv, l.aliases) }, { namespace: NAMESPACE }) } catch { /* may exist */ }
      }
      for (const p of plotThreads) {
        const tv = toTermValue(p.title)
        try { await wipClient.defStore.createTerm(TERMINOLOGIES.PLOT_THREADS, { value: tv, label: p.title, aliases: buildTermAliases(p.title, tv, p.aliases) }, { namespace: NAMESPACE }) } catch { /* may exist */ }
      }

      // Character term values a scene tag may legitimately reference: each
      // created character's term value PLUS its merge aliases (in term-value
      // form). A merged-away character resolves via its alias and keeps its
      // scene tag; a genuinely deleted character (no alias anywhere) is dropped
      // rather than stranding the import on
      // "Value 'X' is not valid for terminology AA_CHARACTERS".
      const validCharTerms = new Set<string>()
      for (const c of characters) {
        validCharTerms.add(toTermValue(c.name))
        for (const a of c.aliases || []) validCharTerms.add(toTermValue(a))
      }

      // Create chapters and collect document IDs (ordered)
      const chapterDocIds: string[] = []
      for (const ch of includedChapters) {
        const docId = await createOne(TEMPLATES.CHAPTER, {
          title: ch.title,
          status: 'DRAFT',
          summary: chapterSummaries.get(ch.key) || '',
        })
        chapterDocIds.push(docId)
      }

      // Create scenes per chapter and collect document IDs (grouped by chapter)
      const chapterSceneIds: string[][] = []
      for (let ci = 0; ci < includedChapters.length; ci++) {
        const ch = includedChapters[ci]!
        const includedScenes = ch.scenes.filter(s => s.included)
        const sceneIds: string[] = []
        for (const scene of includedScenes) {
          const docId = await createOne(TEMPLATES.EVENT, {
            title: scene.title,
            event_type: EVENT_TYPE_OF[ch.kind] ?? 'SCENE',
            story_time_sort: (ci + 1) * 1000 + scene.sceneOrder,
            prose: scene.prose,
            summary: chapterSummaries.get(ch.key) || '',
            characters: (chapterCharacters.get(ch.key) || []).filter(tv => validCharTerms.has(tv)),
          })
          sceneIds.push(docId)
        }
        chapterSceneIds.push(sceneIds)
      }

      // Create the book structure document
      const structureChapters = chapterDocIds.map((chapterId, i) => ({
        chapter_id: chapterId,
        scene_ids: chapterSceneIds[i] || [],
        // Prologue, interlude, epilogue and front matter take no chapter number.
        ...(includedChapters[i]!.number == null ? { unnumbered: true } : {}),
      }))
      await createOne(TEMPLATES.BOOK_STRUCTURE, {
        book_title: bookTitle || 'Untitled',
        chapters: structureChapters,
      })

      // Create characters (use term values for name)
      for (const c of characters) {
        await createOne(TEMPLATES.CHARACTER, {
          name: c.name,
          role: c.role,
          description: c.description,
        })
      }

      // Create locations (use term values for name)
      for (const l of locations) {
        await createOne(TEMPLATES.LOCATION, {
          name: l.name,
          type: l.type,
          atmosphere: l.atmosphere,
        })
      }

      // Create plot threads (use term values for title)
      for (const p of plotThreads) {
        await createOne(TEMPLATES.PLOT_THREAD, {
          title: p.title,
          status: 'OPEN',
          description: p.description,
        })
      }

      setImportedCount(created)
      clearAllDrafts()
      setStep('done')
    } catch (err: any) {
      setImportError(err.message || 'Import failed')
      setImportedCount(created)
      setStep('done')
    }
  }, [chapters, characters, locations, plotThreads, chapterSummaries, chapterCharacters, createDocument, wipClient, book, existingProjectTitle])

  const handleResetEntities = useCallback(() => {
    setCharacters(originalCharacters.map(c => ({ ...c })))
    setLocations(originalLocations.map(l => ({ ...l })))
    setPlotThreads(originalPlotThreads.map(p => ({ ...p })))
  }, [originalCharacters, originalLocations, originalPlotThreads])

  const stepLabels: Array<{ key: Step; label: string }> = [
    { key: 'upload', label: t('import.step_upload') },
    { key: 'structure', label: t('import.step_structure') },
    { key: 'entities', label: t('import.step_entities') },
    { key: 'confirm', label: t('import.step_confirm') },
  ]

  const stepIndex = stepLabels.findIndex(s => s.key === step)

  return (
    <div className="p-6 max-w-3xl">
      <BackLink />
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('import.title')}</h1>
      </div>

      {/* Step indicator */}
      {step !== 'importing' && step !== 'done' ? (
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  i <= stepIndex
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-muted'
                }`}
              >
                {i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-sm ${i <= stepIndex ? 'text-text font-medium' : 'text-text-muted'}`}>
                {s.label}
              </span>
              {i < stepLabels.length - 1 ? (
                <div className={`w-8 h-px ${i < stepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* Steps */}
      {step === 'upload' ? (
        checkingFreshness ? (
          <div className="flex items-center gap-3 text-text-muted py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : hasExistingBook ? (
          <div className="bg-white border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-text">{t('import.not_fresh_title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('import.not_fresh_body')}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleResetBook}
                    disabled={resetting}
                    className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/90 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {resetting ? t('import.resetting') : t('import.reset_and_reimport')}
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-text rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <UploadStep onParsed={handleParsed} />
        )
      ) : null}

      {step === 'structure' ? (
        <StructureStep
          chapters={chapters}
          setChapters={setChapters}
          onBack={() => setStep('upload')}
          onNext={handleExtract}
        />
      ) : null}

      {step === 'entities' ? (
        <EntitiesStep
          characters={characters}
          locations={locations}
          plotThreads={plotThreads}
          setCharacters={setCharacters}
          setLocations={setLocations}
          setPlotThreads={setPlotThreads}
          onReset={handleResetEntities}
          extracting={extracting}
          extractProgress={extractProgress}
          extractTotal={extractTotal}
          onBack={() => setStep('structure')}
          onNext={() => setStep('confirm')}
        />
      ) : null}

      {step === 'confirm' ? (
        <ConfirmStep
          chapters={chapters}
          characters={characters}
          locations={locations}
          plotThreads={plotThreads}
          book={book}
          setBook={setBook}
          existingProjectTitle={existingProjectTitle}
          onBack={() => setStep('entities')}
          onImport={handleImport}
        />
      ) : null}

      {step === 'importing' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-text-muted">
            {t('import.importing_progress', { current: importProgress, total: importTotal })}
          </p>
          <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${importTotal ? (importProgress / importTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {step === 'done' ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          {importError ? (
            <>
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-text font-medium">Import completed with errors</p>
              <p className="text-sm text-text-muted">{importedCount} documents created. Error: {importError}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-text font-medium">{t('import.done_title')}</p>
              <p className="text-sm text-text-muted">{t('import.done_message')}</p>
            </>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => navigate('/scenes')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              {t('nav.scenes')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              {t('import.view_dashboard')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
