import type { WipClient } from '@wip/client'

/**
 * An in-memory stand-in for the parts of WipClient that the merge and rename
 * code use, for unit tests. Documents are keyed by template value; every
 * write is recorded in `calls`, in order. It models only what those modules
 * rely on — status filters, id lookups, incoming AA_ATTACHED_TO edges and
 * the term merge's effect (names to the survivor, absorbed term deprecated) —
 * not WIP's validation, identity hashing or versioning.
 */

export interface FakeTerm {
  term_id: string
  value: string
  label?: string
  aliases?: string[]
  status?: 'active' | 'deprecated'
}

export interface FakeDoc {
  document_id: string
  template: string
  data: Record<string, unknown>
  status?: 'active' | 'inactive'
}

export function fakeWip(init: { terms: FakeTerm[]; docs: FakeDoc[] }) {
  const terms = init.terms.map((t) => ({ status: 'active' as const, aliases: [], ...t }))
  const docs = init.docs.map((d) => ({ status: 'active' as const, ...d }))
  const calls: Array<{ op: string; args: unknown[] }> = []
  let seq = 0
  const record = (op: string, ...args: unknown[]) => calls.push({ op, args })
  const doc = (id: string) => docs.find((d) => d.document_id === id)
  const templateOf = (t: string) => t.replace(/^[^:]+:/, '')

  const client = {
    defStore: {
      async listTerms(_terminology: string, params?: { status?: string }) {
        return { items: terms.filter((t) => !params?.status || t.status === params.status) }
      },
      async updateTerm(termId: string, patch: Partial<FakeTerm>) {
        record('updateTerm', termId, patch)
        Object.assign(terms.find((t) => t.term_id === termId)!, patch)
        return { status: 'updated' }
      },
      async mergeTerms(survivorId: string, absorbedId: string) {
        record('mergeTerms', survivorId, absorbedId)
        const survivor = terms.find((t) => t.term_id === survivorId)!
        const absorbed = terms.find((t) => t.term_id === absorbedId)!
        if (absorbed.status !== 'active') throw new Error(`The absorbed term '${absorbed.value}' is deprecated`)
        // Like WIP: the value and names move, the label does not.
        survivor.aliases = [...new Set([...(survivor.aliases ?? []), absorbed.value, ...(absorbed.aliases ?? [])])]
        absorbed.status = 'deprecated'
        return { status: 'updated' }
      },
    },
    documents: {
      async queryDocuments(q: { template_id: string; status?: string; filters?: Array<{ field: string; value: unknown }> }) {
        const items = docs
          .filter((d) => d.template === templateOf(q.template_id) && (!q.status || d.status === q.status))
          .filter((d) => (q.filters ?? []).every((f) => d.data[f.field.replace(/^data\./, '')] === f.value))
          .map((d) => ({ document_id: d.document_id, template_value: d.template, data: structuredClone(d.data) }))
        return { items, pages: 1, total: items.length }
      },
      async getDocumentRelationships(id: string) {
        const items = docs
          .filter((d) => d.template === 'AA_ATTACHED_TO' && d.status === 'active' && d.data.target_ref === id)
          .map((d) => ({ document_id: d.document_id, data: structuredClone(d.data) }))
        return { items }
      },
      async updateDocument(id: string, patch: Record<string, unknown>) {
        record('updateDocument', id, patch)
        Object.assign(doc(id)!.data, structuredClone(patch))
        return { document_id: id, status: 'updated' }
      },
      async createDocument(req: { template_id: string; data: Record<string, unknown> }) {
        record('createDocument', templateOf(req.template_id), req.data)
        const id = `new-${++seq}`
        docs.push({ document_id: id, template: templateOf(req.template_id), data: structuredClone(req.data), status: 'active' })
        return { document_id: id, status: 'created' }
      },
      async deleteDocument(id: string) {
        record('deleteDocument', id)
        doc(id)!.status = 'inactive'
        return { status: 'deleted' }
      },
    },
  }

  return { client: client as unknown as WipClient, calls, terms, docs, doc }
}
