import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { create, doc, pick, setStructure, tag, terms } from './support/book'
import { watch } from './support/page'

// Renaming without duplicates. Characters (also locations, plot threads) are
// relabelled: the term gets the new label, the old one stays an alias, the
// document is untouched. Chapters (also notes, world rules) and scenes are
// copied under the new title, the book structure points at the copy, the old
// document is retired. A name already in use is refused.
const ns = process.env.AA_E2E_NAMESPACE!
const people = () => pick([
  { a: { value: 'MARA_VENN', label: 'Mara Venn' }, b: { value: 'IVO_KELL', label: 'Ivo Kell' }, renamed: 'Mara Venn-Ashby' },
  { a: { value: 'ODA_FENN', label: 'Oda Fenn' }, b: { value: 'PIM_ROSS', label: 'Pim Ross' }, renamed: 'Oda Fenn-Marlowe' },
  { a: { value: 'TAVI_HOLT', label: 'Tavi Holt' }, b: { value: 'NELL_SKY', label: 'Nell Sky' }, renamed: 'Tavi Holt-Grey' },
])
const ids = { a: '', b: '', termA: '', chapter: '', scene: '', other: '', structure: '' }

async function term(id: string) {
  return (await wipFetch('GET', `/api/def-store/terms/${id}?namespace=${ns}`)).json as { label: string; aliases: string[] }
}
async function active(template: string, field: string, value: string) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:${template}`, status: 'active', filters: [{ field: `data.${field}`, operator: 'eq', value }], page_size: 5 })
  return (json as { items: Array<{ document_id: string }> }).items
}
const slots = async () => ((await doc(ids.structure)).data.chapters as Array<{ chapter_id: string; scene_ids: string[] }>)

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const { a, b } = people()
  ids.termA = (await terms('AA_CHARACTERS', [{ ...a, aliases: [a.label] }, { ...b, aliases: [b.label] }]))[0]!
  ids.a = await create('AA_CHARACTER', { name: a.label, role: 'SUPPORTING' })
  ids.b = await create('AA_CHARACTER', { name: b.label, role: 'MINOR' })
  ids.chapter = await create('AA_CHAPTER', { title: `The Storm${tag()}`, summary: 'Snow.' })
  ids.scene = await create('AA_EVENT', { title: `Snowbound${tag()}`, event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>Snow.</p>' })
  ids.other = await create('AA_EVENT', { title: `Thaw${tag()}`, event_type: 'SCENE', story_time_sort: 2, summary: 's', prose: '<p>Water.</p>' })
  ids.structure = await setStructure([{ chapter_id: ids.chapter, scene_ids: [ids.scene, ids.other] }])
})

test('rename a character: the term is relabelled, the document stays', async ({ page }) => {
  const seen = watch(page)
  const { a, renamed } = people()
  await page.goto('/characters')
  await page.getByRole('button', { name: new RegExp(a.label) }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Character' })
  await dialog.getByLabel('Name').fill(renamed)
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

  const t = await term(ids.termA)
  expect(t.label).toBe(renamed)
  expect(t.aliases).toContain(a.label)
  expect((await doc(ids.a)).version).toBe(1)
  expect(seen.problems).toEqual([])
})

test('a character name already in use is refused', async ({ page }) => {
  const { b, renamed } = people()
  await page.goto('/characters')
  await page.getByRole('button', { name: new RegExp(renamed) }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Character' })
  await dialog.getByLabel('Name').fill(b.label)
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  await expect(dialog.getByText(`“${b.label}” already has this name`)).toBeVisible()
  expect((await term(ids.termA)).label).toBe(renamed)
})

test('rename a chapter: a copy under the new title takes its place', async ({ page }) => {
  const seen = watch(page)
  const title = `The Blizzard${tag()}`
  await page.goto('/chapters')
  await page.getByRole('article', { name: `The Storm${tag()}` }).getByRole('button', { name: 'Edit', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Chapter' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('article', { name: title })).toBeVisible()

  const [copy] = await active('AA_CHAPTER', 'title', title)
  expect(copy).toBeTruthy()
  expect((await doc(copy!.document_id)).data.summary).toBe('Snow.')
  expect((await doc(ids.chapter)).status).toBe('inactive')
  expect((await slots()).map((s) => s.chapter_id)).toContain(copy!.document_id)
  ids.chapter = copy!.document_id
  expect(seen.problems).toEqual([])
})

test('rename a scene by its title; a title in use is refused', async ({ page }) => {
  const seen = watch(page)
  const title = `Snowbound at dawn${tag()}`
  await page.goto(`/scenes?id=${ids.scene}`)
  await page.getByRole('button', { name: `Snowbound${tag()}` }).click()
  // Refused first: another scene has that title.
  await page.getByLabel('Scene title').fill(`Thaw${tag()}`)
  await page.getByLabel('Scene title').press('Enter')
  await expect(page.getByText(`“Thaw${tag()}” is already taken`)).toBeVisible()

  await page.getByLabel('Scene title').fill(title)
  await page.getByLabel('Scene title').press('Enter')
  await expect(page).not.toHaveURL(new RegExp(ids.scene))
  const copyId = new URL(page.url()).searchParams.get('id')!
  expect((await doc(copyId)).data.title).toBe(title)
  expect((await doc(ids.scene)).status).toBe('inactive')
  await expect.poll(async () => (await slots()).find((s) => s.chapter_id === ids.chapter)?.scene_ids).toEqual([copyId, ids.other])
  expect(seen.problems).toEqual([])
})
