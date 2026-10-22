import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { watch } from './support/page'

// "Delete book" in the Dashboard's danger zone deletes everything the app
// writes into the book, so it is afterwards exactly like a freshly
// bootstrapped one: no documents, no names, no stored image files, no title,
// and the demo book is offered again. Runs on the import project's own app
// instance and namespace; fills the book with the demo first.
const ns = process.env.AA_E2E_IMPORT_NAMESPACE!
const TEMPLATES = ['AA_PROJECT', 'AA_CHAPTER', 'AA_EVENT', 'AA_CHARACTER', 'AA_LOCATION', 'AA_PLOT_THREAD', 'AA_NOTE', 'AA_WORLD_RULE', 'AA_BOOK_STRUCTURE', 'AA_MEDIA', 'AA_ATTACHED_TO', 'AA_PROMPT']

async function active(template: string) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:${template}`, status: 'active', page_size: 100 })
  return (json as { items: Array<{ data: Record<string, unknown> }> }).items
}
async function names(terminology: string) {
  const { json } = await wipFetch('GET', `/api/def-store/terminologies/${ns}:${terminology}/terms?namespace=${ns}&page_size=100`)
  return (json as { items: unknown[] }).items.length
}

test('delete the whole book from the danger zone', async ({ page }) => {
  const seen = watch(page)
  // A book with every kind of content: the demo.
  expect((await page.request.delete('/api/book')).status()).toBe(200)
  const loaded = await page.request.post('/server-api/demo/load')
  expect(await loaded.text()).toContain('event: complete')
  const files = (await active('AA_MEDIA')).map((m) => String(m.data.file))
  expect(files).toHaveLength(6)

  await page.goto('/')
  await page.getByRole('button', { name: 'Delete book' }).click()
  const dialog = page.getByRole('dialog', { name: "Delete “The Lantern Keeper's Tide”?" })
  const contents = dialog.getByRole('list', { name: 'What is deleted' })
  await expect(contents).toContainText('Chapters8')
  await expect(contents).toContainText('Images6')
  await expect(contents).toContainText('Names23')
  await expect(contents).toContainText('Title1')

  // Only the exact title unlocks it.
  const confirm = dialog.getByRole('button', { name: 'Delete book' })
  const field = dialog.getByLabel("Type The Lantern Keeper's Tide to confirm:")
  await field.fill('The Lantern Keeper')
  await expect(confirm).toBeDisabled()
  await field.fill("The Lantern Keeper's Tide")
  await confirm.click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
  await expect(page.getByText('The book was deleted.')).toBeVisible()

  // Exactly like a new book.
  for (const template of TEMPLATES) expect(await active(template), template).toHaveLength(0)
  for (const terminology of ['AA_CHARACTERS', 'AA_LOCATIONS', 'AA_PLOT_THREADS']) expect(await names(terminology), terminology).toBe(0)
  for (const file of files) expect((await wipFetch('GET', `/api/document-store/files/${file}`)).status, file).toBe(404)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: "The Lantern Keeper's Tide" })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Load the demo book' })).toBeVisible()
  expect(seen.problems).toEqual([])
})
