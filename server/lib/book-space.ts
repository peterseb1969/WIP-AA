/**
 * What a book is, in WIP terms, and the operations on all of it: is it
 * empty, what is in it, delete it.
 *
 * A book is one namespace. The app writes documents of the templates in
 * BOOK_TEMPLATES and names (terms) in NAME_TERMINOLOGIES; the data model
 * itself (templates, vocabularies, the bootstrap record) is not book content
 * and stays, so an emptied book is exactly a freshly bootstrapped one.
 */
import { createWipClient, WipBulkItemError, WipNotFoundError } from '@wip/client'

export interface BookTarget {
  namespace: string
  baseUrl: string
  apiKey: string
}

/** The deployment's book (server env), read per call like the bootstrap. */
export const deploymentBook = (): BookTarget => ({
  namespace: process.env.WIP_NAMESPACE || 'aa',
  baseUrl: process.env.WIP_BASE_URL || 'https://localhost:8443',
  apiKey: process.env.WIP_API_KEY || '',
})

// Deletion runs in this order: attachments before the images and documents
// they connect, images (and their stored files) before the rest.
export const BOOK_TEMPLATES = [
  'AA_ATTACHED_TO', 'AA_MEDIA',
  'AA_PROJECT', 'AA_BOOK_STRUCTURE', 'AA_CHAPTER', 'AA_EVENT', 'AA_CHARACTER', 'AA_LOCATION',
  'AA_PLOT_THREAD', 'AA_NOTE', 'AA_WORLD_RULE', 'AA_PROMPT',
] as const
export const NAME_TERMINOLOGIES = ['AA_CHARACTERS', 'AA_LOCATIONS', 'AA_PLOT_THREADS'] as const

