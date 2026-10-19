import { beforeAll, describe, expect, inject, it } from 'vitest'
import { setNamespace } from '../../src/lib/constants'
import { attachMedia, deleteMediaPermanently, storeMedia } from '../../src/lib/media'
import { withSceneMoved, withSceneRemoved, type ChapterSlot } from '../../src/lib/useBookStructure'
import { bulk, wipClient, wipFetch } from './support/wip'

let ns = ''
const create = async (template: string, data: Record<string, unknown>) =>
  (await bulk('/api/document-store/documents', [{ template_id: `${ns}:${template}`, namespace: ns, data }]))[0]!.document_id!
const doc = async (id: string) => (await wipFetch('GET', `/api/document-store/documents/${id}`)).json as { status: string; version: number; data: Record<string, unknown> }
const incoming = async (id: string) =>
  ((await wipFetch('GET', `/api/document-store/documents/${id}/relationships?template=${ns}:AA_ATTACHED_TO&namespace=${ns}&direction=incoming`)).json as {
    items: Array<{ document_id: string; data: { source_ref: string; role: string; sort_order?: number } }>
  }).items
// Distinct bytes per test (WIP stores identical content once), over 64 KB.
const image = (seed: number, name: string) =>
  new File([new Uint8Array(70 * 1024).map((_, i) => (i * seed) % 251)], name, { type: 'image/png' })

beforeAll(() => { ns = inject('namespace'); setNamespace(ns) })

describe('images (src/lib/media.ts)', () => {
  it('stores an image once: a second upload of the same bytes reuses the media document', async () => {
    const wip = wipClient()
    const first = await storeMedia(wip, image(7, 'harbour.png'))
    const again = await storeMedia(wip, image(7, 'harbour-copy.png'))
    expect(again).toBe(first)
    expect((await doc(first)).data).toMatchObject({ title: 'harbour' })
  })

  it('attaches an image; attaching it again updates role and order instead of adding a second edge', async () => {
    const wip = wipClient()
    await bulk(`/api/def-store/terminologies/${ns}:AA_CHARACTERS/terms?namespace=${ns}`, [{ value: 'MEDIA_CARTER', label: 'Media Carter', aliases: ['Media Carter'] }])
    const character = await create('AA_CHARACTER', { name: 'Media Carter', role: 'SUPPORTING' })
    const media = await storeMedia(wip, image(11, 'carter.png'))
    await attachMedia(wip, media, character, 'PORTRAIT', 0)
    await attachMedia(wip, media, character, 'ILLUSTRATION', 3)
    const edges = await incoming(character)
    expect(edges).toHaveLength(1)
    expect(edges[0]!.data).toMatchObject({ source_ref: media, role: 'ILLUSTRATION', sort_order: 3 })
  })

  it('deletes permanently: attachments and media retired, the stored bytes gone', async () => {
    const wip = wipClient()
    const chapter = await create('AA_CHAPTER', { title: 'Media chapter' })
    const note = await create('AA_NOTE', { title: 'Media note', note_type: 'IDEA', content: 'x' })
    const media = await storeMedia(wip, image(13, 'map.png'))
    await attachMedia(wip, media, chapter, 'MAP', 0)
    await attachMedia(wip, media, note, 'REFERENCE', 0)
    const fileId = String((await doc(media)).data.file)
    const edgeIds = [...(await incoming(chapter)), ...(await incoming(note))].map((e) => e.document_id)

    await deleteMediaPermanently(wip, media, fileId, edgeIds)

    expect(await incoming(chapter)).toEqual([])
    expect(await incoming(note)).toEqual([])
    expect((await doc(media)).status).toBe('inactive')
    expect((await wipFetch('GET', `/api/document-store/files/${fileId}/content`)).status).toBe(404)
  })
})

describe('book structure (what Undo relies on)', () => {
  it('refuses a write with an outdated if_match: concurrency_conflict, nothing changed', async () => {
    const chapters: ChapterSlot[] = [{ chapter_id: 'c1', scene_ids: ['s1', 's2'] }]
    const id = await create('AA_BOOK_STRUCTURE', { book_title: 'Undo book', chapters })
    const wip = wipClient()
    const moved = await wip.documents.updateDocument(id, { chapters: withSceneMoved(chapters, 's2', 'c1', 's1') })
    const stale = moved.version! - 1
    await expect(wip.documents.updateDocument(id, { chapters }, { ifMatch: stale })).rejects.toMatchObject({ errorCode: 'concurrency_conflict' })
    expect((await doc(id)).data.chapters).toEqual([{ chapter_id: 'c1', scene_ids: ['s2', 's1'] }])
    // With the current version, the undo goes through.
    await wip.documents.updateDocument(id, { chapters }, { ifMatch: moved.version! })
    expect((await doc(id)).data.chapters).toEqual(chapters)
  })

  it('brings a merged-away scene back under its old id when it is created again (scene-merge undo)', async () => {
    const data = { title: 'Undo scene', event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>Kept text.</p>' }
    const id = await create('AA_EVENT', data)
    const structure = await create('AA_BOOK_STRUCTURE', { book_title: 'Merge undo book', chapters: [{ chapter_id: 'c1', scene_ids: [id] }] })
    const wip = wipClient()
    await wip.documents.updateDocument(structure, { chapters: withSceneRemoved([{ chapter_id: 'c1', scene_ids: [id] }], id) })
    await wip.documents.deleteDocument(id)
    expect((await doc(id)).status).toBe('inactive')

    const again = await create('AA_EVENT', data)
    expect(again).toBe(id)
    expect((await doc(id)).status).toBe('active')
  })
})
