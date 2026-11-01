import { expect, test } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { create, pick } from './support/book'
import { watch } from './support/page'

// Several books in one app (DESIGN.md "Several books in one app"): a second
// book is set up from the book list, each book shows only its own content,
// and the server refuses a book it does not have. The tests run under the
// master key, which WIP lets create any namespace, so the operator's
// reservation is not exercised here.
const main = process.env.AA_E2E_NAMESPACE!
// One second book per --repeat-each pass: a book's name is its namespace.
const second = () => `${main}-book${test.info().repeatEachIndex + 1}`
const noteTitle = () => pick(['Only in the first book', 'Only in the first book II', 'Only in the first book III'])

test.describe.configure({ mode: 'serial' })

test('set up a second book from the book list', async ({ page }) => {
  test.setTimeout(90_000)
  const seen = watch(page)
  await page.goto('/books')
  await expect(page.getByRole('heading', { name: 'Books', level: 1 })).toBeVisible()
  const list = page.getByRole('list', { name: 'Books' })
  await expect(list).toContainText(main)

  // Names are checked before anything is asked of WIP.
  const name = page.getByLabel('Name of the book')
  await name.fill('Not A Name')
  await expect(page.getByText('Lowercase letters, digits and hyphens only, starting with a letter.')).toBeVisible()
  await name.fill(main)
  await expect(page.getByText('There is already a book with this name.')).toBeVisible()

  await name.fill(second())
  await expect(page.getByText(`wip-deploy app-namespace add wip-aa ${second()} --setting deletion_mode=full`).first()).toBeVisible()
  await page.getByRole('button', { name: 'Set up the book' }).click()

  await expect(page).toHaveURL(new RegExp(`/book/${second()}/$`))
  await expect(page.getByText('Book not set up yet')).toBeVisible()
  await page.getByRole('button', { name: 'Bootstrap', exact: true }).click()
  await expect(page.getByRole('link', { name: new RegExp(`Book: ${second()}`) })).toBeVisible({ timeout: 60_000 })

  const ns = (await wipFetch('GET', `/api/registry/namespaces/${second()}`)).json as { prefix: string; deletion_mode: string }
  expect(ns).toMatchObject({ prefix: second(), deletion_mode: 'full' })
  expect(seen.problems).toEqual([])
})

test('each book shows only its own content', async ({ page }) => {
  const seen = watch(page)
  await create('AA_NOTE', { title: noteTitle(), note_type: 'IDEA', content: 'Written into the first book.' })

  await page.goto(`/book/${main}/notes`)
  await expect(page.getByText(noteTitle(), { exact: true })).toBeVisible()

  await page.goto(`/book/${second()}/notes`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(`Book: ${second()}`) })).toBeVisible()
  await expect(page.getByText(noteTitle(), { exact: true })).toHaveCount(0)
  expect(seen.problems).toEqual([])
})

test('the book list switches books, and a URL without a book opens the last one', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/book/${second()}/`)
  await page.getByRole('link', { name: /All books/ }).click()
  await expect(page).toHaveURL(/\/books$/)
  // The first book's Open link (other books' names start with its name).
  await page.locator(`a[href$="/book/${main}/"]`).click()
  await expect(page).toHaveURL(new RegExp(`/book/${main}/$`))

  // An old link without a book: the page opens in the book used last.
  await page.goto('/notes')
  await expect(page).toHaveURL(new RegExp(`/book/${main}/notes$`))
  await expect(page.getByText(noteTitle(), { exact: true })).toBeVisible()
  expect(seen.problems).toEqual([])
})

test('the server refuses a book it does not have', async ({ request }) => {
  expect((await request.get(`/api/book/contents?book=${second()}`)).status()).toBe(200)
  const unknown = await request.get('/api/book/contents?book=no-such-book')
  expect(unknown.status()).toBe(404)
  expect(await unknown.json()).toMatchObject({ error: 'unknown_book' })
  expect((await request.get('/api/book/contents')).status()).toBe(400)
  // Not one of this app's books, though the key can see it.
  expect((await request.get('/api/book/contents?book=wip')).status()).toBe(400)
})
