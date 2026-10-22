import { expect, test } from '@playwright/test'
import { create, doc, setStructure, tag } from './support/book'
import { watch } from './support/page'

// The Move dialog: a scene goes to another chapter, between two of its scenes;
// Undo puts it back. Checked against the stored book structure.
const ids = { a: '', b: '', a1: '', a2: '', b1: '', b2: '', structure: '' }
const chapters = async () => ((await doc(ids.structure)).data.chapters as Array<{ chapter_id: string; scene_ids: string[] }>)
  .filter((c) => c.chapter_id === ids.a || c.chapter_id === ids.b).map((c) => c.scene_ids)

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  ids.a = await create('AA_CHAPTER', { title: `Move from${tag()}` })
  ids.b = await create('AA_CHAPTER', { title: `Move to${tag()}` })
  const scene = (title: string, n: number) => create('AA_EVENT', { title: `${title}${tag()}`, event_type: 'SCENE', story_time_sort: n, summary: 's', prose: `<p>${title}.</p>` })
  ids.a1 = await scene('Lantern', 1); ids.a2 = await scene('Wick', 2); ids.b1 = await scene('Harbour wall', 3); ids.b2 = await scene('Breakwater', 4)
  ids.structure = await setStructure([{ chapter_id: ids.a, scene_ids: [ids.a1, ids.a2] }, { chapter_id: ids.b, scene_ids: [ids.b1, ids.b2] }])
})

test('move a scene to another chapter, after a given scene, then undo', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.a1}`)
  await page.getByRole('button', { name: 'Move…' }).first().click()
  const dialog = page.getByRole('dialog', { name: `Move “Lantern${tag()}”` })
  await dialog.getByLabel('Chapter').selectOption(ids.b)
  await dialog.getByRole('radio', { name: `After “Harbour wall${tag()}”` }).check()
  await dialog.getByRole('button', { name: 'Move', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect.poll(chapters).toEqual([[ids.a2], [ids.b1, ids.a1, ids.b2]])

  await page.getByRole('button', { name: /^Undo: / }).click()
  await expect.poll(chapters).toEqual([[ids.a1, ids.a2], [ids.b1, ids.b2]])
  expect(seen.problems).toEqual([])
})
