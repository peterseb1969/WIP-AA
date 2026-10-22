import { expect, test, type Locator } from '@playwright/test'
import { create, doc, drag, setStructure, tag } from './support/book'
import { watch } from './support/page'

// Drag and drop with a real mouse (pointer events), and Undo, which writes
// the old order back with if_match. Checked against the stored structure.
const ids = { a: '', b: '', c: '', s1: '', s2: '', s3: '', structure: '' }
const chapters = async () => ((await doc(ids.structure)).data.chapters as Array<{ chapter_id: string; scene_ids: string[] }>)
const order = async () => (await chapters()).map((c) => c.chapter_id)

async function box(locator: Locator) {
  // The page may still be rendering after goto: measure only once it shows.
  await expect(locator).toBeVisible()
  const b = (await locator.boundingBox())!
  return { center: { x: b.x + b.width / 2, y: b.y + b.height / 2 }, upper: { x: b.x + b.width / 2, y: b.y + b.height * 0.25 } }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  ids.a = await create('AA_CHAPTER', { title: `The Harbour${tag()}` })
  ids.b = await create('AA_CHAPTER', { title: `The Crossing${tag()}` })
  ids.c = await create('AA_CHAPTER', { title: `The Island${tag()}` })
  const scene = (title: string, n: number) => create('AA_EVENT', { title: `${title}${tag()}`, event_type: 'SCENE', story_time_sort: n, summary: 's', prose: `<p>${title}.</p>` })
  ids.s1 = await scene('Fog', 1); ids.s2 = await scene('Rope', 2); ids.s3 = await scene('Shore', 3)
  ids.structure = await setStructure([
    { chapter_id: ids.a, scene_ids: [ids.s1, ids.s2] },
    { chapter_id: ids.b, scene_ids: [ids.s3] },
    { chapter_id: ids.c, scene_ids: [] },
  ])
})

test('drag a chapter to the top on the Chapters page, then undo', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/chapters')
  const island = await box(page.getByText(`The Island${tag()}`, { exact: true }))
  const harbour = await box(page.getByText(`The Harbour${tag()}`, { exact: true }))
  await drag(page, island.center, harbour.upper)
  await expect.poll(order).toEqual([ids.c, ids.a, ids.b])

  // Its name says what it undoes: "Undo: Chapter 3: The Island → Ch. 1 (Cmd/Ctrl+Z)".
  await page.getByRole('button', { name: /^Undo: .*The Island/ }).click()
  await expect.poll(order).toEqual([ids.a, ids.b, ids.c])
  expect(seen.problems).toEqual([])
})

test('drag a scene card into another chapter on the Corkboard', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/corkboard')
  const fog = await box(page.getByText(`Fog${tag()}`, { exact: true }))
  const shore = await box(page.getByText(`Shore${tag()}`, { exact: true }))
  await drag(page, fog.center, shore.upper)
  await expect.poll(async () => (await chapters()).map((c) => c.scene_ids)).toEqual([[ids.s2], [ids.s1, ids.s3], []])
  expect(seen.problems).toEqual([])
})
