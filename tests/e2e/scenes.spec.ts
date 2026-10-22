import { expect, test, type Page } from '@playwright/test'
import { bulk, wipFetch } from '../integration/support/wip'
import { setStructure } from './support/book'
import { watch } from './support/page'

// The scene editor: save, save on leave, split and merge — where the
// regressions of 2026-10-18 (split overwritten by autosave, phantom drafts)
// were only caught by hand. Every step is checked against the stored data.
const ns = process.env.AA_E2E_NAMESPACE!
const ids = { chapter: '', arrival: '', departure: '', structure: '', continued: '' }

const create = async (template: string, data: Record<string, unknown>) =>
  (await bulk('/api/document-store/documents', [{ template_id: `${ns}:${template}`, namespace: ns, data }]))[0]!.document_id!
const doc = async (id: string) =>
  (await wipFetch('GET', `/api/document-store/documents/${id}`)).json as { status: string; data: Record<string, unknown> }
const prose = async (id: string) => String((await doc(id)).data.prose ?? '')
const order = async () => ((await doc(ids.structure)).data.chapters as Array<{ scene_ids: string[] }>)[0]!.scene_ids

const editor = (page: Page) => page.getByRole('textbox', { name: 'Scene text' })

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  ids.chapter = await create('AA_CHAPTER', { title: 'Scenes chapter' })
  ids.arrival = await create('AA_EVENT', { title: 'Arrival', event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>The ferry docked at dusk.</p><p>Nobody came to meet it.</p>' })
  ids.departure = await create('AA_EVENT', { title: 'Departure', event_type: 'SCENE', story_time_sort: 2, summary: 's', prose: '<p>She left before dawn.</p>' })
  ids.structure = await setStructure([{ chapter_id: ids.chapter, scene_ids: [ids.arrival, ids.departure] }])
})

test('type and save with Cmd/Ctrl+S', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.arrival}`)
  await editor(page).getByText('The ferry docked at dusk.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Gulls circled.')
  await page.keyboard.press('ControlOrMeta+s')
  await expect.poll(() => prose(ids.arrival)).toContain('The ferry docked at dusk. Gulls circled.')
  expect(seen.problems).toEqual([])
})

test('saves when leaving the scene', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.arrival}`)
  await editor(page).getByText('Nobody came to meet it.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' The lamps went out.')
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect.poll(() => prose(ids.arrival)).toContain('Nobody came to meet it. The lamps went out.')
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})

test('split after the paragraph with the cursor', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.arrival}`)
  await editor(page).getByText('The ferry docked at dusk.').click()
  await page.getByRole('button', { name: 'Split' }).click()
  await expect(page).not.toHaveURL(new RegExp(ids.arrival))
  ids.continued = new URL(page.url()).searchParams.get('id')!

  await expect.poll(order).toEqual([ids.arrival, ids.continued, ids.departure])
  expect(await prose(ids.arrival)).toBe('<p>The ferry docked at dusk. Gulls circled.</p>')
  expect(await prose(ids.continued)).toBe('<p>Nobody came to meet it. The lamps went out.</p>')
  expect((await doc(ids.continued)).data.title).toBe('Arrival (continued)')
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})

test('merge it back into the previous scene', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.continued}`)
  await page.getByRole('button', { name: 'Merge with the previous or next scene' }).click()
  const dialog = page.getByRole('dialog', { name: /Merge “Arrival \(continued\)”/ })
  await dialog.getByLabel(/With the previous scene/).check()
  await dialog.getByRole('button', { name: 'Merge', exact: true }).click()
  await expect(dialog).toBeHidden()

  await expect.poll(order).toEqual([ids.arrival, ids.departure])
  expect(await prose(ids.arrival)).toContain('Gulls circled.')
  expect(await prose(ids.arrival)).toContain('The lamps went out.')
  expect((await doc(ids.continued)).status).toBe('inactive')
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})
