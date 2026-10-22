import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { watch } from './support/page'

// "Load the demo book", on the import project's own app instance and
// namespace (playwright.config.ts). This spec sorts before import.spec.ts, so
// on the first pass the book is fresh and the demo is offered and loaded; on
// later --repeat-each passes the book has content and the offer must be gone
// (the demo never mixes into a writer's own novel).
const ns = process.env.AA_E2E_IMPORT_NAMESPACE!

async function count(template: string) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:${template}`, status: 'active', page_size: 100 })
  return (json as { items: unknown[] }).items.length
}

test('the demo book is offered in an empty book and loads every part', async ({ page }) => {
  const seen = watch(page)
  const offer = page.getByRole('button', { name: 'Load the demo book' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')

  if (test.info().repeatEachIndex > 0) {
    // Not empty any more (this pass's predecessors loaded and imported books).
    await expect(offer).toHaveCount(0)
    await page.goto('/import')
    await page.waitForLoadState('networkidle')
    await expect(offer).toHaveCount(0)
    return
  }

  await offer.click()
  await expect(page.getByRole('heading', { level: 1, name: "The Lantern Keeper's Tide" }).first()).toBeVisible({ timeout: 30_000 })
  await expect(offer).toHaveCount(0)

  expect(await count('AA_CHARACTER')).toBe(9)
  expect(await count('AA_LOCATION')).toBe(8)
  expect(await count('AA_PLOT_THREAD')).toBe(6)
  expect(await count('AA_CHAPTER')).toBe(8)
  expect(await count('AA_EVENT')).toBe(17)
  expect(await count('AA_NOTE')).toBe(6)
  expect(await count('AA_WORLD_RULE')).toBe(3)
  expect(await count('AA_PROMPT')).toBe(2)
  expect(await count('AA_MEDIA')).toBe(6)
  expect(await count('AA_ATTACHED_TO')).toBe(9)
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:AA_BOOK_STRUCTURE`, status: 'active', page_size: 5 })
  const slots = (json as { items: Array<{ data: { chapters: Array<{ unnumbered?: boolean; number_start?: number }> } }> }).items[0]!.data.chapters
  expect(slots.map((s) => (s.unnumbered ? 'none' : s.number_start ?? 'continue'))).toEqual(['none', 'continue', 'continue', 'continue', 'none', 1, 'continue', 'none'])

  // The app shows it: chapters numbered as designed.
  await page.goto('/chapters')
  await expect(page.getByText('numbering restarts at 1')).toBeVisible()
  expect(seen.problems).toEqual([])
})
