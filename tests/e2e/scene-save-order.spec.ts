import { expect, test, type Page } from '@playwright/test'
import { create, doc, setStructure, tag } from './support/book'
import { watch } from './support/page'

// Prose saves to one scene must land in the order they were started, and a
// save asked for while another is running must not be dropped. Each test
// holds the first prose PATCH back for 1.5 s, which makes the races that
// happened only now and then happen every time.
const ids = { chapter: '', leftover: '', twice: '' }
const editor = (page: Page) => page.getByRole('textbox', { name: 'Scene text' })
const prose = async (id: string) => String((await doc(id)).data.prose)

/**
 * Delays the first PATCH of documents. `landed` resolves once it has gone
 * through; it is wrapped in an object because an async function returning a
 * promise would make the caller await that promise itself.
 */
async function holdFirstPatch(page: Page) {
  let held = false
  let landed!: () => void
  const firstLanded = new Promise<void>((resolve) => { landed = resolve })
  await page.route(/\/api\/document-store\/documents(\?|$)/, async (route) => {
    if (route.request().method() !== 'PATCH' || held) return route.continue()
    held = true
    await new Promise((r) => setTimeout(r, 1500))
    await route.continue()
    landed()
  })
  return { landed: firstLanded }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  ids.chapter = await create('AA_CHAPTER', { title: `Save order chapter${tag()}` })
  ids.leftover = await create('AA_EVENT', { title: `Save order leftover${tag()}`, event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>Saved text.</p>' })
  ids.twice = await create('AA_EVENT', { title: `Save order twice${tag()}`, event_type: 'SCENE', story_time_sort: 2, summary: 's', prose: '<p>Saved text.</p>' })
  await setStructure([{ chapter_id: ids.chapter, scene_ids: [ids.leftover, ids.twice] }])
})

// A scene with a leftover local draft opens with unsaved changes; the save
// that runs when an editor goes away (React's development remount does
// that at once) used to race the writer's own save and could land last.
test('an earlier save never lands after a later one', async ({ page }) => {
  const seen = watch(page)
  await page.addInitScript(([key]) => {
    localStorage.setItem(key!, JSON.stringify({ content: '<p>Draft text.</p>', title: 'Save order leftover', savedAt: Date.now() - 60_000 }))
  }, [`aa-scene-draft-${ids.leftover}`])
  const first = await holdFirstPatch(page)
  await page.goto(`/scenes?id=${ids.leftover}`)
  await expect(editor(page)).toContainText('Draft text.')
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Then the newest words.')
  await page.keyboard.press('ControlOrMeta+s')

  await first.landed
  await expect.poll(() => prose(ids.leftover)).toContain('Then the newest words.')
  // Still there once every write has gone through.
  await page.waitForTimeout(500)
  expect(await prose(ids.leftover)).toContain('Then the newest words.')
  expect(seen.problems).toEqual([])
})

test('Cmd/Ctrl+S during a running save is not dropped', async ({ page }) => {
  const seen = watch(page)
  const first = await holdFirstPatch(page)
  await page.goto(`/scenes?id=${ids.twice}`)
  await editor(page).getByText('Saved text.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' One.')
  await page.keyboard.press('ControlOrMeta+s')
  await page.keyboard.type(' Two.')
  await page.keyboard.press('ControlOrMeta+s')

  await first.landed
  // Autosave would only come 45 s later; the second save must follow the first.
  await expect.poll(() => prose(ids.twice), { timeout: 5000 }).toContain('Saved text. One. Two.')
  expect(seen.problems).toEqual([])
})
