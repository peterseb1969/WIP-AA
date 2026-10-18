import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDocuments } from '@wip/react'
import { Images, Upload, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { fileUrl, useMediaLibrary, useMediaUsage, type Usage } from '../lib/media'
import { EditDialog, Lightbox, MAX_BYTES } from '../components/MediaSection'
import BackLink from '../components/BackLink'

interface MediaDoc {
  document_id: string
  data: { file: string; title: string; caption?: string }
}

/** Where an attached entity lives in the app, by its template. */
const ENTITY_PAGES: Record<string, (id: string) => string> = {
  [TEMPLATES.EVENT]: (id) => `/scenes?id=${id}`,
  [TEMPLATES.CHARACTER]: () => '/characters',
  [TEMPLATES.LOCATION]: () => '/locations',
  [TEMPLATES.PLOT_THREAD]: () => '/plot-threads',
  [TEMPLATES.CHAPTER]: () => '/chapters',
  [TEMPLATES.NOTE]: () => '/notes',
  [TEMPLATES.WORLD_RULE]: () => '/world-rules',
}

/**
 * Every image in the book: where each is attached, edit title and caption,
 * add images without attaching them, and delete one for good.
 */
export default function MediaLibraryPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useDocuments({ template_id: TEMPLATES.MEDIA, status: 'active', page_size: 500, namespace: NAMESPACE })
  const media = (data?.items ?? []) as unknown as MediaDoc[]
  const library = useMediaLibrary()
  const [onlyUnattached, setOnlyUnattached] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [editing, setEditing] = useState<MediaDoc | null>(null)
  const [deleting, setDeleting] = useState<{ media: MediaDoc; usage: Usage[] } | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = async (files: File[]) => {
    setError(null)
    const problems: string[] = []
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length < files.length) problems.push(t('media.only_images'))
    for (const file of images) {
      if (file.size > MAX_BYTES) {
        problems.push(t('media.too_large', { name: file.name }))
        continue
      }
      setPending((p) => [...p, file.name])
      try {
        await library.upload(file)
      } catch (err) {
        problems.push(t('media.upload_failed', { name: file.name, message: err instanceof Error ? err.message : String(err) }))
      } finally {
        setPending((p) => p.filter((n) => n !== file.name))
      }
    }
    if (problems.length) setError(problems.join(' '))
  }

  return (
    <div
      className="p-6 min-h-full"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragOver(false)
        addFiles([...e.dataTransfer.files])
      }}
    >
      <BackLink />
      <div className="flex items-center gap-3 mb-2">
        <Images className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('media.library_title')}</h1>
        <span className="text-sm text-text-muted">({media.length})</span>
        <button
          onClick={() => inputRef.current?.click()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Upload className="w-4 h-4" />
          {t('media.add')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            if (files.length) addFiles(files)
          }}
        />
      </div>
      <p className="text-sm text-text-muted mb-4">{t('media.library_hint')}</p>

      <div className="flex items-center gap-2 mb-4">
        {[false, true].map((only) => (
          <button
            key={String(only)}
            onClick={() => setOnlyUnattached(only)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              onlyUnattached === only ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200'
            }`}
          >
            {only ? t('media.filter_unattached') : t('media.filter_all')}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      ) : null}

      {media.length || pending.length ? (
        <div className={`grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 rounded-lg ${dragOver ? 'ring-2 ring-primary ring-offset-4' : ''}`}>
          {media.map((m, i) => (
            <MediaCard
              key={m.document_id}
              media={m}
              hideIfAttached={onlyUnattached}
              onView={() => setViewing(i)}
              onEdit={() => setEditing(m)}
              onDelete={(usage) => setDeleting({ media: m, usage })}
            />
          ))}
          {pending.map((name) => (
            <div key={name} className="aspect-[4/3] rounded-lg bg-surface border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 p-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-xs text-text-muted truncate max-w-full">{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted">{isLoading ? t('media.loading') : t('media.library_empty')}</p>
      )}

      {viewing !== null && media.length ? (
        <Lightbox
          items={media.map((m) => ({ fileId: m.data.file, title: m.data.title, caption: m.data.caption }))}
          index={Math.min(viewing, media.length - 1)}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
      {editing ? (
        <EditDialog
          fileId={editing.data.file}
          title={editing.data.title}
          caption={editing.data.caption}
          onClose={() => setEditing(null)}
          onSave={(fields) => library.editMedia(editing.document_id, fields)}
        />
      ) : null}
      {deleting ? (
        <DeleteDialog
          media={deleting.media}
          usage={deleting.usage}
          onClose={() => setDeleting(null)}
          onConfirm={() => library.deletePermanently(
            deleting.media.document_id,
            deleting.media.data.file,
            deleting.usage.map((u) => u.edgeId),
          )}
        />
      ) : null}
    </div>
  )
}

function MediaCard({ media, hideIfAttached, onView, onEdit, onDelete }: {
  media: MediaDoc
  hideIfAttached: boolean
  onView: () => void
  onEdit: () => void
  onDelete: (usage: Usage[]) => void
}) {
  const { t } = useTranslation()
  const { usage, isLoading } = useMediaUsage(media.document_id)
  if (hideIfAttached && (isLoading || usage.length)) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <button onClick={onView} className="block aspect-[4/3] bg-surface">
        <img src={fileUrl(media.data.file)} alt={media.data.title} loading="lazy" className="w-full h-full object-cover" />
      </button>
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start gap-1">
          <div className="font-medium text-sm text-text flex-1 min-w-0 truncate" title={media.data.title}>{media.data.title}</div>
          <button onClick={onEdit} className="p-1 text-text-muted hover:text-primary" title={t('media.edit')}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(usage)} disabled={isLoading} className="p-1 text-text-muted hover:text-red-600 disabled:opacity-40" title={t('media.delete')}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {media.data.caption ? <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{media.data.caption}</p> : null}
        <div className="mt-2 flex flex-wrap gap-1">
          {usage.length ? usage.map((u) => (
            <Link
              key={u.edgeId}
              to={(ENTITY_PAGES[u.entityTemplate] ?? (() => '/'))(u.entityId)}
              className="px-1.5 py-0.5 rounded bg-surface text-[11px] text-text hover:text-primary hover:bg-primary/5 transition-colors"
              title={t(`media.role.${u.role}`)}
            >
              {u.entityName || t('common.untitled')}
            </Link>
          )) : (
            <span className="text-[11px] text-text-light italic">{isLoading ? '…' : t('media.not_attached')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteDialog({ media, usage, onClose, onConfirm }: {
  media: MediaDoc
  usage: Usage[]
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={busy ? undefined : onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 mb-4">
          <img src={fileUrl(media.data.file)} alt="" className="w-20 h-20 object-cover rounded border border-gray-100 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-text mb-1">{t('media.delete_title', { title: media.data.title })}</h3>
            <p className="text-sm text-text-muted">{t('media.delete_body')}</p>
          </div>
        </div>
        {usage.length ? (
          <div className="mb-4">
            <div className="text-xs font-medium text-text-muted mb-1">{t('media.delete_usage', { count: usage.length })}</div>
            <div className="flex flex-wrap gap-1">
              {usage.map((u) => (
                <span key={u.edgeId} className="px-1.5 py-0.5 rounded bg-surface text-xs text-text">{u.entityName || t('common.untitled')}</span>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button onClick={confirm} disabled={busy} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
            {busy ? t('common.deleting') : t('media.delete_confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
