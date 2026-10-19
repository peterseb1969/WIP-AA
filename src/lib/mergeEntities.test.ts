import { beforeEach, describe, expect, it } from 'vitest'
import { setNamespace } from './constants'
import { executeMerge, planMerge } from './mergeEntities'
import { fakeWip, type FakeDoc, type FakeTerm } from './fakeWip'

// "Linnie" is merged into "Lady Linora Thalyn". Shaped like an imported book:
// entity documents hold display names, references hold term values (and the
// odd label or case variant).
const terms = (): FakeTerm[] => [
  { term_id: 't-linora', value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', aliases: ['Lady Linora Thalyn', 'Linora'] },
  { term_id: 't-linnie', value: 'LINNIE', label: 'Linnie', aliases: ['Linnie', 'Lin'] },
  { term_id: 't-carter', value: 'CARTER', label: 'Carter' },
  { term_id: 't-babbage', value: 'BABBAGE', label: 'Charles Babbage' },
]
const docs = (): FakeDoc[] => [
  { document_id: 'linora', template: 'AA_CHARACTER', data: {
    name: 'Lady Linora Thalyn', role: 'SUPPORTING', description: 'Elderly, horned.',
    relationships: [{ character: 'CARTER', relationship_type: 'FRIEND' }, { character: 'Linnie', relationship_type: 'SELF' }],
  } },
  { document_id: 'linnie', template: 'AA_CHARACTER', data: {
    name: 'Linnie', role: 'MINOR', description: 'Another description.', backstory: 'Called Linnie by her students.',
    relationships: [{ character: 'carter', relationship_type: 'FRIEND' }, { character: 'BABBAGE', relationship_type: 'MENTOR' }],
  } },
  { document_id: 'carter', template: 'AA_CHARACTER', data: {
    name: 'Carter', role: 'MAJOR',
    relationships: [{ character: 'LINNIE', relationship_type: 'FRIEND' }, { character: 'LADY_LINORA_THALYN', relationship_type: 'FRIEND' }],
  } },
  { document_id: 's1', template: 'AA_EVENT', data: { title: 'Lecture', characters: ['LINNIE', 'LADY_LINORA_THALYN', 'CARTER'], suppressed_suggestions: ['Lin'] } },
  { document_id: 's2', template: 'AA_EVENT', data: { title: 'Harbour', characters: ['CARTER'] } },
  { document_id: 'ch1', template: 'AA_CHAPTER', data: { title: 'The Storm', pov_character: 'linnie' } },
  { document_id: 'n1', template: 'AA_NOTE', data: { title: 'Idea', linked_characters: ['Linnie'] } },
  { document_id: 'w1', template: 'AA_WORLD_RULE', data: { name: 'Horns', related_characters: ['LINNIE', 'LADY_LINORA_THALYN'] } },
  { document_id: 'e1', template: 'AA_ATTACHED_TO', data: { source_ref: 'm1', target_ref: 'linnie', role: 'PORTRAIT' } },
  { document_id: 'e2', template: 'AA_ATTACHED_TO', data: { source_ref: 'm2', target_ref: 'linnie', role: 'ILLUSTRATION' } },
  { document_id: 'e3', template: 'AA_ATTACHED_TO', data: { source_ref: 'm2', target_ref: 'linora', role: 'ILLUSTRATION' } },
]

beforeEach(() => setNamespace('aa'))

describe('planMerge', () => {
  it('keeps the survivor’s details and fills only its empty fields', async () => {
    const { client } = fakeWip({ terms: terms(), docs: docs() })
    const plan = await planMerge(client, 'character', 'linora', ['linnie'])
    expect(plan.survivorPatch.backstory).toBe('Called Linnie by her students.')
    expect(plan.survivorPatch).not.toHaveProperty('description')
    expect(plan.survivorPatch).not.toHaveProperty('role')
    expect(plan.survivorPatch).not.toHaveProperty('name')
  })

  it('merges relationships: re-pointed, self-references dropped, duplicates collapsed', async () => {
    const { client } = fakeWip({ terms: terms(), docs: docs() })
    const plan = await planMerge(client, 'character', 'linora', ['linnie'])
    expect(plan.survivorPatch.relationships).toEqual([
      { character: 'CARTER', relationship_type: 'FRIEND' },
      { character: 'BABBAGE', relationship_type: 'MENTOR' },
    ])
  })

  it('rewrites every reference spelling to the survivor’s value, and only documents that change', async () => {
    const { client } = fakeWip({ terms: terms(), docs: docs() })
    const plan = await planMerge(client, 'character', 'linora', ['linnie'])
    const patch = Object.fromEntries(plan.changes.map((c) => [c.documentId, c.patch]))
    expect(Object.keys(patch).sort()).toEqual(['carter', 'ch1', 'n1', 's1', 'w1'])
    expect(patch.s1).toEqual({ characters: ['LADY_LINORA_THALYN', 'CARTER'], suppressed_suggestions: ['LADY_LINORA_THALYN'] })
    expect(patch.ch1).toEqual({ pov_character: 'LADY_LINORA_THALYN' })
    expect(patch.n1).toEqual({ linked_characters: ['LADY_LINORA_THALYN'] })
    expect(patch.w1).toEqual({ related_characters: ['LADY_LINORA_THALYN'] })
    expect(patch.carter).toEqual({ relationships: [{ character: 'LADY_LINORA_THALYN', relationship_type: 'FRIEND' }] })
  })

  it('moves images, dropping ones the survivor already has', async () => {
    const { client } = fakeWip({ terms: terms(), docs: docs() })
    const plan = await planMerge(client, 'character', 'linora', ['linnie'])
    expect(plan.images).toEqual([
      { edgeId: 'e1', mediaId: 'm1', role: 'PORTRAIT', alreadyOnSurvivor: false },
      { edgeId: 'e2', mediaId: 'm2', role: 'ILLUSTRATION', alreadyOnSurvivor: true },
    ])
  })

  it('collects every absorbed spelling, label included, as aliases of the survivor', async () => {
    const { client } = fakeWip({ terms: terms(), docs: docs() })
    const plan = await planMerge(client, 'character', 'linora', ['linnie'])
    expect(plan.aliases).toEqual(['Lady Linora Thalyn', 'Linora', 'LINNIE', 'Linnie', 'Lin'])
    expect(plan.aliases).not.toContain('LADY_LINORA_THALYN')
  })

  it('refuses an entity whose name matches no term', async () => {
    const d = docs()
    d.push({ document_id: 'ghost', template: 'AA_CHARACTER', data: { name: 'Nobody' } })
    const { client } = fakeWip({ terms: terms(), docs: d })
    await expect(planMerge(client, 'character', 'linora', ['ghost'])).rejects.toThrow('No name entry for "Nobody"')
  })
})

describe('executeMerge', () => {
  it('writes in a safe order: references, images, aliases, term merge, and the absorbed document last', async () => {
    const wip = fakeWip({ terms: terms(), docs: docs() })
    await executeMerge(wip.client, await planMerge(wip.client, 'character', 'linora', ['linnie']), () => {})
    const ops = wip.calls.map((c) => `${c.op}:${String(c.args[0])}`)
    expect(ops).toEqual([
      'updateDocument:linora',
      'updateDocument:s1', 'updateDocument:ch1', 'updateDocument:n1', 'updateDocument:w1', 'updateDocument:carter',
      'createDocument:AA_ATTACHED_TO', 'deleteDocument:e1', 'deleteDocument:e2',
      'updateTerm:t-linora',
      'mergeTerms:t-linora',
      'deleteDocument:linnie',
    ])
    expect(wip.calls.find((c) => c.op === 'createDocument')?.args[1]).toEqual({ source_ref: 'm1', target_ref: 'linora', role: 'PORTRAIT' })
    expect(wip.terms.find((t) => t.term_id === 't-linnie')?.status).toBe('deprecated')
    expect(wip.doc('linnie')?.status).toBe('inactive')
  })

  it('completes an interrupted merge when run again, skipping the term merge that already happened', async () => {
    const wip = fakeWip({ terms: terms(), docs: docs() })
    const first = await planMerge(wip.client, 'character', 'linora', ['linnie'])
    // Simulate a crash right after the term merge: the absorbed document is still active.
    await wip.client.defStore.updateTerm('t-linora', { aliases: first.aliases })
    await wip.client.defStore.mergeTerms('t-linora', 't-linnie')
    wip.calls.length = 0

    const again = await planMerge(wip.client, 'character', 'linora', ['linnie'])
    expect(again.absorbed[0]!.term.term_id).toBe('t-linora')
    await executeMerge(wip.client, again, () => {})
    expect(wip.calls.some((c) => c.op === 'mergeTerms')).toBe(false)
    expect(wip.doc('linnie')?.status).toBe('inactive')
  })
})
