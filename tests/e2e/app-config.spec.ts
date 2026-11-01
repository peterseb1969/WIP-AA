import { expect, test, type Page } from '@playwright/test'

// The app learns its default book from GET <base>/api/app-config before the
// first render. If that fails, it must say so instead of guessing a namespace
// and rendering a book against the wrong one (main.tsx).
async function expectConfigError(page: Page, detail: RegExp) {
  await page.goto('/')
  await expect(page.getByText('Cannot load app configuration')).toBeVisible()
  await expect(page.getByText(detail)).toBeVisible()
  // Nothing of the app rendered, so nothing queried WIP.
  await expect(page.getByRole('navigation')).toHaveCount(0)
}

test('the config endpoint fails', async ({ page }) => {
  await page.route('**/api/app-config', (route) => route.fulfill({ status: 500, body: 'boom' }))
  await expectConfigError(page, /app-config fetch failed: HTTP 500/)
})

// Without a default book (and no book used before in this browser) the app
// opens the book list rather than guessing one.
test('the server has no default book', async ({ page }) => {
  await page.route('**/api/app-config', (route) => route.fulfill({ json: { namespace: null } }))
  await page.goto('/')
  await expect(page).toHaveURL(/\/books$/)
  await expect(page.getByRole('heading', { name: 'Books', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('the server cannot be reached', async ({ page }) => {
  await page.route('**/api/app-config', (route) => route.abort('connectionrefused'))
  await expectConfigError(page, /fetch/i)
})
