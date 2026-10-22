import { expect, test, type Page } from '@playwright/test'
import { create, doc, setStructure, tag } from './support/book'
import { watch } from './support/page'

// Opening a scene for the first time: each test starts in a fresh browser
// context, opens a scene one way or another, types, saves and checks the
// stored prose. Guards the 2026-04 report "scene editing may not save on
// first load" (editor read-only until you navigate away and back), which
// none of these paths reproduced on 2026-10-22.
const names = ['direct', 'list', 'corkboard', 'draft', 'slow', 'long', 'nextA', 'nextB'] as const
const ids = Object.fromEntries(names.map((n) => [n, ''])) as Record<(typeof names)[number], string>
const long = Array.from({ length: 120 }, (_, i) => `<p>Paragraph ${i + 1}: the tide came in over the shingle and went out again, as it always had.</p>`).join('')

test.beforeAll(async () => {
  const chapter = await create('AA_CHAPTER', { title: `First load chapter${tag()}` })
  for (const [i, name] of names.entries()) {
    ids[name] = await create('AA_EVENT', { title: `First load ${name}${tag()}`, event_type: 'SCENE', story_time_sort: i + 1, summary: 's', prose: name === 'long' ? long : `<p>Start of ${name}.</p>` })
  }
  await setStructure([{ chapter_id: chapter, scene_ids: Object.values(ids) }])
})

const editor = (page: Page) => page.getByRole('textbox', { name: 'Scene text' })

async function typeAndSave(page: Page, id: string, marker: string) {
  const ed = editor(page)
  await expect(ed).toBeVisible()
  const editable = await ed.getAttribute('contenteditable')
  await ed.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(` ${marker}`)
  await expect(ed).toContainText(marker)
  await page.keyboard.press('ControlOrMeta+s')
  await expect.poll(async () => String((await doc(id)).data.prose)).toContain(marker)
  return editable
}

test('direct URL, cold', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.direct}`)
  expect(await typeAndSave(page, ids.direct, 'MARK-direct')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('from the scene list', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/scenes')
  await page.getByText(`First load list${tag()}`, { exact: true }).click()
  expect(await typeAndSave(page, ids.list, 'MARK-list')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('from a Corkboard card', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/corkboard')
  await page.getByText(`First load corkboard${tag()}`, { exact: true }).click()
  await expect(page).toHaveURL(new RegExp(ids.corkboard))
  expect(await typeAndSave(page, ids.corkboard, 'MARK-corkboard')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('with a leftover local draft', async ({ page }) => {
  const seen = watch(page)
  await page.addInitScript(([key]) => {
    localStorage.setItem(key!, JSON.stringify({ content: '<p>Draft text from before.</p>', title: 'First load draft', savedAt: Date.now() - 60_000 }))
  }, [`aa-scene-draft-${ids.draft}`])
  await page.goto(`/scenes?id=${ids.draft}`)
  await expect(editor(page)).toContainText('Draft text from before.')
  expect(await typeAndSave(page, ids.draft, 'MARK-draft')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('slow WIP (every call delayed 1.5 s)', async ({ page }) => {
  const seen = watch(page)
  await page.route('**/wip/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue() })
  await page.goto(`/scenes?id=${ids.slow}`)
  expect(await typeAndSave(page, ids.slow, 'MARK-slow')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('a long scene', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.long}`)
  expect(await typeAndSave(page, ids.long, 'MARK-long')).toBe('true')
  expect(seen.problems).toEqual([])
})

test('the second scene opened in the same session', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.nextA}`)
  await expect(editor(page)).toContainText('Start of nextA.')
  await page.goto('/scenes')
  await page.getByText(`First load nextB${tag()}`, { exact: true }).click()
  await expect(editor(page)).toContainText('Start of nextB.')
  expect(await typeAndSave(page, ids.nextB, 'MARK-nextB')).toBe('true')
  expect(seen.problems).toEqual([])
})
