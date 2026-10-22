import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'url'
import { wipFetch } from '../integration/support/wip'
import { watch } from './support/page'

// The manuscript import with a stubbed AI extraction, on its own app instance
// and namespace (playwright.config.ts): upload demo/manuscript.txt, review
// the structure, extract, import, then check the stored book. The manuscript
// has front matter, a prologue, an interlude and an epilogue between numbered
// chapters, which the import used to fold into neighbouring scenes.
const ns = process.env.AA_E2E_IMPORT_NAMESPACE!
const manuscript = fileURLToPath(new URL('../../demo/manuscript.txt', import.meta.url))

type Doc = { document_id: string; data: Record<string, unknown> }
async function active(template: string) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:${template}`, status: 'active', page_size: 100 })
  return (json as { items: Doc[] }).items
}

test('import a manuscript with prologue, interlude, epilogue and front matter', async ({ page }) => {
  const seen = watch(page)
  // The summary names the chapter it was asked about, so a summary stored on
  // the wrong chapter shows.
  await page.route('**/api/import/extract', async (route) => {
    const { title } = route.request().postDataJSON() as { title: string }
    await route.fulfill({ json: {
      characters: [{ name: 'Wren Halloway', role: 'PROTAGONIST', description: 'The new keeper.' }],
      locations: [{ name: 'Cape Varn Light', type: 'BUILDING', atmosphere: 'Windy.' }],
      plotThreads: [{ title: 'Who put out the light', description: 'The 1911 mystery.' }],
      summary: `Summary of ${title}`,
    } })
  })

  await page.goto('/import')
  // Later --repeat-each passes find the previous pass's book: start fresh.
  const reset = page.getByRole('button', { name: 'Reset & import fresh' })
  const upload = page.getByRole('button', { name: 'Parse Structure' })
  await expect(reset.or(upload)).toBeVisible()
  if (await reset.isVisible()) {
    await reset.click()
    await expect(upload).toBeVisible({ timeout: 20_000 })
  }

  await page.locator('input[type="file"]').setInputFiles(manuscript)
  await upload.click()

  // Structure: nine parts; front matter is listed but not ticked, and the
  // unnumbered parts say what they are instead of a chapter number.
  await expect(page.getByText(/8\s*chapters with\s*16\s*scenes/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Front matter' })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Prologue' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'The Bell' })).toBeChecked()
  for (const label of ['Interlude', 'Epilogue', 'Ch. 1', 'Ch. 5']) await expect(page.getByText(label, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Extract Entities' }).click()
  await page.getByRole('button', { name: 'Review & Import' }).click()
  await page.getByRole('button', { name: 'Create & Import' }).click()
  await expect(page.getByText('Import Complete')).toBeVisible({ timeout: 30_000 })

  // The stored book.
  const chapters = new Map((await active('AA_CHAPTER')).map((c) => [c.document_id, c.data]))
  const scenes = new Map((await active('AA_EVENT')).map((s) => [s.document_id, s.data]))
  const [structure] = await active('AA_BOOK_STRUCTURE')
  const slots = structure!.data.chapters as Array<{ chapter_id: string; scene_ids: string[]; unnumbered?: boolean }>
  expect(slots.map((s) => [chapters.get(s.chapter_id)?.title, s.unnumbered ?? false])).toEqual([
    ['Prologue', true], ['The Grey Gull', false], ['Chapter 2', false], ['Tamsin', false],
    ['The Bell', true], ['The Logbook', false], ['Low Water', false], ['Epilogue', true],
  ])
  // Each chapter has its own summary.
  for (const s of slots) {
    const chapter = chapters.get(s.chapter_id)!
    expect(chapter.summary).toBe(`Summary of ${chapter.title}`)
  }
  const sceneOf = (i: number, j = 0) => scenes.get(slots[i]!.scene_ids[j]!)!
  expect(sceneOf(0)).toMatchObject({ event_type: 'PROLOGUE', title: 'Prologue Scene 1' })
  expect(String(sceneOf(0).prose)).toMatch(/^At ten past two the light went out/)
  expect(sceneOf(4)).toMatchObject({ event_type: 'INTERLUDE' })
  expect(sceneOf(7)).toMatchObject({ event_type: 'EPILOGUE' })
  // Chapter 1 starts with its own first line: no title page, no prologue.
  expect(sceneOf(1)).toMatchObject({ event_type: 'SCENE', title: 'Ch1 Scene 1' })
  expect(String(sceneOf(1).prose)).toMatch(/^The Grey Gull leaned into The Narrows/)
  // The scenes before an interlude or epilogue end with their own text.
  expect(String(sceneOf(3, 2).prose)).not.toContain('Interlude')
  expect(String(sceneOf(6, 1).prose)).not.toContain('Epilogue')
  expect(scenes.size).toBe(16)
  expect(seen.problems).toEqual([])
})
