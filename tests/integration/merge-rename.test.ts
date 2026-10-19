import { beforeAll, describe, expect, inject, it } from 'vitest'
import { setNamespace } from '../../src/lib/constants'
import { executeMerge, planMerge, vocabulary } from '../../src/lib/mergeEntities'
import { relabelEntity, renameByCopy } from '../../src/lib/rename'
import { bulk, wipClient, wipFetch } from './support/wip'

// The app's merge and rename code against real WIP. Fixtures are shaped like
// an imported book: entity documents hold display names, references hold
// term values.

let ns = ''
const doc = async (id: string) => (await wipFetch('GET', `/api/document-store/documents/${id}`)).json as {
  status: string; version: number; data: Record<string, unknown>; term_references: Array<{ field_path: string; term_id: string }>
}
const create = async (template: string, data: Record<string, unknown>) =>
  (await bulk('/api/document-store/documents', [{ template_id: `${ns}:${template}`, namespace: ns, data }]))[0]!.document_id!
const createTerms = (terminology: string, terms: unknown[]) => bulk(`/api/def-store/terminologies/${ns}:${terminology}/terms?namespace=${ns}`, terms)

beforeAll(() => { ns = inject('namespace'); setNamespace(ns) })

describe('merge (Linnie Rowe into Lady Linora Thalyn)', () => {
  const ids = { tLinora: '', tLinnie: '', linora: '', linnie: '', scene: '' }
  beforeAll(async () => {
    const t = await createTerms('AA_CHARACTERS', [
      { value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', aliases: ['Lady Linora Thalyn', 'Linora'] },
      { value: 'LINNIE', label: 'Linnie Rowe', aliases: ['Linnie'] },
    ])
    ids.tLinora = t[0]!.id!; ids.tLinnie = t[1]!.id!
    ids.linora = await create('AA_CHARACTER', { name: 'Lady Linora Thalyn', role: 'SUPPORTING', description: 'Elderly, horned.' })
    ids.linnie = await create('AA_CHARACTER', { name: 'Linnie', role: 'MINOR', backstory: 'Called Linnie by her students.' })
    ids.scene = await create('AA_EVENT', { title: 'Lecture', event_type: 'SCENE', story_time_sort: 1000, summary: 's', characters: ['LINNIE', 'LADY_LINORA_THALYN'], prose: '<p>Linnie spoke.</p>' })
    const wip = wipClient()
    await executeMerge(wip, await planMerge(wip, 'character', ids.linora, [ids.linnie]), () => {})
  })

  it('rewrites references and fills the survivor’s empty fields', async () => {
    expect((await doc(ids.scene)).data.characters).toEqual(['LADY_LINORA_THALYN'])
    const survivor = await doc(ids.linora)
    expect(survivor.data).toMatchObject({ backstory: 'Called Linnie by her students.', description: 'Elderly, horned.' })
  })

  it('retires the absorbed entity and leaves its term deprecated, pointing at the survivor', async () => {
    expect((await doc(ids.linnie)).status).toBe('inactive')
    const { json } = await wipFetch('GET', `/api/def-store/terms/${ids.tLinnie}?namespace=${ns}`)
    expect(json).toMatchObject({ status: 'deprecated', replaced_by_term_id: ids.tLinora })
    expect((await vocabulary(wipClient(), 'character')).some((t) => t.value === 'LINNIE')).toBe(false)
  })

  it('makes every old spelling, label included, resolve to the survivor on new writes', async () => {
    const note = await create('AA_NOTE', { title: 'Merge check', note_type: 'IDEA', content: 'x', linked_characters: ['Linnie Rowe', 'Linnie', 'LINNIE'] })
    const refs = (await doc(note)).term_references.filter((r) => r.field_path.startsWith('linked_characters'))
    // "Linnie Rowe" is only the absorbed label: WIP's term merge does not carry it, the app does.
    expect(refs.map((r) => r.term_id)).toEqual([ids.tLinora, ids.tLinora, ids.tLinora])
  })
})

describe('rename', () => {
  it('relabels a character: label changes, the old label stays an alias, no document changes', async () => {
    const [t] = await createTerms('AA_CHARACTERS', [{ value: 'MARA_VENN', label: 'Mara Venn', aliases: ['Mara Venn'] }])
    const id = await create('AA_CHARACTER', { name: 'Mara Venn', role: 'PROTAGONIST' })
    const before = await doc(id)
    await relabelEntity(wipClient(), 'character', 'Mara Venn', 'Mara Venn-Ashby')
    const { json } = await wipFetch('GET', `/api/def-store/terms/${t!.id}?namespace=${ns}`)
    expect(json).toMatchObject({ label: 'Mara Venn-Ashby' })
    expect((json as { aliases: string[] }).aliases).toContain('Mara Venn')
    expect((await doc(id)).version).toBe(before.version)
    const note = await create('AA_NOTE', { title: 'Rename check', note_type: 'IDEA', content: 'x', linked_characters: ['Mara Venn'] })
    expect((await doc(note)).term_references.find((r) => r.field_path.startsWith('linked_characters'))?.term_id).toBe(t!.id)
  })

  it('renames a chapter by copy: structure and images follow, the original is retired', async () => {
    const chapter = await create('AA_CHAPTER', { title: 'The Storm', summary: 'Snow.' })
    const other = await create('AA_CHAPTER', { title: 'The Search' })
    const structure = await create('AA_BOOK_STRUCTURE', { book_title: 'Rename book', chapters: [{ chapter_id: chapter, scene_ids: [] }, { chapter_id: other, scene_ids: [] }] })
    const file = await wipClient().files.uploadFile(new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' }), 'map.png', undefined, ns)
    const media = await create('AA_MEDIA', { file: file.file_id, title: 'Map' })
    await create('AA_ATTACHED_TO', { source_ref: media, target_ref: chapter, role: 'MAP' })

    const renamed = await renameByCopy(wipClient(), { template: 'AA_CHAPTER', field: 'title', documentId: chapter, newTitle: 'The Blizzard', data: { title: 'The Storm', summary: 'Snow.' } })

    expect((await doc(renamed)).data).toMatchObject({ title: 'The Blizzard', summary: 'Snow.' })
    expect((await doc(chapter)).status).toBe('inactive')
    expect((await doc(structure)).data.chapters).toEqual([{ chapter_id: renamed, scene_ids: [] }, { chapter_id: other, scene_ids: [] }])
    const rel = await wipFetch('GET', `/api/document-store/documents/${renamed}/relationships?template=${ns}:AA_ATTACHED_TO&namespace=${ns}&direction=incoming`)
    expect((rel.json as { items: Array<{ data: { source_ref: string } }> }).items.map((e) => e.data.source_ref)).toEqual([media])
  })
})
