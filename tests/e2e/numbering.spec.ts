import { expect, test, type Page } from '@playwright/test'
import { create, doc, setStructure, tag } from './support/book'
import { watch } from './support/page'

// Chapter numbering on the Chapters page: no number, start at a chosen
// number, Undo. The rules live on the book structure's chapter slots; the
// numbers shown are computed from the order plus the rules.
const ids = { one: '', two: '', three: '', structure: '' }
const titles = () => ({ one: `Arrival${tag()}`, two: `Interlude${tag()}`, three: `Departure${tag()}` })
const slot = async (id: string) => ((await doc(ids.structure)).data.chapters as Array<{ chapter_id: string; number_start?: number; unnumbered?: boolean }>).find((c) => c.chapter_id === id)
const shown = (page: Page, title: string) => page.getByRole('article', { name: title }).getByLabel('Chapter number')

async function setNumbering(page: Page, title: string, option: RegExp, start?: string) {
  await page.getByRole('article', { name: title }).getByRole('button', { name: 'Number', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Chapter numbering' })
  await dialog.getByRole('radio', { name: option }).check()
  if (start != null) await dialog.getByRole('spinbutton', { name: 'Start numbering at' }).fill(start)
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const t = titles()
  ids.one = await create('AA_CHAPTER', { title: t.one })
  ids.two = await create('AA_CHAPTER', { title: t.two })
  ids.three = await create('AA_CHAPTER', { title: t.three })
  ids.structure = await setStructure([{ chapter_id: ids.one, scene_ids: [] }, { chapter_id: ids.two, scene_ids: [] }, { chapter_id: ids.three, scene_ids: [] }])
})

test('no number, start at, undo', async ({ page }) => {
  const seen = watch(page)
  const t = titles()
  await page.goto('/chapters')
  await expect(shown(page, t.three)).toHaveText('3')

  await setNumbering(page, t.two, /^No number/)
  await expect(shown(page, t.two)).toHaveText('–')
  await expect(shown(page, t.three)).toHaveText('2')
  await expect.poll(async () => (await slot(ids.two))?.unnumbered).toBe(true)

  await setNumbering(page, t.three, /^Start numbering at/, '7')
  await expect(shown(page, t.three)).toHaveText('7')
  await expect.poll(async () => (await slot(ids.three))?.number_start).toBe(7)

  await page.getByRole('button', { name: /^Undo: / }).click()
  await expect(shown(page, t.three)).toHaveText('2')
  await expect.poll(async () => (await slot(ids.three))?.number_start).toBeUndefined()
  await expect(shown(page, t.one)).toHaveText('1')
  expect(seen.problems).toEqual([])
})
