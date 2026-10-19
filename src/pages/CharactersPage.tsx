import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useTerms, useDeleteDocument, useUpdateDocument } from '@wip/react'
import { Users, ArrowLeft, Heart, Plus, Pencil, Trash2, X } from 'lucide-react'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES, ROLE_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import CreateEntityModal from '../components/CreateEntityModal'
import AliasManager from '../components/AliasManager'
import CrossReferences from '../components/CrossReferences'
import BackLink from '../components/BackLink'
import MediaSection, { Avatar } from '../components/MediaSection'
import { MergeToolbar, MergeEntitiesDialog, useMergeSelection, selectedCardClass } from '../components/MergeEntities'
import { useAttachments, usePortraitOf, portraitOf } from '../lib/media'
import { useEntityNames } from '../lib/entityNames'

interface CharacterData {
  name: string
  role: string
  age?: string
  description?: string
  personality?: string
  backstory?: string
  goals?: string
  flaws?: string
  voice_notes?: string
  arc_summary?: string
  relationships?: Array<{
    character: string
    relationship_type: string
    start_time?: number
    end_time?: number
    description?: string
  }>
}

function CharacterCard({ data, displayName, portrait, selected = false, onClick }: { data: CharacterData; displayName: string; portrait?: string; selected?: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all w-full ${selectedCardClass(selected)}`}
    >
      <div className="flex items-start gap-3 mb-2">
        {portrait ? <Avatar fileId={portrait} name={displayName} className="w-10 h-10" /> : null}
        <h3 className="font-semibold text-text flex-1">{displayName}</h3>
        <StatusBadge label={data.role} colorClass={ROLE_COLORS[data.role]} />
      </div>
      {data.age ? <div className="text-xs text-text-muted mb-1">{t('characters.age_label', { age: data.age })}</div> : null}
      {data.description ? (
        <p className="text-sm text-text-muted line-clamp-2">{data.description}</p>
      ) : null}
      {data.relationships?.length ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-text-light">
          <Heart className="w-3 h-3" />
          {t('characters.relationship_count', { count: data.relationships.length })}
        </div>
      ) : null}
    </button>
  )
}

function CharacterDetail({ documentId, data, onBack, onEdit, onDelete }: { documentId: string; data: CharacterData; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation()
  // Resolve character names from terms
  const { data: charTerms } = useTerms(TERMINOLOGIES.CHARACTERS, { page_size: 1000, namespace: NAMESPACE, status: 'active' } as any)
  const names = useEntityNames()
  const displayName = names.label('character', data.name)
  const { attachments } = useAttachments(documentId)

  const sections = [
    { label: t('characters.personality'), value: data.personality },
    { label: t('characters.backstory'), value: data.backstory },
    { label: t('characters.goals'), value: data.goals },
    { label: t('characters.flaws'), value: data.flaws },
    { label: t('characters.voice_notes'), value: data.voice_notes },
    { label: t('characters.arc_summary'), value: data.arc_summary },
  ].filter((s) => s.value)

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('characters.all')}
      </button>

      <div className="flex items-start gap-4 mb-6">
        <Avatar fileId={portraitOf(attachments)?.fileId} name={displayName} className="w-14 h-14" textClassName="font-bold text-xl" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-text">{displayName}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t('common.edit')}
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('common.delete')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge label={data.role} colorClass={ROLE_COLORS[data.role]} />
            {data.age ? <span className="text-sm text-text-muted">{t('characters.age_label', { age: data.age })}</span> : null}
          </div>
          {data.description ? (
            <p className="text-sm text-text-muted mt-2 max-w-xl">{data.description}</p>
          ) : null}
        </div>
      </div>

      <AliasManager terminologyValue={TERMINOLOGIES.CHARACTERS} entityTermValue={data.name} />
      <CrossReferences kind="character" termId={names.termId('character', data.name)} />
      <MediaSection entityId={documentId} kind="character" />

      {/* Character bible sections */}
      {sections.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {sections.map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-sm text-primary mb-2">{s.label}</h3>
              <p className="text-sm text-text whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Relationships
        documentId={documentId}
        characterValue={data.name}
        relationships={data.relationships ?? []}
        characterTerms={charTerms?.items ?? []}
      />
    </div>
  )
}

type Relationship = NonNullable<CharacterData['relationships']>[number]

/**
 * A character's relationships, stored inline on the character document as
 * an array of AA_CHAR_REL objects. Changes are saved with a merge PATCH of
 * just that array (arrays replace wholesale), so the rest of the document is
 * untouched and the identity field (`name`) never changes.
 */
function Relationships({
  documentId,
  characterValue,
  relationships,
  characterTerms,
}: {
  documentId: string
  characterValue: string
  relationships: Relationship[]
  characterTerms: Array<{ value: string; label?: string | null }>
}) {
  const { t } = useTranslation()
  const updateDoc = useUpdateDocument()
  const portraitOfName = usePortraitOf()
  const names = useEntityNames()
  const { data: typeTerms } = useTerms(TERMINOLOGIES.RELATIONSHIP_TYPE, { page_size: 50, namespace: NAMESPACE } as any)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ character: '', relationship_type: '', description: '' })
  const [error, setError] = useState<string | null>(null)

  const save = (next: Relationship[], onDone?: () => void) => {
    setError(null)
    updateDoc.mutate(
      { documentId, patch: { relationships: next } },
      {
        onSuccess: () => onDone?.(),
        onError: (err) => setError(err.message || t('entities.save_failed')),
      },
    )
  }

  const handleAdd = () => {
    if (!draft.character || !draft.relationship_type) return
    const rel: Relationship = { character: draft.character, relationship_type: draft.relationship_type }
    if (draft.description.trim()) rel.description = draft.description.trim()
    save([...relationships, rel], () => {
      setAdding(false)
      setDraft({ character: '', relationship_type: '', description: '' })
    })
  }

  const typeLabel = (value: string) =>
    typeTerms?.items?.find((tm) => tm.value === value)?.label || value.replace(/_/g, ' ').toLowerCase()

  const selectClass =
    'border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-text focus:outline-none focus:border-primary'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-primary flex items-center gap-2">
          <Heart className="w-4 h-4" />
          {t('characters.relationships')} ({relationships.length})
        </h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
          >
            <Plus className="w-4 h-4" />
            {t('characters.add_relationship')}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {relationships.map((rel, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded bg-surface">
            <Avatar
              fileId={portraitOfName(rel.character)}
              name={names.label('character', rel.character)}
              className="w-8 h-8"
              textClassName="text-sm font-medium"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text">
                {names.label('character', rel.character)}
              </div>
              <div className="text-xs text-text-muted">
                {typeLabel(rel.relationship_type)}
                {rel.start_time != null ? ` (from ${rel.start_time})` : ''}
                {rel.end_time != null ? ` to ${rel.end_time}` : ''}
              </div>
            </div>
            {rel.description ? (
              <div className="text-xs text-text-light max-w-48 truncate">{rel.description}</div>
            ) : null}
            <button
              onClick={() => save(relationships.filter((_, j) => j !== i))}
              disabled={updateDoc.isPending}
              title={t('characters.remove_relationship')}
              className="text-text-light hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!relationships.length && !adding ? (
          <p className="text-sm text-text-muted">{t('characters.no_relationships')}</p>
        ) : null}
      </div>

      {adding && (
        <div className="mt-3 flex flex-wrap items-center gap-2 p-2 rounded border border-primary/20 bg-primary/5">
          <select
            value={draft.character}
            onChange={(e) => setDraft({ ...draft, character: e.target.value })}
            className={selectClass}
          >
            <option value="">{t('characters.pick_character')}</option>
            {characterTerms
              .filter((tm) => !names.same('character', tm.value, characterValue))
              .map((tm) => (
                <option key={tm.value} value={tm.value}>{tm.label || tm.value}</option>
              ))}
          </select>
          <select
            value={draft.relationship_type}
            onChange={(e) => setDraft({ ...draft, relationship_type: e.target.value })}
            className={selectClass}
          >
            <option value="">{t('characters.pick_relationship_type')}</option>
            {(typeTerms?.items ?? []).map((tm) => (
              <option key={tm.value} value={tm.value}>{tm.label || tm.value}</option>
            ))}
          </select>
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder={t('characters.relationship_description')}
            className="flex-1 min-w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleAdd}
            disabled={!draft.character || !draft.relationship_type || updateDoc.isPending}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {t('characters.add_confirm')}
          </button>
          <button
            onClick={() => { setAdding(false); setError(null) }}
            className="px-3 py-1.5 text-sm text-text-muted hover:text-text"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
    </div>
  )
}

export default function CharactersPage() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteDoc = useDeleteDocument()
  const portraitOfName = usePortraitOf()
  const names = useEntityNames()
  const merge = useMergeSelection()
  const [merging, setMerging] = useState(false)

  const { data: characters, isLoading } = useDocuments({
    template_id: TEMPLATES.CHARACTER,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })

  const selected = characters?.items?.find((c) => c.document_id === selectedId)
  const selectedData = selected?.data as unknown as CharacterData | undefined

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('characters.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <BackLink />
      {selectedData ? (
        <>
          <CharacterDetail
            documentId={selectedId!}
            data={selectedData}
            onBack={() => setSelectedId(null)}
            onEdit={() => setEditData(selectedData as unknown as Record<string, unknown>)}
            onDelete={() => setConfirmDelete(true)}
          />
          {confirmDelete ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-text mb-2">{t('characters.delete_title')}</h3>
                <p className="text-sm text-text-muted mb-4" dangerouslySetInnerHTML={{ __html: t('characters.delete_confirm', { name: names.label('character', selectedData.name) }) }} />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => deleteDoc.mutate({ id: selectedId! }, { onSuccess: () => { setConfirmDelete(false); setSelectedId(null) } })}
                    disabled={deleteDoc.isPending}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteDoc.isPending ? t('common.deleting') : t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {editData ? (
            <CreateEntityModal
              entityType="character"
              mode="edit"
              existingData={editData}
              documentId={selectedId ?? undefined}
              onClose={() => setEditData(null)}
              onCreated={() => setEditData(null)}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-text">{t('characters.title')}</h1>
            <span className="text-sm text-text-muted">({characters?.total ?? 0})</span>
            <div className="ml-auto">
              <MergeToolbar selection={merge} total={characters?.items?.length ?? 0} onMerge={() => setMerging(true)} />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('characters.new')}
            </button>
          </div>

          {characters?.items?.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.items.map((ch) => (
                <CharacterCard
                  key={ch.document_id}
                  data={ch.data as unknown as CharacterData}
                  displayName={names.label('character', (ch.data as { name?: string }).name)}
                  portrait={portraitOfName((ch.data as { name?: string }).name)}
                  selected={merge.isSelected(ch.document_id)}
                  onClick={() => (merge.active ? merge.toggle(ch.document_id) : setSelectedId(ch.document_id))}
                />
              ))}
            </div>
          ) : (
            <p className="text-text-muted">{t('characters.empty')}</p>
          )}

          {showCreate ? (
            <CreateEntityModal
              entityType="character"
              onClose={() => setShowCreate(false)}
            />
          ) : null}

          {merging ? (
            <MergeEntitiesDialog
              kind="character"
              candidates={merge.selected.map((id) => ({
                documentId: id,
                name: names.label('character', (characters?.items?.find((c) => c.document_id === id)?.data as { name?: string } | undefined)?.name ?? id),
              }))}
              onClose={() => setMerging(false)}
              onMerged={() => { setMerging(false); merge.cancel() }}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
