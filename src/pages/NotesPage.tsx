import { useState } from 'react'
import { useDocuments } from '@wip/react'
import { StickyNote, Filter, Plus } from 'lucide-react'
import { TEMPLATES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'

interface NoteData {
  title: string
  note_type: string
  content: string
  tags?: string[]
  linked_characters?: string[]
  linked_events?: string[]
  linked_locations?: string[]
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

  const { data: notes, isLoading } = useDocuments({
    template_id: TEMPLATES.NOTE,
    status: 'active',
    page_size: 50,
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
                  <StatusBadge label={d.note_type} colorClass={NOTE_TYPE_COLORS[d.note_type]} />
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
    </div>
  )
}
