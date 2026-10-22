import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { pick } from './support/book'
import { watch } from './support/page'

// Create → view → update one character through the UI; the WIP API checks
// what was stored (the UI showing a change does not prove it was saved).
const ns = process.env.AA_E2E_NAMESPACE!

async function characters() {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:AA_CHARACTER`, status: 'active', page_size: 50 })
  return (json as { items: Array<{ document_id: string; version: number; data: Record<string, unknown> }> }).items
}

// One name per --repeat-each pass: the name is the character's identity.
const names = () => pick([
  { label: 'Wren Halloway', value: 'WREN_HALLOWAY' },
  { label: 'Ivo Marrick', value: 'IVO_MARRICK' },
  { label: 'Tamsin Oddly', value: 'TAMSIN_ODDLY' },
])
const stored = async () => (await characters()).filter((c) => c.data.name === names().value)

test.describe.configure({ mode: 'serial' })

test('create a character', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/characters')
  await page.getByRole('button', { name: 'New Character' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Character' })
  await dialog.getByLabel('Name').fill(names().label)
  await dialog.getByLabel('Role').selectOption({ label: 'Protagonist' })
  await dialog.getByLabel('Description').fill('A lighthouse keeper.')
  await dialog.getByRole('button', { name: 'Create Character' }).click()

  await expect(page.getByRole('button', { name: new RegExp(names().label) })).toBeVisible()
  const created = await stored()
  expect(created).toHaveLength(1)
  expect(created[0]!.data).toMatchObject({ name: names().value, role: 'PROTAGONIST', description: 'A lighthouse keeper.' })
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})

test('view and update it without creating a second one', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/characters')
  await page.getByRole('button', { name: new RegExp(names().label) }).click()
  await expect(page.getByRole('heading', { name: names().label })).toBeVisible()
  await expect(page.getByText('A lighthouse keeper.')).toBeVisible()

  await page.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Character' })
  await dialog.getByLabel('Description').fill('A lighthouse keeper who hears ships nobody else does.')
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  // The dialog closes once WIP has accepted the write.
  await expect(dialog).toBeHidden()
  await expect(page.getByText('A lighthouse keeper who hears ships nobody else does.')).toBeVisible()

  await expect.poll(async () => (await stored()).map((c) => [c.version, c.data.description])).toEqual([[2, 'A lighthouse keeper who hears ships nobody else does.']])
  expect(seen.problems).toEqual([])
})
