import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { useBookTerms } from '../lib/useBookTerms'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Users,
  MapPin,
  BookOpen,
  PenTool,
  GitBranch,
  AlertCircle,
  Trash2,
  Loader2,
  Pencil,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES, THREAD_STATUS_COLORS, CHAPTER_STATUS_COLORS } from '../lib/constants'
import { useBookStructure } from '../lib/useBookStructure'
import { chapterLabel, sceneTitleShown } from '../lib/titles'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'

interface ChapterData {
  title: string
  status?: string
}

function StatCard({ icon: Icon, label, value, to }: {
  icon: typeof Users
  label: string
  value: number | string
  to: string
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-text">{value}</div>
          <div className="text-sm text-text-muted">{label}</div>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { structure } = useBookStructure()

  const { data: projects, isLoading: loadingProject } = useDocuments({
    template_id: TEMPLATES.PROJECT,
    status: 'active',
    namespace: NAMESPACE,
  })
  const { data: characters } = useDocuments({ template_id: TEMPLATES.CHARACTER, status: 'active', page_size: 1, namespace: NAMESPACE })
  const { data: locations } = useDocuments({ template_id: TEMPLATES.LOCATION, status: 'active', page_size: 1, namespace: NAMESPACE })
  const { data: chapters } = useDocuments({ template_id: TEMPLATES.CHAPTER, status: 'active', page_size: 50, namespace: NAMESPACE })
  const { data: events } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 5,
    namespace: NAMESPACE,
  })
  const { data: threads } = useDocuments({ template_id: TEMPLATES.PLOT_THREAD, status: 'active', page_size: 50, namespace: NAMESPACE })

  const project = projects?.items?.[0]
  const projectData = project?.data as Record<string, unknown> | undefined
  const genreLabel = useTermLabel(TERMINOLOGIES.GENRE)
  const timeSystemLabel = useTermLabel(TERMINOLOGIES.TIME_SYSTEM)
  const [projectModal, setProjectModal] = useState<'create' | 'edit' | null>(null)
  const deleteDocument = useDeleteDocument()

  // AA_PROJECT's identity is its title: saving a new title creates a new
  // document rather than a new version. Retire the old one so the book
  // keeps exactly one project. Nothing references the project document.
  const handleProjectSaved = (savedId?: string) => {
    if (projectModal === 'edit' && project && savedId && savedId !== project.document_id) {
      deleteDocument.mutate({ id: project.document_id })
    }
  }

  const openThreads = threads?.items?.filter((t) => {
    const d = t.data as Record<string, unknown>
    return d.status === 'OPEN' || d.status === 'DEVELOPING'
  }) ?? []

  // Build a map from chapter document_id to ChapterData for lookups
  const chapterDataMap = useMemo(() => {
    const m = new Map<string, ChapterData>()
    ;(chapters?.items ?? []).forEach((c) => m.set(c.document_id, c.data as unknown as ChapterData))
    return m
  }, [chapters])

  // Order chapters according to structure
  const orderedChapters = useMemo(() => {
    if (!structure || !chapters?.items?.length) return []
    // Use structure ordering: iterate structure chapters and look up the chapter data
    return structure.raw.chapters
      .map((slot) => {
        const chData = chapterDataMap.get(slot.chapter_id)
        if (!chData) return null
        return {
          document_id: slot.chapter_id,
          displayNumber: structure.getDisplayNumber(slot.chapter_id),
          data: chData,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [structure, chapters, chapterDataMap])

  if (loadingProject) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('dashboard.loading_project')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Project header */}
      {projectData ? (
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-text">{String(projectData.title)}</h1>
            <button
              onClick={() => setProjectModal('edit')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('common.edit')}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
            {projectData.author ? <span>{t('dashboard.by_author', { author: String(projectData.author) })}</span> : null}
            {projectData.genre ? (
              <StatusBadge label={genreLabel(projectData.genre)} colorClass="bg-accent/10 text-accent" />
            ) : null}
            {projectData.time_system ? <span>{t('dashboard.time_label', { system: timeSystemLabel(projectData.time_system) })}</span> : null}
          </div>
          {projectData.description ? (
            <p className="mt-3 text-text-muted text-sm max-w-2xl">{String(projectData.description)}</p>
          ) : null}
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            {t('dashboard.title')}
          </h1>
          <p className="text-text-muted mt-1">{t('dashboard.no_project')}</p>
          <button
            onClick={() => setProjectModal('create')}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.create_project')}
          </button>
        </div>
      )}

      {projectModal && (
        <CreateEntityModal
          entityType="project"
          mode={projectModal}
          existingData={projectModal === 'edit' ? projectData : undefined}
          onClose={() => setProjectModal(null)}
          onCreated={handleProjectSaved}
        />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label={t('characters.title')} value={characters?.total ?? 0} to="/characters" />
        <StatCard icon={MapPin} label={t('locations.title')} value={locations?.total ?? 0} to="/locations" />
        <StatCard icon={BookOpen} label={t('chapters_page.title')} value={structure?.chapterCount ?? 0} to="/chapters" />
        <StatCard icon={PenTool} label={t('common.scenes')} value={structure?.sceneCount ?? 0} to="/scenes" />
        <StatCard icon={GitBranch} label={t('plot_threads.title')} value={threads?.total ?? 0} to="/plot-threads" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent scenes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            {t('dashboard.recent_scenes')}
          </h2>
          {events?.items?.length ? (
            <div className="space-y-2">
              {events.items.map((event) => {
                const d = event.data as Record<string, unknown>
                const chNum = structure?.getDisplayNumberForScene(event.document_id)
                return (
                  <Link
                    key={event.document_id}
                    to={`/scenes?id=${event.document_id}`}
                    className="block p-2 rounded hover:bg-surface transition-colors"
                  >
                    <div className="font-medium text-sm text-text">{sceneTitleShown(String(d.title))}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {chNum != null && t('dashboard.ch_short', { number: chNum })}
                      {d.location != null && ` — ${String(d.location)}`}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-light">{t('dashboard.no_scenes')}</p>
          )}
        </div>

        {/* Open plot threads */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            {t('dashboard.open_threads')}
          </h2>
          {openThreads.length ? (
            <div className="space-y-2">
              {openThreads.map((thread) => {
                const d = thread.data as Record<string, unknown>
                const status = d.status as string
                return (
                  <Link
                    key={thread.document_id}
                    to="/plot-threads"
                    className="block p-2 rounded hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-text">{String(d.title)}</span>
                      <StatusBadge label={status} colorClass={THREAD_STATUS_COLORS[status]} />
                    </div>
                    {d.description ? (
                      <div className="text-xs text-text-muted mt-0.5 line-clamp-1">
                        {String(d.description)}
                      </div>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-light">{t('dashboard.no_open_threads')}</p>
          )}
        </div>

        {/* Chapter progress */}
        {orderedChapters.length ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-2">
            <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {t('dashboard.chapter_progress')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {orderedChapters.map((ch) => {
                const status = ch.data.status || 'OUTLINE'
                return (
                  <Link
                    key={ch.document_id}
                    to="/chapters"
                    className="flex items-center gap-1.5 p-2 rounded border border-gray-100 hover:border-primary/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-text">{chapterLabel(t, ch.displayNumber, ch.data.title)}</span>
                    <StatusBadge label={status} colorClass={CHAPTER_STATUS_COLORS[status]} />
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* Danger zone */}
      <DangerZone />
    </div>
  )
}

const DELETE_OPTIONS: Array<{ key: string; labelKey: string; templates: string[]; descKey: string }> = [
  { key: 'chapters', labelKey: 'dashboard.chapters_scenes', templates: ['AA_CHAPTER', 'AA_EVENT', 'AA_BOOK_STRUCTURE'], descKey: 'dashboard.chapters_scenes_desc' },
  { key: 'characters', labelKey: 'dashboard.characters_label', templates: ['AA_CHARACTER'], descKey: 'dashboard.characters_desc' },
  { key: 'locations', labelKey: 'dashboard.locations_label', templates: ['AA_LOCATION'], descKey: 'dashboard.locations_desc' },
  { key: 'plots', labelKey: 'dashboard.plots_label', templates: ['AA_PLOT_THREAD'], descKey: 'dashboard.plots_desc' },
  { key: 'notes', labelKey: 'dashboard.notes_label', templates: ['AA_NOTE'], descKey: 'dashboard.notes_desc' },
  { key: 'rules', labelKey: 'dashboard.rules_label', templates: ['AA_WORLD_RULE'], descKey: 'dashboard.rules_desc' },
]

function DangerZone() {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(DELETE_OPTIONS.map(o => o.key)))
  const [clearNames, setClearNames] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<{ deletedDocs: number; deletedTerms: number } | null>(null)
  const queryClient = useQueryClient()
  const BASE_PATH = import.meta.env.BASE_URL || '/'

  const toggleOption = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allSelected = selected.size === DELETE_OPTIONS.length
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      setClearNames(false)
    } else {
      setSelected(new Set(DELETE_OPTIONS.map(o => o.key)))
      setClearNames(true)
    }
  }

  const handleDelete = async () => {
    const templates = DELETE_OPTIONS
      .filter(o => selected.has(o.key))
      .flatMap(o => o.templates)
    if (templates.length === 0 && !clearNames) return

    setDeleting(true)
    try {
      const res = await fetch(`${BASE_PATH}api/book/reset`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates, clearNames }),
      })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { data = { error: `Server returned: ${res.status} ${res.statusText}` } }
      if (res.ok && data.status === 'ok') {
        setResult(data)
        // Force refetch all queries to clear stale structure/document data
        await queryClient.invalidateQueries()
        await queryClient.refetchQueries()
      } else {
        alert(`Delete failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="mt-10 border border-red-200 rounded-lg p-4 bg-red-50/50">
      <h2 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
        <Trash2 className="w-4 h-4" />
        {t('dashboard.danger_zone')}
      </h2>
      {result ? (
        <p className="text-sm text-text-muted">
          {t('dashboard.deleted_result', { docs: result.deletedDocs, terms: result.deletedTerms })}
        </p>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {t('dashboard.reset_description')}
          </p>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0 ml-4"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('dashboard.reset_book')}
          </button>
        </div>
      )}

      {showConfirm ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-text mb-3">{t('dashboard.reset_title')}</h3>
            <p className="text-sm text-text-muted mb-4">
              {t('dashboard.reset_instructions')}
            </p>

            <div className="space-y-2 mb-4">
              {/* Select all */}
              <label className="flex items-center gap-3 cursor-pointer pb-2 border-b border-gray-100">
                <input
                  type="checkbox"
                  checked={allSelected && clearNames}
                  onChange={toggleAll}
                  className="accent-red-600"
                />
                <span className="text-sm font-medium text-text">{t('dashboard.select_all')}</span>
              </label>

              {DELETE_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(opt.key)}
                    onChange={() => toggleOption(opt.key)}
                    className="accent-red-600"
                  />
                  <div>
                    <span className="text-sm text-text">{t(opt.labelKey)}</span>
                    <span className="text-xs text-text-muted ml-2">{t(opt.descKey)}</span>
                  </div>
                </label>
              ))}

              {/* Name registries — separate since it's terms, not documents */}
              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-gray-100">
                <input
                  type="checkbox"
                  checked={clearNames}
                  onChange={(e) => setClearNames(e.target.checked)}
                  className="accent-red-600"
                />
                <div>
                  <span className="text-sm text-text">{t('dashboard.name_registries')}</span>
                  <span className="text-xs text-text-muted ml-2">{t('dashboard.name_registries_desc')}</span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (selected.size === 0 && !clearNames)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? t('common.deleting') : t('dashboard.delete_selected')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** A term's label by its stored value (the value itself while terms load or when none matches). */
function useTermLabel(terminology: string) {
  const { data: terms } = useBookTerms(terminology, { page_size: 100 })
  return (value: unknown) => {
    const v = String(value ?? '')
    return terms?.items?.find((term) => term.value === v)?.label || v
  }
}
