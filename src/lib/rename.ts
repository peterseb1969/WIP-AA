import type { WipClient } from '@wip/client'
import { NAMESPACE, TEMPLATES } from './constants'
import { vocabulary, termFor, namesOf, type MergeKind } from './mergeEntities'

/**
 * Renaming without creating a duplicate.
 *
 * Every entity is identified by its name or title, and WIP never edits an
 * identity field — submitting the document under a new name creates a new
 * entity. So a rename takes one of two paths:
 *
 * - Characters, locations and plot threads are named by a vocabulary term,
 *   and WIP identifies their documents by the term's id, not its spelling.
 *   A rename changes the term's LABEL and keeps the old label as an alias:
 *   no document changes, every reference keeps pointing at the same term,
 *   and the UI shows labels (entityNames.ts).
 * - Chapters, scenes, notes and world rules are identified by the title
 *   string itself. A rename creates the document under the new title,
 *   points everything that referenced the old document id at the new one
 *   (the book structure, image attachments), and retires the old document.
 *   Its version history stays with the old document.
 */

/** The new name already belongs to another entry. */
export class NameTakenError extends Error {
  constructor(public readonly owner: string) {
    super(`"${owner}" already has this name`)
  }
}

/** Rename a character, location or plot thread by relabelling its term. */
export async function relabelEntity(wip: WipClient, kind: MergeKind, storedName: string, newLabel: string) {
  const terms = await vocabulary(wip, kind)
  const term = termFor(terms, storedName)
  if (!term) throw new Error(`No name entry for "${storedName}"`)
  const wanted = newLabel.trim()
  if (!wanted || (term.label || term.value) === wanted) return
  const lower = wanted.toLowerCase()
  const owner = terms.find((t) => t.term_id !== term.term_id && namesOf(t).some((n) => n.toLowerCase() === lower))
  if (owner) throw new NameTakenError(owner.label || owner.value)
  // The old label stays findable (scene check, older spellings); the new
  // name is the label, so it is not also an alias.
  const aliases = [...new Set([...(term.aliases ?? []), term.label ?? ''])]
    .filter((a) => a && a !== term.value && a.toLowerCase() !== lower)
  await wip.defStore.updateTerm(term.term_id, { label: wanted, aliases })
}

/** Rename a chapter, scene, note or world rule by copying it under the new title. Returns the new document id. */
export async function renameByCopy(wip: WipClient, opts: {
  template: string
  field: string
  documentId: string
  newTitle: string
  /** The document's data as it should be saved (other edited fields included). */
  data: Record<string, unknown>
}): Promise<string> {
  const { template, field, documentId, newTitle, data } = opts
  const taken = await wip.documents.queryDocuments({
    template_id: template,
    status: 'active',
    filters: [{ field: `data.${field}`, value: newTitle }],
    page_size: 1,
  }, NAMESPACE)
  const other = taken.items?.find((d) => d.document_id !== documentId)
  if (other) throw new NameTakenError(newTitle)

  const created = await wip.documents.createDocument({
    template_id: template,
    namespace: NAMESPACE,
    data: { ...data, [field]: newTitle },
  })
  const newId = created.document_id
  if (!newId) throw new Error('The renamed copy was not created')

  // The book structure lists chapters and scenes by document id.
  const structures = await wip.documents.queryDocuments({ template_id: TEMPLATES.BOOK_STRUCTURE, status: 'active', page_size: 50 }, NAMESPACE)
  for (const doc of structures.items ?? []) {
    const chapters = ((doc.data as { chapters?: Array<{ chapter_id: string; scene_ids?: string[] }> }).chapters ?? [])
    const swap = (id: string) => (id === documentId ? newId : id)
    const next = chapters.map((slot) => ({ ...slot, chapter_id: swap(slot.chapter_id), scene_ids: (slot.scene_ids ?? []).map(swap) }))
    if (JSON.stringify(next) !== JSON.stringify(chapters)) {
      await wip.documents.updateDocument(doc.document_id, { chapters: next })
    }
  }

  // Image attachments point at the document id.
  const edges = await wip.documents.getDocumentRelationships(documentId, {
    direction: 'incoming',
    template: `${NAMESPACE}:${TEMPLATES.ATTACHED_TO}`,
    namespace: NAMESPACE,
    page_size: 500,
  })
  for (const edge of (edges.items ?? []) as unknown as Array<{ document_id: string; data: { source_ref: string; role: string; sort_order?: number } }>) {
    await wip.documents.createDocument({
      template_id: TEMPLATES.ATTACHED_TO,
      namespace: NAMESPACE,
      data: { source_ref: edge.data.source_ref, target_ref: newId, role: edge.data.role, ...(edge.data.sort_order != null ? { sort_order: edge.data.sort_order } : {}) },
    })
    await wip.documents.deleteDocument(edge.document_id)
  }

  await wip.documents.deleteDocument(documentId)
  return newId
}
