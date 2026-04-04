import { useState } from 'react'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { StickyNote, Filter, Plus, Pencil, Trash2 } from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'

interface NoteData {
  title: string
  note_type: string
  content: string
  tags?: string[]
  linked_characters?: string[]
  linked_events?: string[]
  linked_locations?: string[]
  linked_plot_threads?: string[]
}

const NOTE_TYPE_COLORS: Record<string, string> = {
  IDEA: 'bg-amber-100 text-amber-800',
  RESEARCH: 'bg-blue-100 text-blue-800',
  VOICE: 'bg-purple-100 text-purple-800',
  THEME: 'bg-indigo-100 text-indigo-800',
  REVISION: 'bg-red-100 text-red-800',
  BRAINSTORM: 'bg-green-100 text-green-800',
}

export default function NotesPage() {
  const [filterType, setFilterType] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()

  const { data: notes, isLoading } = useDocuments({
    template_id: TEMPLATES.NOTE,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })

  const filtered = filterType
    ? notes?.items?.filter((n) => (n.data as unknown as NoteData).note_type === filterType)
    : notes?.items

  const noteTypes = ['IDEA', 'RESEARCH', 'VOICE', 'THEME', 'REVISION', 'BRAINSTORM']

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading notes...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <BackLink />
      <div className="flex items-center gap-3 mb-4">
        <StickyNote className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">Notes</h1>
        <span className="text-sm text-text-muted">({notes?.total ?? 0})</span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Type filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-text-muted" />
        <button
          onClick={() => setFilterType(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filterType === null ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {noteTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === type ? 'bg-primary text-white' : NOTE_TYPE_COLORS[type] + ' hover:opacity-80'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {filtered?.length ? (
        <div className="space-y-3">
          {filtered.map((note) => {
            const d = note.data as unknown as NoteData
            return (
              <div key={note.document_id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-text">{d.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditData(d as unknown as Record<string, unknown>)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    {confirmDelete === note.document_id ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button
                          onClick={() => deleteDoc.mutate({ id: note.document_id }, { onSuccess: () => setConfirmDelete(null) })}
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
                        onClick={() => setConfirmDelete(note.document_id)}
                        className="text-text-muted hover:text-red-600 p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    <StatusBadge label={d.note_type} colorClass={NOTE_TYPE_COLORS[d.note_type]} />
                  </div>
                </div>
                <p className="text-sm text-text whitespace-pre-wrap mb-2">{d.content}</p>
                <div className="flex flex-wrap gap-1">
                  {d.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-surface rounded text-xs text-text-muted">
                      {String(tag)}
                    </span>
                  ))}
                  {d.linked_characters?.map((c, i) => (
                    <span key={`c-${i}`} className="px-2 py-0.5 bg-primary/5 rounded text-xs text-primary">
                      {String(c)}
                    </span>
                  ))}
                  {d.linked_locations?.map((l, i) => (
                    <span key={`l-${i}`} className="px-2 py-0.5 bg-accent/5 rounded text-xs text-accent">
                      {String(l)}
                    </span>
                  ))}
                  {d.linked_plot_threads?.map((pt, i) => (
                    <span key={`pt-${i}`} className="px-2 py-0.5 bg-amber-50 rounded text-xs text-amber-700">
                      {String(pt)}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-text-muted">
          {filterType ? `No ${filterType.toLowerCase()} notes.` : 'No notes yet. Click "New Note" to create one.'}
        </p>
      )}

      {showCreate ? (
        <CreateEntityModal
          entityType="note"
          onClose={() => setShowCreate(false)}
        />
      ) : null}

      {editData ? (
        <CreateEntityModal
          entityType="note"
          mode="edit"
          existingData={editData}
          onClose={() => setEditData(null)}
          onCreated={() => setEditData(null)}
        />
      ) : null}
    </div>
  )
}
