import { useMemo } from 'react'
import { useDocumentRelationships, useReportQuery, useWipClient, wipKeys } from '@wip/react'
import type { WipClient } from '@wip/client'
import { useQueryClient } from '@tanstack/react-query'
import { NAMESPACE, TEMPLATES } from './constants'

/**
 * Media attachments: one AA_MEDIA document per stored file, attached to an
 * entity (character, location, scene, plot thread, …) by an AA_ATTACHED_TO
 * edge whose source is the media and whose target is the entity. The edge
 * carries the role (AA_MEDIA_ROLE) and the order; the same media can be
 * attached to several entities with different roles.
 */

export type MediaRole = 'PORTRAIT' | 'ILLUSTRATION' | 'MAP' | 'REFERENCE' | 'OTHER'
export const MEDIA_ROLES: MediaRole[] = ['PORTRAIT', 'ILLUSTRATION', 'MAP', 'REFERENCE', 'OTHER']

export interface Attachment {
  /** The AA_ATTACHED_TO edge document. */
  edgeId: string
  role: MediaRole
  sortOrder: number
  mediaId: string
  fileId: string
  title: string
  caption?: string
}

/**
 * URL of a stored file, served through the app's WIP proxy — stable, so it
 * works directly as an <img>/<audio> src (no expiring presigned URL, and the
 * storage backend's address never reaches the browser).
 */
export function fileUrl(fileId: string) {
  return `${import.meta.env.BASE_URL}wip/files/${fileId}/content`
}

/**
 * The relationships endpoint's `template` filter, namespace-qualified. A bare
 * value is not resolved in the `namespace` passed alongside it: with
 * AA_ATTACHED_TO in two namespaces (aa and a scratch copy) a bare value
 * matched the other namespace's edge type and returned nothing.
 */
const attachedToFilter = () => `${NAMESPACE}:${TEMPLATES.ATTACHED_TO}`

