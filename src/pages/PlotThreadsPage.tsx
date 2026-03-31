import { useDocuments } from '@wip/react'
import { GitBranch } from 'lucide-react'
import { TEMPLATES, THREAD_STATUS_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

interface PlotThreadData {
  title: string
  status: string
  description?: string
  opened_chapter?: number
  resolved_chapter?: number
  characters?: string[]
  notes?: string
}

export default function PlotThreadsPage() {
  const { data: threads, isLoading } = useDocuments({
    template_id: TEMPLATES.PLOT_THREAD,
    status: 'active',
    page_size: 50,
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading plot threads...</div>
      </div>
    )
  }

  // Group by status
  const byStatus = new Map<string, Array<{ id: string; data: PlotThreadData }>>()
  threads?.items?.forEach((t) => {
    const d = t.data as unknown as PlotThreadData
    const status = d.status || 'OPEN'
    if (!byStatus.has(status)) byStatus.set(status, [])
    byStatus.get(status)!.push({ id: t.document_id, data: d })
  })

  const statusOrder = ['OPEN', 'DEVELOPING', 'CLIMAX', 'RESOLVED', 'ABANDONED']

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Plot Threads</h1>
        <span className="text-sm text-text-muted">({threads?.total ?? 0})</span>
      </div>

      {threads?.items?.length ? (
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const items = byStatus.get(status)
            if (!items?.length) return null
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge label={status} colorClass={THREAD_STATUS_COLORS[status]} />
                  <span className="text-xs text-text-muted">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((thread) => (
                    <div
                      key={thread.id}
                      className="bg-white rounded-lg border border-gray-200 p-4"
                    >
                      <h3 className="font-semibold text-text mb-1">{thread.data.title}</h3>
                      {thread.data.description ? (
                        <p className="text-sm text-text-muted mb-2">{thread.data.description}</p>
                      ) : null}
                      <div className="flex items-center gap-4 text-xs text-text-light">
                        {thread.data.opened_chapter != null ? (
                          <span>Opened: Ch. {thread.data.opened_chapter}</span>
                        ) : null}
                        {thread.data.resolved_chapter != null ? (
                          <span>Resolved: Ch. {thread.data.resolved_chapter}</span>
                        ) : null}
                        {thread.data.characters?.length ? (
                          <span>{thread.data.characters.map(String).join(', ')}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-text-muted">No plot threads yet. Use the AskBar to create one.</p>
      )}
    </div>
  )
}
