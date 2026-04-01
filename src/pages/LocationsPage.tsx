import { useState } from 'react'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { MapPin, ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { TEMPLATES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'

interface LocationData {
  name: string
  type?: string
  description?: string
  atmosphere?: string
  rules?: string
  significance?: string
}

const TYPE_COLORS: Record<string, string> = {
  CITY: 'bg-blue-100 text-blue-800',
  TOWN: 'bg-teal-100 text-teal-800',
  BUILDING: 'bg-amber-100 text-amber-800',
  ROOM: 'bg-orange-100 text-orange-800',
  OUTDOOR: 'bg-green-100 text-green-800',
  VEHICLE: 'bg-purple-100 text-purple-800',
  REALM: 'bg-indigo-100 text-indigo-800',
  VIRTUAL: 'bg-pink-100 text-pink-800',
  OTHER: 'bg-gray-200 text-gray-700',
}

function LocationDetail({ data, onBack, onEdit, onDelete }: { data: LocationData; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const sections = [
    { label: 'Atmosphere', value: data.atmosphere },
    { label: 'Rules', value: data.rules },
    { label: 'Significance', value: data.significance },
  ].filter((s) => s.value)

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All locations
      </button>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-text">{data.name}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
          {data.type ? (
            <StatusBadge label={data.type} colorClass={TYPE_COLORS[data.type]} />
          ) : null}
        </div>
      </div>

      {data.description ? (
        <p className="text-sm text-text mb-4 max-w-xl">{data.description}</p>
      ) : null}

      {sections.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {sections.map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-sm text-primary mb-2">{s.label}</h3>
              <p className="text-sm text-text whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function LocationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteDoc = useDeleteDocument()

  const { data: locations, isLoading } = useDocuments({
    template_id: TEMPLATES.LOCATION,
    status: 'active',
    page_size: 50,
  })

  const selected = locations?.items?.find((l) => l.document_id === selectedId)
  const selectedData = selected?.data as unknown as LocationData | undefined

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading locations...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <BackLink />
      {selectedData ? (
        <>
          <LocationDetail
            data={selectedData}
            onBack={() => setSelectedId(null)}
            onEdit={() => setEditData(selectedData as unknown as Record<string, unknown>)}
            onDelete={() => setConfirmDelete(true)}
          />
          {confirmDelete ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-text mb-2">Delete location?</h3>
                <p className="text-sm text-text-muted mb-4">
                  This will permanently delete <strong>{selectedData.name}</strong>. This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteDoc.mutate({ id: selectedId! }, { onSuccess: () => { setConfirmDelete(false); setSelectedId(null) } })}
                    disabled={deleteDoc.isPending}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteDoc.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {editData ? (
            <CreateEntityModal
              entityType="location"
              mode="edit"
              existingData={editData}
              onClose={() => setEditData(null)}
              onCreated={() => setEditData(null)}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-text">Locations</h1>
            <span className="text-sm text-text-muted">({locations?.total ?? 0})</span>
            <button
              onClick={() => setShowCreate(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Location
            </button>
          </div>

          {locations?.items?.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.items.map((loc) => {
                const d = loc.data as unknown as LocationData
                return (
                  <button
                    key={loc.document_id}
                    onClick={() => setSelectedId(loc.document_id)}
                    className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text">{d.name}</h3>
                      {d.type ? (
                        <StatusBadge label={d.type} colorClass={TYPE_COLORS[d.type]} />
                      ) : null}
                    </div>
                    {d.description ? (
                      <p className="text-sm text-text-muted line-clamp-2">{d.description}</p>
                    ) : null}
                    {d.atmosphere ? (
                      <p className="text-xs text-text-light mt-1 italic line-clamp-1">{d.atmosphere}</p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-text-muted">No locations yet. Click "New Location" to create one.</p>
          )}

          {showCreate ? (
            <CreateEntityModal
              entityType="location"
              onClose={() => setShowCreate(false)}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