/** Media attached to one entity, in display order. */
export function useAttachments(entityId: string | undefined) {
  const query = useDocumentRelationships(entityId ?? '', {
    direction: 'incoming',
    template: attachedToFilter(),
    include: 'peers',
    namespace: NAMESPACE,
    page_size: 200,
  })
  const attachments = useMemo<Attachment[]>(() => {
    const items = (query.data?.items ?? []) as Array<{
      document_id: string
      data: { role?: string; sort_order?: number; source_ref?: string }
      peer?: { document_id: string; status: string; data: { file?: string; title?: string; caption?: string } } | null
    }>
    return items
      .filter((it) => it.peer && it.peer.status === 'active' && it.peer.data.file)
      .map((it, i) => ({
        edgeId: it.document_id,
        role: (it.data.role ?? 'OTHER') as MediaRole,
        sortOrder: it.data.sort_order ?? i,
        mediaId: it.peer!.document_id,
        fileId: it.peer!.data.file!,
        title: it.peer!.data.title ?? '',
        caption: it.peer!.data.caption,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [query.data])
  return { attachments, isLoading: query.isLoading, error: query.error }
}

/** The portrait to show for an entity: its first PORTRAIT attachment. */
export function portraitOf(attachments: Attachment[]) {
  return attachments.find((a) => a.role === 'PORTRAIT')
}

/**
 * Portraits of all characters by name, from the reporting layer (one query
 * for the whole book, for avatars in lists). Reporting syncs within seconds,
 * so a just-attached portrait may take a moment to appear here; detail views
 * use useAttachments, which is immediate. Until the book has any attachment
 * the tables don't exist and the query fails — that just means "none".
 */
export function useCharacterPortraits() {
  const sql = `SELECT c.name, m.data_json->>'file' AS file_id
    FROM doc_aa_attached_to a
    JOIN doc_aa_media m ON m.document_id = a.source_ref AND m.status = 'active'
    JOIN doc_aa_character c ON c.document_id = a.target_ref AND c.status = 'active'
    WHERE a.status = 'active' AND a.role = 'PORTRAIT'
    ORDER BY a.sort_order NULLS LAST`
  const { data } = useReportQuery(sql, [], {
    namespace: NAMESPACE,
    retry: false,
    // The hook's option type wrongly requires queryKey; this is the key it builds itself.
    queryKey: wipKeys.reporting.query(sql, [], NAMESPACE),
  })
  return useMemo(() => {
    const map = new Map<string, string>()
    for (const row of (data?.rows ?? []) as Array<{ name: string; file_id: string }>) {
      // Keyed case-insensitively: scenes and lists spell names inconsistently.
      const key = row.name.toLowerCase()
      if (!map.has(key)) map.set(key, row.file_id)
    }
    return map
  }, [data])
}

/**
 * Store a file in WIP. Not wip.files.uploadFile: @wip/client sends every
 * request with fetch's `keepalive: true`, and browsers refuse keepalive
 * bodies over 64 KB ("Failed to fetch"), so any real photo would fail.
 * Same endpoint and form fields; the server-side proxy adds the API key.
 */
async function storeFile(file: File): Promise<{ file_id: string }> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('namespace', NAMESPACE)
  const res = await fetch(`${import.meta.env.BASE_URL}wip/api/document-store/files`, { method: 'POST', body: form })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${res.status} ${detail.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * Store a file and return its AA_MEDIA document. WIP stores identical
 * content once (same file_id), and AA_MEDIA's identity is the file, so an
 * image that is already in the book is reused — with its title and caption —
 * rather than created again. (One that was deleted permanently comes back
 * as its old media document, under the new file name.)
 */
async function storeMedia(wip: WipClient, file: File) {
  const stored = await storeFile(file)
  const existing = await wip.documents.queryDocuments({
    template_id: TEMPLATES.MEDIA,
    status: 'active',
    filters: [{ field: 'data.file', value: stored.file_id }],
    page_size: 1,
  }, NAMESPACE)
  const found = existing.items?.[0]?.document_id
  if (found) return found
  const created = await wip.documents.createDocument({
    template_id: TEMPLATES.MEDIA,
    namespace: NAMESPACE,
    data: { file: stored.file_id, title: file.name.replace(/\.[^.]+$/, '') },
  })
  if (!created.document_id) throw new Error(`Could not store ${file.name}`)
  return created.document_id
}

/** Writes for attachments; every one refreshes the entity's attachment list. */
export function useMediaEditor(entityId: string) {
  const wip = useWipClient()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })

  /** Upload a file and attach it here. */
  const upload = async (file: File, role: MediaRole, sortOrder: number) => {
    await attach(await storeMedia(wip, file), role, sortOrder)
  }

  /** Attach an existing media document (no-op if it already is). */
  const attach = async (mediaId: string, role: MediaRole, sortOrder: number) => {
    await wip.documents.createDocument({
      template_id: TEMPLATES.ATTACHED_TO,
      namespace: NAMESPACE,
      data: { source_ref: mediaId, target_ref: entityId, role, sort_order: sortOrder },
    })
    await refresh()
  }

  /** Remove the attachment only; the media and its file stay in the book. */
  const detach = async (edgeId: string) => {
    await wip.documents.deleteDocument(edgeId)
    await refresh()
  }

  const setRole = async (edgeId: string, role: MediaRole) => {
    await wip.documents.updateDocument(edgeId, { role })
    await refresh()
  }

  const editMedia = useEditMedia()

  return { upload, attach, detach, setRole, editMedia }
}

/** Title and caption belong to the media, so they show wherever it is attached. */
function useEditMedia() {
  const wip = useWipClient()
  const queryClient = useQueryClient()
  return async (mediaId: string, fields: { title: string; caption: string }) => {
    await wip.documents.updateDocument(mediaId, { title: fields.title, caption: fields.caption || null })
    await queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })
  }
}

/** Where a media item is attached: one entry per AA_ATTACHED_TO edge. */
export interface Usage {
  edgeId: string
  role: MediaRole
  entityId: string
  /** Template value of the entity, e.g. AA_CHARACTER. */
  entityTemplate: string
  /** The entity's name or title (its identity field). */
  entityName: string
}

export function useMediaUsage(mediaId: string) {
  const query = useDocumentRelationships(mediaId, {
    direction: 'outgoing',
    template: attachedToFilter(),
    include: 'peers',
    namespace: NAMESPACE,
    page_size: 200,
  })
  const usage = useMemo<Usage[]>(() => {
    const items = (query.data?.items ?? []) as Array<{
      document_id: string
      data: { role?: string; target_ref?: string }
      peer?: { document_id: string; status: string; template_value?: string | null; data: Record<string, unknown> } | null
    }>
    return items
      .filter((it) => it.peer && it.peer.status === 'active')
      .map((it) => ({
        edgeId: it.document_id,
        role: (it.data.role ?? 'OTHER') as MediaRole,
        entityId: it.peer!.document_id,
        entityTemplate: it.peer!.template_value ?? '',
        entityName: String(it.peer!.data.name ?? it.peer!.data.title ?? ''),
      }))
  }, [query.data])
  return { usage, isLoading: query.isLoading }
}

/** Book-wide media operations for the library page. */
export function useMediaLibrary() {
  const wip = useWipClient()
  const queryClient = useQueryClient()
  const editMedia = useEditMedia()

  /** Add files to the book without attaching them anywhere. */
  const upload = async (file: File) => {
    await storeMedia(wip, file)
    await queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })
  }

  /**
   * Delete for good: every attachment, the media document, and the stored
   * file. The file's bytes are erased from storage; WIP refuses that while
   * anything still references the file, so the references go first. The
   * namespace keeps documents (deletion_mode retain), so the media and edge
   * documents are retired, not erased — their history names a file that no
   * longer exists.
   */
  const deletePermanently = async (mediaId: string, fileId: string, edgeIds: string[]) => {
    if (edgeIds.length) {
      // Bulk writes answer 200 with per-item results; a failed item must stop
      // the delete before the file goes.
      const res = await wip.documents.deleteDocuments(edgeIds)
      const failed = res.results.filter((r) => r.status === 'error')
      if (failed.length) throw new Error(failed.map((r) => r.error).join('; '))
    }
    await wip.documents.deleteDocument(mediaId)
    await wip.files.deleteFile(fileId)
    await wip.files.hardDeleteFile(fileId)
    await queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })
  }

  return { upload, editMedia, deletePermanently }
}
