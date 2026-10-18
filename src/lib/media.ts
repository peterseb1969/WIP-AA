import { useMemo } from 'react'
import { useDocumentRelationships, useReportQuery, useWipClient, wipKeys } from '@wip/react'
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

/** Media attached to one entity, in display order. */
export function useAttachments(entityId: string | undefined) {
  const query = useDocumentRelationships(entityId ?? '', {
    direction: 'incoming',
    template: TEMPLATES.ATTACHED_TO,
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

/** Writes for attachments; every one refreshes the entity's attachment list. */
export function useMediaEditor(entityId: string) {
  const wip = useWipClient()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: wipKeys.documents.all })

  /**
   * Upload a file and attach it. WIP stores identical content once (same
   * file_id), and AA_MEDIA's identity is the file, so an image that is
   * already in the book is reused — with its title and caption — rather than
   * created again.
   */
  const upload = async (file: File, role: MediaRole, sortOrder: number) => {
    const stored = await storeFile(file)
    const existing = await wip.documents.queryDocuments({
      template_id: TEMPLATES.MEDIA,
      status: 'active',
      filters: [{ field: 'data.file', value: stored.file_id }],
      page_size: 1,
    }, NAMESPACE)
    let mediaId = existing.items?.[0]?.document_id
    if (!mediaId) {
      const created = await wip.documents.createDocument({
        template_id: TEMPLATES.MEDIA,
        namespace: NAMESPACE,
        data: { file: stored.file_id, title: file.name.replace(/\.[^.]+$/, '') },
      })
      mediaId = created.document_id
    }
    if (!mediaId) throw new Error(`Could not store ${file.name}`)
    await attach(mediaId, role, sortOrder)
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

  /** Title and caption belong to the media, so they show wherever it is attached. */
  const editMedia = async (mediaId: string, fields: { title: string; caption: string }) => {
    await wip.documents.updateDocument(mediaId, { title: fields.title, caption: fields.caption || null })
    await refresh()
  }

  return { upload, attach, detach, setRole, editMedia }
}
