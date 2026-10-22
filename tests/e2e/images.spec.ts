import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { create, doc, pick, terms } from './support/book'
import { watch } from './support/page'

// Images: upload one on a character page (the first image on a character
// becomes its portrait), then delete it for good from the image library.
// The stored side proves it: one AA_MEDIA document for the file, one
// AA_ATTACHED_TO edge to the character; after the delete both are retired
// and the file itself is gone.
const ns = process.env.AA_E2E_NAMESPACE!
const ids = { character: '', media: '', edge: '', file: '' }

// One character and image per --repeat-each pass.
const names = () => pick([
  { value: 'OSSIAN_MARR', label: 'Ossian Marr', image: 'ossian-at-the-quay' },
  { value: 'BRIDE_CALLOW', label: 'Bride Callow', image: 'bride-in-the-rain' },
  { value: 'KESTER_VOLE', label: 'Kester Vole', image: 'kester-asleep' },
])

// A valid 1×1 PNG, so the browser can decode what it shows.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function query(template: string, field: string, value: string, status = 'active') {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', {
    template_id: `${ns}:${template}`, status, filters: [{ field, operator: 'eq', value }], page_size: 5,
  })
  return (json as { items: Array<{ document_id: string; data: Record<string, unknown> }> }).items
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const { value, label } = names()
  await terms('AA_CHARACTERS', [{ value, label, aliases: [label] }])
  ids.character = await create('AA_CHARACTER', { name: label, role: 'SUPPORTING', description: 'Has a face worth drawing.' })
})

test('upload an image on a character page; it becomes the portrait', async ({ page }) => {
  const seen = watch(page)
  const { label, image } = names()
  await page.goto('/characters')
  await page.getByRole('button', { name: new RegExp(label) }).click()
  await expect(page.getByRole('heading', { name: label })).toBeVisible()

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add images' }).click()
  await (await chooser).setFiles({ name: `${image}.png`, mimeType: 'image/png', buffer: PNG })

  // The title is the file name without its extension.
  await expect(page.getByRole('img', { name: image })).toBeVisible()
  await expect.poll(async () => (await query('AA_MEDIA', 'data.title', image)).length).toBe(1)
  const [media] = await query('AA_MEDIA', 'data.title', image)
  ids.media = media!.document_id
  ids.file = String(media!.data.file)
  const edges = await query('AA_ATTACHED_TO', 'data.source_ref', ids.media)
  expect(edges).toHaveLength(1)
  expect(edges[0]!.data).toMatchObject({ target_ref: ids.character, role: 'PORTRAIT' })
  ids.edge = edges[0]!.document_id
  expect((await wipFetch('GET', `/api/document-store/files/${ids.file}`)).status).toBe(200)
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})

test('delete it permanently from the image library', async ({ page }) => {
  const seen = watch(page)
  const { label, image } = names()
  await page.goto('/media')
  const card = page.getByRole('article', { name: image })
  // The card says where the image is used.
  await expect(card.getByRole('link', { name: label })).toBeVisible()
  await card.getByRole('button', { name: 'Delete permanently' }).click()

  const dialog = page.getByRole('dialog', { name: `Delete “${image}” permanently?` })
  await expect(dialog.getByText('Attached to 1 place:')).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(dialog).toBeHidden()
  await expect(card).toHaveCount(0)

  expect((await doc(ids.media)).status).toBe('inactive')
  expect((await doc(ids.edge)).status).toBe('inactive')
  expect((await doc(ids.character)).status).toBe('active')
  expect((await wipFetch('GET', `/api/document-store/files/${ids.file}`)).status).toBe(404)
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})
