import { beforeEach, describe, expect, it } from 'vitest'
import { setNamespace } from './constants'
import { NameTakenError, relabelEntity, renameByCopy } from './rename'
import { fakeWip, type FakeTerm } from './fakeWip'

beforeEach(() => setNamespace('aa'))

const characterTerms = (): FakeTerm[] => [
  { term_id: 't-linora', value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', aliases: ['Lady Linora Thalyn', 'Linora'] },
  { term_id: 't-carter', value: 'CARTER', label: 'Carter', aliases: ['Old Carter'] },
]

describe('relabelEntity (characters, locations, plot threads)', () => {
  it('changes the label, keeps the old label as an alias and touches no document', async () => {
    const wip = fakeWip({ terms: characterTerms(), docs: [] })
    await relabelEntity(wip.client, 'character', 'Lady Linora Thalyn', 'Linora Thalyn')
    expect(wip.calls).toEqual([{ op: 'updateTerm', args: ['t-linora', { label: 'Linora Thalyn', aliases: ['Lady Linora Thalyn', 'Linora'] }] }])
  })

  it('finds the term by its value or any alias', async () => {
    const wip = fakeWip({ terms: characterTerms(), docs: [] })
    await relabelEntity(wip.client, 'character', 'LADY_LINORA_THALYN', 'Linora Thalyn')
    await relabelEntity(wip.client, 'character', 'old carter', 'Carter Senior')
    expect(wip.calls.map((c) => c.args[0])).toEqual(['t-linora', 't-carter'])
  })

  it('does not keep the new name as an alias too', async () => {
    const wip = fakeWip({ terms: characterTerms(), docs: [] })
    await relabelEntity(wip.client, 'character', 'Lady Linora Thalyn', 'linora')
    expect(wip.calls[0]!.args[1]).toEqual({ label: 'linora', aliases: ['Lady Linora Thalyn'] })
  })

  it('refuses a name another entry already answers to (value, label or alias, any case)', async () => {
    for (const taken of ['carter', 'CARTER', 'old carter']) {
      const wip = fakeWip({ terms: characterTerms(), docs: [] })
      await expect(relabelEntity(wip.client, 'character', 'Lady Linora Thalyn', taken)).rejects.toBeInstanceOf(NameTakenError)
      expect(wip.calls).toEqual([])
    }
  })

  it('does nothing when the name is unchanged or empty', async () => {
    const wip = fakeWip({ terms: characterTerms(), docs: [] })
    await relabelEntity(wip.client, 'character', 'Lady Linora Thalyn', 'Lady Linora Thalyn')
    await relabelEntity(wip.client, 'character', 'Lady Linora Thalyn', '   ')
    expect(wip.calls).toEqual([])
  })

  it('reports a stored name that matches no term', async () => {
    const wip = fakeWip({ terms: characterTerms(), docs: [] })
    await expect(relabelEntity(wip.client, 'character', 'Nobody', 'Somebody')).rejects.toThrow('No name entry for "Nobody"')
  })
})

describe('renameByCopy (chapters, scenes, notes, world rules)', () => {
  const docs = () => [
    { document_id: 'ch1', template: 'AA_CHAPTER', data: { title: 'The Storm', summary: 'Snow.' } },
    { document_id: 'ch2', template: 'AA_CHAPTER', data: { title: 'The Search' } },
    { document_id: 'bs', template: 'AA_BOOK_STRUCTURE', data: { book_title: 'B', chapters: [
      { chapter_id: 'ch1', scene_ids: ['s1'] }, { chapter_id: 'ch2', scene_ids: ['s2'] },
    ] } },
    { document_id: 'e1', template: 'AA_ATTACHED_TO', data: { source_ref: 'm1', target_ref: 'ch1', role: 'MAP', sort_order: 2 } },
  ]

  it('creates the copy, re-points the structure and images, and retires the original', async () => {
    const wip = fakeWip({ terms: [], docs: docs() })
    const newId = await renameByCopy(wip.client, {
      template: 'AA_CHAPTER', field: 'title', documentId: 'ch1', newTitle: 'The Blizzard', data: { title: 'The Storm', summary: 'Snow, edited.' },
    })
    expect(wip.doc(newId)?.data).toEqual({ title: 'The Blizzard', summary: 'Snow, edited.' })
    expect(wip.doc('bs')?.data.chapters).toEqual([{ chapter_id: newId, scene_ids: ['s1'] }, { chapter_id: 'ch2', scene_ids: ['s2'] }])
    const edges = wip.docs.filter((d) => d.template === 'AA_ATTACHED_TO' && d.status === 'active')
    expect(edges.map((e) => e.data)).toEqual([{ source_ref: 'm1', target_ref: newId, role: 'MAP', sort_order: 2 }])
    expect(wip.doc('e1')?.status).toBe('inactive')
    expect(wip.doc('ch1')?.status).toBe('inactive')
    // The original is retired last, after everything points at the copy.
    expect(wip.calls.at(-1)).toEqual({ op: 'deleteDocument', args: ['ch1'] })
  })

  it('re-points scene ids in the structure too', async () => {
    const d = [...docs(), { document_id: 's1', template: 'AA_EVENT', data: { title: 'Arrival' } }]
    const wip = fakeWip({ terms: [], docs: d })
    const newId = await renameByCopy(wip.client, { template: 'AA_EVENT', field: 'title', documentId: 's1', newTitle: 'Arrival at Dawn', data: { title: 'Arrival' } })
    expect(wip.doc('bs')?.data.chapters).toEqual([{ chapter_id: 'ch1', scene_ids: [newId] }, { chapter_id: 'ch2', scene_ids: ['s2'] }])
  })

  it('refuses a title another document already has, before writing anything', async () => {
    const wip = fakeWip({ terms: [], docs: docs() })
    await expect(renameByCopy(wip.client, { template: 'AA_CHAPTER', field: 'title', documentId: 'ch1', newTitle: 'The Search', data: {} }))
      .rejects.toBeInstanceOf(NameTakenError)
    expect(wip.calls).toEqual([])
  })
})
