import { useDocuments, useTerms } from '@wip/react'
import {
  LayoutDashboard,
  Users,
  MapPin,
  BookOpen,
  PenTool,
  GitBranch,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TEMPLATES, TERMINOLOGIES, THREAD_STATUS_COLORS, CHAPTER_STATUS_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

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
  const { data: projects, isLoading: loadingProject } = useDocuments({
    template_id: TEMPLATES.PROJECT,
    status: 'active',
  })
  const { data: characters } = useTerms(TERMINOLOGIES.CHARACTERS, { page_size: 1 })
  const { data: locations } = useTerms(TERMINOLOGIES.LOCATIONS, { page_size: 1 })
  const { data: chapters } = useDocuments({ template_id: TEMPLATES.CHAPTER, status: 'active', page_size: 50 })
  const { data: events } = useDocuments({
    template_id: TEMPLATES.EVENT,
    status: 'active',
    page_size: 5,
  })
  const { data: threads } = useDocuments({ template_id: TEMPLATES.PLOT_THREAD, status: 'active', page_size: 50 })

  const project = projects?.items?.[0]
  const projectData = project?.data as Record<string, unknown> | undefined

  const openThreads = threads?.items?.filter((t) => {
    const d = t.data as Record<string, unknown>
    return d.status === 'OPEN' || d.status === 'DEVELOPING'
  }) ?? []

  if (loadingProject) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading project...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Project header */}
      {projectData ? (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">{String(projectData.title)}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
            {projectData.author ? <span>by {String(projectData.author)}</span> : null}
            {projectData.genre ? (
              <StatusBadge label={String(projectData.genre)} colorClass="bg-accent/10 text-accent" />
            ) : null}
            {projectData.time_system ? <span>Time: {String(projectData.time_system)}</span> : null}
          </div>
          {projectData.description ? (
            <p className="mt-3 text-text-muted text-sm max-w-2xl">{String(projectData.description)}</p>
          ) : null}
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-text-muted mt-1">No project created yet. Use the AskBar to create one.</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Characters" value={characters?.total ?? 0} to="/characters" />
        <StatCard icon={MapPin} label="Locations" value={locations?.total ?? 0} to="/locations" />
        <StatCard icon={BookOpen} label="Chapters" value={chapters?.total ?? 0} to="/chapters" />
        <StatCard icon={PenTool} label="Scenes" value={events?.total ?? 0} to="/scenes" />
        <StatCard icon={GitBranch} label="Plot Threads" value={threads?.total ?? 0} to="/plot-threads" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent scenes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            Recent Scenes
          </h2>
          {events?.items?.length ? (
            <div className="space-y-2">
              {events.items.map((event) => {
                const d = event.data as Record<string, unknown>
                return (
                  <Link
                    key={event.document_id}
                    to="/scenes"
                    className="block p-2 rounded hover:bg-surface transition-colors"
                  >
                    <div className="font-medium text-sm text-text">{String(d.title)}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {d.chapter_number != null && `Ch. ${d.chapter_number}`}
                      {d.location != null && ` — ${String(d.location)}`}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-light">No scenes yet.</p>
          )}
        </div>

        {/* Open plot threads */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            Open Plot Threads
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
            <p className="text-sm text-text-light">No open threads.</p>
          )}
        </div>

        {/* Chapter progress */}
        {chapters?.items?.length ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:col-span-2">
            <h2 className="font-semibold text-text mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Chapter Progress
            </h2>
            <div className="flex flex-wrap gap-2">
              {[...chapters.items]
                .sort((a, b) => {
                  const an = (a.data as Record<string, unknown>).number as number
                  const bn = (b.data as Record<string, unknown>).number as number
                  return an - bn
                })
                .map((ch) => {
                  const d = ch.data as Record<string, unknown>
                  const status = (d.status as string) || 'OUTLINE'
                  return (
                    <Link
                      key={ch.document_id}
                      to="/chapters"
                      className="flex items-center gap-1.5 p-2 rounded border border-gray-100 hover:border-primary/30 transition-colors"
                    >
                      <span className="text-sm font-medium text-text">Ch. {Number(d.number)}</span>
                      <StatusBadge label={status} colorClass={CHAPTER_STATUS_COLORS[status]} />
                    </Link>
                  )
                })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