export function bookClient(t: BookTarget) {
  async function call(method: string, path: string, body?: unknown) {
    const res = await fetch(`${t.baseUrl}${path}`, {
      method,
      headers: { 'X-API-Key': t.apiKey, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    let json: unknown
    try { json = JSON.parse(text) } catch { json = text }
    return { status: res.status, json }
  }

  /** Bulk writes answer 200 even when an item failed: check every item. */
  async function bulk(path: string, items: unknown[]) {
    const { status, json } = await call('POST', path, items)
    const results = (json as { results?: Array<{ status: string; error?: string; document_id?: string; id?: string }> }).results
    if (status !== 200 || !results) throw new Error(`${path}: HTTP ${status} ${JSON.stringify(json).slice(0, 300)}`)
    const failed = results.filter((r) => r.status === 'error')
    if (failed.length) throw new Error(`${path}: ${failed.map((r) => r.error).join('; ')}`)
    return results
  }

  async function create(template: string, items: Array<Record<string, unknown>>) {
    try {
      const results = await bulk('/api/document-store/documents', items.map((data) => ({ template_id: `${t.namespace}:${template}`, namespace: t.namespace, data })))
      return results.map((r) => r.document_id!)
    } catch (err) {
      throw new Error(`${template}: ${err instanceof Error ? err.message : err}`)
    }
  }

  /** Documents of one template in one status (active by default), up to `limit`. */
  async function active(template: string, limit = 100, docStatus: 'active' | 'inactive' | 'archived' = 'active') {
    const { status, json } = await call('POST', '/api/document-store/documents/query', { template_id: `${t.namespace}:${template}`, status: docStatus, page_size: limit })
    if (status !== 200) throw new Error(`reading ${template}: HTTP ${status}`)
    return ((json as { items?: Array<{ document_id: string; data: Record<string, unknown> }> }).items ?? [])
  }

  /** Terms of one name vocabulary (all statuses), up to `limit`. */
  async function names(terminology: string, limit = 100) {
    const { status, json } = await call('GET', `/api/def-store/terminologies/${t.namespace}:${terminology}/terms?namespace=${t.namespace}&page_size=${limit}`)
    if (status !== 200) throw new Error(`reading ${terminology}: HTTP ${status}`)
    return ((json as { items?: Array<{ term_id: string }> }).items ?? [])
  }

  return { call, bulk, create, active, names }
}

/** True when the book has no documents and no names. */
export async function bookIsEmpty(t: BookTarget): Promise<boolean> {
  const c = bookClient(t)
  for (const template of BOOK_TEMPLATES) if ((await c.active(template, 1)).length) return false
  for (const terminology of NAME_TERMINOLOGIES) if ((await c.names(terminology, 1)).length) return false
  return true
}

/**
 * The namespace's deletion mode. "Delete book" needs `full`: in WIP (as of
 * 2026-10-22), a document that was only retired keeps its identity, and once
 * its name was deleted and created again, a new document with that name is
 * refused ("Composite key already registered"), so the book could not be
 * imported or loaded again. Hard-deleting documents and names avoids it, and
 * only `full` allows hard deletes.
 */
export async function deletionMode(t: BookTarget): Promise<string> {
  const { status, json } = await bookClient(t).call('GET', '/api/registry/namespaces')
  if (status !== 200) throw new Error(`reading namespaces: HTTP ${status}`)
  const ns = (json as Array<{ prefix: string; deletion_mode?: string }>).find((n) => n.prefix === t.namespace)
  if (!ns) throw new Error(`namespace ${t.namespace} not found`)
  return ns.deletion_mode ?? 'retain'
}

export interface BookContents {
  title: string | null
  counts: Record<string, number>
  /** False when the namespace's deletion mode does not allow deleting the book. */
  deletable: boolean
}

/** What a delete would remove: counts per kind, and the book's title. */
export async function bookContents(t: BookTarget): Promise<BookContents> {
  const c = bookClient(t)
  const count = async (template: string) => (await c.active(template, 1000)).length
  const [project] = await c.active('AA_PROJECT', 1)
  const [structure] = project ? [] : await c.active('AA_BOOK_STRUCTURE', 1)
  let nameCount = 0
  for (const terminology of NAME_TERMINOLOGIES) nameCount += (await c.names(terminology, 1000)).length
  return {
    deletable: (await deletionMode(t)) === 'full',
    title: (project?.data.title as string | undefined) ?? (structure?.data.book_title as string | undefined) ?? null,
    counts: {
      chapters: await count('AA_CHAPTER'),
      scenes: await count('AA_EVENT'),
      characters: await count('AA_CHARACTER'),
      locations: await count('AA_LOCATION'),
      plot_threads: await count('AA_PLOT_THREAD'),
      notes: await count('AA_NOTE'),
      world_rules: await count('AA_WORLD_RULE'),
      images: await count('AA_MEDIA'),
      prompts: await count('AA_PROMPT'),
      names: nameCount,
    },
  }
}

/**
 * Deletes the whole book for good: every document of BOOK_TEMPLATES (also
 * ones an earlier soft delete left retired), the stored image files and all
 * names, so the book is exactly a freshly bootstrapped one and a new import
 * or the demo starts clean. Needs deletion_mode `full` (see deletionMode).
 * Fails loudly on the first error and checks at the end that the book is
 * empty.
 */
/** A 404, or a bulk item that failed because the entity does not exist. */
function isNotFound(err: unknown) {
  return err instanceof WipNotFoundError
    || (err instanceof WipBulkItemError && (err.errorCode === 'not_found' || /not found/i.test(err.message)))
}

export async function deleteBook(t: BookTarget) {
  if ((await deletionMode(t)) !== 'full') {
    throw new Error(`Deleting a book needs the namespace "${t.namespace}" in deletion mode "full"; it is "retain". An administrator can switch it in WIP.`)
  }
  const c = bookClient(t)
  const wip = createWipClient({ baseUrl: t.baseUrl, auth: { type: 'api-key', key: t.apiKey } })
  let documents = 0
  let files = 0
  let names = 0

  for (const template of BOOK_TEMPLATES) {
    for (const docStatus of ['active', 'inactive', 'archived'] as const) {
      for (let round = 0; ; round++) {
        const batch = await c.active(template, 100, docStatus)
        if (!batch.length) break
        if (round > 1000) throw new Error(`${template}: documents keep coming back`)
        const res = await wip.documents.deleteDocuments(batch.map((d) => d.document_id), { hardDelete: true })
        const failed = res.results.filter((r) => r.status === 'error')
        if (failed.length) throw new Error(`deleting ${template}: ${failed.map((r) => r.error).join('; ')}`)
        documents += batch.length
        if (template === 'AA_MEDIA') {
          for (const media of batch) {
            const fileId = media.data.file as string | undefined
            if (!fileId) continue
            try {
              await wip.files.deleteFile(fileId)
              await wip.files.hardDeleteFile(fileId)
              files++
            } catch (err) {
              // Already gone: an earlier delete got that far, or WIP removed
              // the file with its document. Either way there is nothing left
              // to erase (the e2e test checks every file answers 404 after).
              if (!isNotFound(err)) throw err
            }
          }
        }
      }
    }
  }

  for (const terminology of NAME_TERMINOLOGIES) {
    for (let round = 0; ; round++) {
      const batch = await c.names(terminology, 100)
      if (!batch.length) break
      if (round > 1000) throw new Error(`${terminology}: names keep coming back`)
      for (const term of batch) {
        const r = await wip.defStore.deleteTerm(term.term_id, { hardDelete: true, namespace: t.namespace })
        if (r.status === 'error') throw new Error(`deleting a name in ${terminology}: ${r.error}`)
        names++
      }
    }
  }

  if (!(await bookIsEmpty(t))) throw new Error('The book still has content after deleting it.')
  return { documents, files, names }
}
