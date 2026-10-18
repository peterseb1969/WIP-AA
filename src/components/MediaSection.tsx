import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments } from '@wip/react'
import { Image as ImageIcon, Upload, Library, Pencil, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import { useAttachments, useMediaEditor, fileUrl, portraitOf, MEDIA_ROLES, type Attachment, type MediaRole } from '../lib/media'

/** The AA_MEDIA template allows 25 MB per file. */
const MAX_BYTES = 25 * 1024 * 1024

/**
 * Images attached to an entity: a thumbnail grid with a lightbox, upload
 * (button or dropping files onto the section), attaching images already in
 * the book, and editing title, caption and role. `compact` is the narrow
 * variant for the scene editor's side panel.
 */
export default function MediaSection({ entityId, kind, compact = false }: {
  entityId: string
  /** Characters get their first image as the portrait. */
  kind: 'character' | 'location' | 'scene' | 'plot_thread'
  compact?: boolean
}) {
  const { t } = useTranslation()
  const { attachments, isLoading } = useAttachments(entityId)
  const editor = useMediaEditor(entityId)
  const [pending, setPending] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [viewing, setViewing] = useState<number | null>(null)
  const [editing, setEditing] = useState<Attachment | null>(null)
  const [picking, setPicking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const nextOrder = () => attachments.reduce((max, a) => Math.max(max, a.sortOrder), -1) + 1
  const defaultRole = (): MediaRole =>
    kind === 'character' && !portraitOf(attachments) ? 'PORTRAIT' : 'ILLUSTRATION'

  const addFiles = async (files: File[]) => {
    setError(null)
    const images = files.filter((f) => f.type.startsWith('image/'))
    const problems: string[] = []
    if (images.length < files.length) problems.push(t('media.only_images'))
    let order = nextOrder()
    let role = defaultRole()
    for (const file of images) {
      if (file.size > MAX_BYTES) {
        problems.push(t('media.too_large', { name: file.name }))
        continue
      }
      setPending((p) => [...p, file.name])
      try {
        await editor.upload(file, role, order++)
        role = 'ILLUSTRATION' // only the first new image becomes the portrait
      } catch (err) {
        problems.push(t('media.upload_failed', { name: file.name, message: err instanceof Error ? err.message : String(err) }))
      } finally {
        setPending((p) => p.filter((n) => n !== file.name))
      }
    }
    if (problems.length) setError(problems.join(' '))
  }

  const run = (action: Promise<unknown>) =>
    action.catch((err) => setError(err instanceof Error ? err.message : String(err)))

  return (
    <div
      className={`bg-white rounded-lg border ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-200'} ${compact ? 'p-3' : 'p-4 mb-6'}`}
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
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-medium text-sm text-primary flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {t('media.title')}
        </h3>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setPicking(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary rounded transition-colors"
            title={t('media.from_book_title')}
          >
            <Library className="w-3.5 h-3.5" />
            {compact ? null : t('media.from_book')}
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-primary text-primary rounded hover:bg-primary/5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
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
      </div>

      {error ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
        </div>
      ) : null}

      {attachments.length || pending.length ? (
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'}`}>
          {attachments.map((a, i) => (
            <figure key={a.edgeId} className="group relative">
              <button
                onClick={() => setViewing(i)}
                className="block w-full aspect-square rounded-lg overflow-hidden bg-surface border border-gray-100 hover:border-primary/40 transition-colors"
              >
                <img src={fileUrl(a.fileId)} alt={a.title} loading="lazy" className="w-full h-full object-cover" />
              </button>
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/55 text-white text-[10px] font-medium">
                {t(`media.role.${a.role}`)}
              </span>
              <button
                onClick={() => setEditing(a)}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-white/90 text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                title={t('media.edit')}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <figcaption className="mt-1 text-xs text-text truncate" title={a.caption || a.title}>{a.title}</figcaption>
            </figure>
          ))}
          {pending.map((name) => (
            <div key={name} className="aspect-square rounded-lg bg-surface border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 p-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-[10px] text-text-muted truncate max-w-full">{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{isLoading ? t('media.loading') : t('media.empty')}</p>
      )}

      {viewing !== null && attachments.length ? (
        <Lightbox items={attachments} index={Math.min(viewing, attachments.length - 1)} onIndex={setViewing} onClose={() => setViewing(null)} />
      ) : null}
      {editing ? (
        <EditDialog
          attachment={editing}
          onClose={() => setEditing(null)}
          onSave={async (fields, role) => {
            if (fields.title !== editing.title || fields.caption !== (editing.caption ?? '')) await editor.editMedia(editing.mediaId, fields)
            if (role !== editing.role) await editor.setRole(editing.edgeId, role)
          }}
          onDetach={() => editor.detach(editing.edgeId)}
        />
      ) : null}
      {picking ? (
        <PickDialog
          attachedMediaIds={new Set(attachments.map((a) => a.mediaId))}
          onClose={() => setPicking(false)}
          onPick={(mediaId) => {
            setPicking(false)
            run(editor.attach(mediaId, defaultRole(), nextOrder()))
          }}
        />
      ) : null}
    </div>
  )
}

/** Full-size view; arrow keys / buttons step through, Escape or a click on the backdrop closes. */
function Lightbox({ items, index, onIndex, onClose }: {
  items: Attachment[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const item = items[index]!
  const step = (d: number) => onIndex((index + d + items.length) % items.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white" title={t('common.close')}>
        <X className="w-6 h-6" />
      </button>
      {items.length > 1 ? (
        <>
          <button onClick={(e) => { e.stopPropagation(); step(-1) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); step(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white">
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      ) : null}
      <img
        src={fileUrl(item.fileId)}
        alt={item.title}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[80vh] object-contain rounded shadow-2xl"
      />
      <div className="mt-4 text-center text-white max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="font-medium">{item.title}</div>
        {item.caption ? <div className="text-sm text-white/75 mt-1">{item.caption}</div> : null}
        <div className="text-xs text-white/50 mt-1">
          {t(`media.role.${item.role}`)}{items.length > 1 ? ` · ${index + 1} / ${items.length}` : ''}
        </div>
      </div>
    </div>
  )
}

function EditDialog({ attachment, onClose, onSave, onDetach }: {
  attachment: Attachment
  onClose: () => void
  onSave: (fields: { title: string; caption: string }, role: MediaRole) => Promise<void>
  onDetach: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(attachment.title)
  const [caption, setCaption] = useState(attachment.caption ?? '')
  const [role, setRole] = useState<MediaRole>(attachment.role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 mb-4">
          <img src={fileUrl(attachment.fileId)} alt="" className="w-24 h-24 object-cover rounded border border-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-text-muted">{t('media.field_title')}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-text-muted">{t('media.field_role')}</span>
              <select value={role} onChange={(e) => setRole(e.target.value as MediaRole)}
                className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-primary">
                {MEDIA_ROLES.map((r) => <option key={r} value={r}>{t(`media.role.${r}`)}</option>)}
              </select>
            </label>
          </div>
        </div>
        <label className="block mb-1">
          <span className="text-xs font-medium text-text-muted">{t('media.field_caption')}</span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3}
            className="mt-1 w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary" />
        </label>
        <p className="text-xs text-text-light mb-4">{t('media.shared_hint')}</p>
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        <div className="flex items-center gap-2">
          <button onClick={() => act(onDetach)} disabled={busy}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
            {t('media.detach')}
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={() => act(() => onSave({ title: title.trim() || attachment.title, caption: caption.trim() }, role))} disabled={busy}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Every image already in the book, to attach one here as well. */
function PickDialog({ attachedMediaIds, onClose, onPick }: {
  attachedMediaIds: Set<string>
  onClose: () => void
  onPick: (mediaId: string) => void
}) {
  const { t } = useTranslation()
  const { data, isLoading } = useDocuments({ template_id: TEMPLATES.MEDIA, status: 'active', page_size: 500, namespace: NAMESPACE })
  const media = (data?.items ?? []) as unknown as Array<{ document_id: string; data: { file: string; title: string } }>

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-text">{t('media.pick_title')}</h3>
          <button onClick={onClose} className="ml-auto p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto">
          {media.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
              {media.map((m) => {
                const attached = attachedMediaIds.has(m.document_id)
                return (
                  <button key={m.document_id} disabled={attached} onClick={() => onPick(m.document_id)}
                    className="text-left disabled:opacity-40 group" title={attached ? t('media.already_attached') : m.data.title}>
                    <div className="aspect-square rounded-lg overflow-hidden bg-surface border border-gray-100 group-enabled:group-hover:border-primary transition-colors">
                      <img src={fileUrl(m.data.file)} alt={m.data.title} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-1 text-xs text-text truncate">{m.data.title}</div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{isLoading ? t('media.loading') : t('media.none_in_book')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * A round avatar: the portrait image when there is one, else the initial.
 * Sizes are Tailwind classes so callers keep their existing dimensions.
 */
export function Avatar({ fileId, name, className, textClassName = '' }: {
  fileId?: string
  name: string
  className: string
  textClassName?: string
}) {
  if (fileId) {
    return <img src={fileUrl(fileId)} alt={name} title={name} className={`${className} rounded-full object-cover flex-shrink-0`} />
  }
  return (
    <div className={`${className} rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 ${textClassName}`} title={name}>
      {name.charAt(0)}
    </div>
  )
}
