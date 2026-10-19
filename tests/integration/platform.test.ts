import { beforeAll, describe, expect, inject, it } from 'vitest'
import { bulk, wipClient, wipFetch } from './support/wip'

/**
 * WIP behaviours the app's code depends on. Each was probed before it was
 * relied on; if WIP changes one, this file says which assumption broke.
 */

let ns = ''
beforeAll(() => { ns = inject('namespace') })

const termsUrl = () => `/api/def-store/terminologies/${ns}:AA_LOCATIONS/terms?namespace=${ns}`

describe('term merge (used by Merge, src/lib/mergeEntities.ts)', () => {
  let survivor = '', absorbed = ''
  beforeAll(async () => {
    const r = await bulk(termsUrl(), [
      { value: 'PC_HARBOUR', label: 'Old Harbour', aliases: ['Harbour'] },
      { value: 'PC_DOCKS', label: 'The Docks', aliases: ['Docks'] },
    ])
    survivor = r[0]!.id!; absorbed = r[1]!.id!
    await wipClient().defStore.mergeTerms(survivor, absorbed, { namespace: ns })
  })

  it('moves the absorbed value and names to the survivor, but not its label', async () => {
    const { json } = await wipFetch('GET', `/api/def-store/terms/${survivor}?namespace=${ns}`)
    const aliases = (json as { aliases: string[] }).aliases
    expect(aliases).toEqual(expect.arrayContaining(['PC_DOCKS', 'Docks']))
    expect(aliases).not.toContain('The Docks') // the app adds the label itself
  })

  it('leaves the absorbed term deprecated, pointing at the survivor', async () => {
    const { json } = await wipFetch('GET', `/api/def-store/terms/${absorbed}?namespace=${ns}`)
    expect(json).toMatchObject({ status: 'deprecated', replaced_by_term_id: survivor })
  })

  it('lists deprecated terms by default, and hides them with status=active (the app always asks for active)', async () => {
    const all = await wipClient().defStore.listTerms(`${ns}:AA_LOCATIONS`, { page_size: 1000 } as never)
    const active = await wipClient().defStore.listTerms(`${ns}:AA_LOCATIONS`, { page_size: 1000, status: 'active' } as never)
    expect(all.items?.some((t) => t.value === 'PC_DOCKS')).toBe(true)
    expect(active.items?.some((t) => t.value === 'PC_DOCKS')).toBe(false)
  })

  it('resolves the absorbed name to the survivor on new writes', async () => {
    const [doc] = await bulk('/api/document-store/documents', [{ template_id: `${ns}:AA_NOTE`, namespace: ns, data: { title: 'PC note', note_type: 'IDEA', content: 'x', linked_locations: ['Docks'] } }])
    const { json } = await wipFetch('GET', `/api/document-store/documents/${doc!.document_id}`)
    const refs = (json as { term_references: Array<{ field_path: string; term_id: string }> }).term_references
    expect(refs.find((r) => r.field_path.startsWith('linked_locations'))?.term_id).toBe(survivor)
  })

  it('does not resolve a term by its label alone, only by value and names (so the app adds labels as names)', async () => {
    await bulk(termsUrl(), [{ value: 'PC_LIGHTHOUSE', label: 'North Light' }])
    const { json } = await wipFetch('POST', '/api/document-store/documents', [{ template_id: `${ns}:AA_NOTE`, namespace: ns, data: { title: 'PC label', note_type: 'IDEA', content: 'x', linked_locations: ['North Light'] } }])
    expect((json as { results: Array<{ status: string; error: string }> }).results[0]).toMatchObject({ status: 'error' })
  })

  it('refuses to merge a term that is already deprecated (a re-run must skip it)', async () => {
    await expect(wipClient().defStore.mergeTerms(survivor, absorbed, { namespace: ns })).rejects.toThrow(/deprecated/)
  })
})

describe('files and edge types (used by images, src/lib/media.ts)', () => {
  it('stores identical bytes once: the same file id, so one AA_MEDIA document per image', async () => {
    const bytes = new Uint8Array(70 * 1024).map((_, i) => (i * 31) % 251) // over 64 KB on purpose
    const wip = wipClient()
    const a = await wip.files.uploadFile(new Blob([bytes], { type: 'image/png' }), 'one.png', undefined, ns)
    const b = await wip.files.uploadFile(new Blob([bytes], { type: 'image/png' }), 'two.png', undefined, ns)
    expect(b.file_id).toBe(a.file_id)
  })

  it('filters relationships by `ns:VALUE`, and answers 404 for an edge type the namespace lacks', async () => {
    const [chapter] = await bulk('/api/document-store/documents', [{ template_id: `${ns}:AA_CHAPTER`, namespace: ns, data: { title: 'PC chapter' } }])
    const id = chapter!.document_id
    const ok = await wipFetch('GET', `/api/document-store/documents/${id}/relationships?template=${ns}:AA_ATTACHED_TO&namespace=${ns}&direction=incoming`)
    expect(ok.status).toBe(200)
    const missing = await wipFetch('GET', `/api/document-store/documents/${id}/relationships?template=NO_SUCH_EDGE&namespace=${ns}`)
    expect(missing.status).toBe(404)
  })
})
