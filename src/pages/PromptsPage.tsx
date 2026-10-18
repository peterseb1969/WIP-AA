import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useDeleteDocument, useCreateDocument } from '@wip/react'
import { Sparkles, Plus, Pencil, Trash2, Wand2 } from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { STARTER_PROMPTS, type PromptData } from '../lib/analysis'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'

export default function PromptsPage() {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<{ id: string; data: PromptData } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [addingStarters, setAddingStarters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()
  const createDoc = useCreateDocument()
  const { data: prompts, isLoading } = useDocuments({
    template_id: TEMPLATES.PROMPT,
    status: 'active',
    page_size: 100,
    namespace: NAMESPACE,
  })

  const items = (prompts?.items ?? [])
    .map((p) => ({ id: p.document_id, data: p.data as unknown as PromptData }))
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
  const existingNames = new Set(items.map((p) => p.data.name.toLowerCase()))
  const missingStarters = STARTER_PROMPTS.filter((p) => !existingNames.has(p.name.toLowerCase()))

  // AA_PROMPT's identity is its name, so creating a prompt whose name
  // already exists would overwrite it — add only the starters that are
  // missing, leaving any edited ones alone.
  const addStarters = async () => {
    setAddingStarters(true)
    setError(null)
    try {
      for (const p of missingStarters) {
        await createDoc.mutateAsync({ template_id: TEMPLATES.PROMPT, namespace: NAMESPACE, data: { ...p } })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAddingStarters(false)
    }
  }

  // A rename creates a new document (identity = name); retire the old one.
  const handleEdited = (savedId?: string) => {
    if (editing && savedId && savedId !== editing.id) deleteDoc.mutate({ id: editing.id })
    setEditing(null)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('prompts.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <BackLink />
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('prompts.title')}</h1>
        <span className="text-sm text-text-muted">({items.length})</span>
        <div className="ml-auto flex items-center gap-2">
          {missingStarters.length > 0 && (
            <button
              onClick={addStarters}
              disabled={addingStarters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {t('prompts.add_starters', { count: missingStarters.length })}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('prompts.new')}
          </button>
        </div>
      </div>
      <p className="text-sm text-text-muted mb-6">{t('prompts.intro')}</p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {items.length ? (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-text">{p.data.name}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(p)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {t('common.edit')}
                  </button>
                  {confirmDelete === p.id ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-xs text-red-600">{t('prompts.delete_confirm')}</span>
                      <button
                        onClick={() => deleteDoc.mutate({ id: p.id }, { onSuccess: () => setConfirmDelete(null) })}
                        disabled={deleteDoc.isPending}
                        className="px-1.5 py-0.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {t('common.yes')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-text-muted rounded hover:bg-gray-200 transition-colors"
                      >
                        {t('common.no')}
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="text-text-muted hover:text-red-600 p-1 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              {p.data.description ? <p className="text-sm text-text-muted mb-2">{p.data.description}</p> : null}
              {p.data.context?.length ? (
                <div className="flex flex-wrap gap-1">
                  {p.data.context.map((c) => (
                    <span key={c} className="px-2 py-0.5 bg-primary/5 rounded text-xs text-primary">
                      {t(`prompts.context.${c}`, { defaultValue: c })}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted">{t('prompts.empty')}</p>
      )}

      {showCreate ? (
        <CreateEntityModal entityType="prompt" onClose={() => setShowCreate(false)} />
      ) : null}

      {editing ? (
        <CreateEntityModal
          entityType="prompt"
          mode="edit"
          existingData={editing.data as unknown as Record<string, unknown>}
          onClose={() => setEditing(null)}
          onCreated={handleEdited}
        />
      ) : null}
    </div>
  )
}
