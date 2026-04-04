import { useState } from 'react'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { GitBranch, Plus, Pencil, Trash2 } from 'lucide-react'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES, THREAD_STATUS_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import AliasManager from '../components/AliasManager'
import BackLink from '../components/BackLink'

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
  const [showCreate, setShowCreate] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()
  const { data: threads, isLoading } = useDocuments({
    template_id: TEMPLATES.PLOT_THREAD,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
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
      <BackLink />
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Plot Threads</h1>
        <span className="text-sm text-text-muted">({threads?.total ?? 0})</span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Thread
        </button>
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
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-text">{thread.data.title}</h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditData(thread.data as unknown as Record<string, unknown>)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          {confirmDelete === thread.id ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs text-red-600">Delete?</span>
                              <button
                                onClick={() => deleteDoc.mutate({ id: thread.id }, { onSuccess: () => setConfirmDelete(null) })}
                                disabled={deleteDoc.isPending}
                                className="px-1.5 py-0.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-text-muted rounded hover:bg-gray-200 transition-colors"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(thread.id)}
                              className="text-text-muted hover:text-red-600 p-1 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {thread.data.description ? (
                        <p className="text-sm text-text-muted mb-2">{thread.data.description}</p>
                      ) : null}
                      <AliasManager terminologyValue={TERMINOLOGIES.PLOT_THREADS} entityTermValue={thread.data.title} />
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
        <p className="text-text-muted">No plot threads yet. Click "New Thread" to create one.</p>
      )}

      {showCreate ? (
        <CreateEntityModal
          entityType="plot_thread"
          onClose={() => setShowCreate(false)}
        />
      ) : null}

      {editData ? (
        <CreateEntityModal
          entityType="plot_thread"
          mode="edit"
          existingData={editData}
          onClose={() => setEditData(null)}
          onCreated={() => setEditData(null)}
        />
      ) : null}
    </div>
  )
}
