import { expect, test, type Page } from '@playwright/test'
import { create, setStructure, tag } from './support/book'
import { watch } from './support/page'

// On an app origin (CASE-1061) the gateway gives AA a short-lived session
// that @wip/react renews in a hidden iframe at /auth/renew, and reloads the
// page when the WIP login has ended. These tests run without the gateway.

test('the renewal iframe without a gateway starts nothing', async ({ page }) => {
  // Vite's SPA fallback serves index.html for /auth/renew; the app must not
  // boot there, or every renewal would load a whole copy of it.
  const requests: string[] = []
  page.on('request', (r) => { if (/\/(api|wip|server-api)\//.test(r.url())) requests.push(r.url()) })
  await page.goto('/auth/renew')
  await page.waitForTimeout(1500)
  expect(requests).toEqual([])
  expect(await page.locator('#root').innerHTML()).toBe('')
})

let sceneId = ''
test.beforeAll(async () => {
  const chapter = await create('AA_CHAPTER', { title: `Session chapter${tag()}` })
  sceneId = await create('AA_EVENT', { title: `Session scene${tag()}`, event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>Before the reload.</p>' })
  await setStructure([{ chapter_id: chapter, scene_ids: [sceneId] }])
})

const draftOf = (page: Page, id: string) => page.evaluate((key) => localStorage.getItem(key), `aa-scene-draft-${id}`)

test('typing kept when the page goes away before the 3-second backup', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${sceneId}`)
  const ed = page.getByRole('textbox', { name: 'Scene text' })
  await expect(ed).toBeVisible()
  await ed.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' TYPED-JUST-BEFORE-RELOAD')
  await expect(ed).toContainText('TYPED-JUST-BEFORE-RELOAD')
  // What the renewal does after a logout elsewhere: reload at once.
  await page.reload()
  expect(await draftOf(page, sceneId)).toContain('TYPED-JUST-BEFORE-RELOAD')
  expect(seen.problems).toEqual([])
})
