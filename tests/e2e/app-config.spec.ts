import { expect, test, type Page } from '@playwright/test'

// The app learns its WIP namespace from GET <base>/api/app-config before the
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

test('the server has no namespace configured', async ({ page }) => {
  await page.route('**/api/app-config', (route) => route.fulfill({ json: { namespace: null } }))
  await expectConfigError(page, /no WIP namespace configured \(WIP_NAMESPACE\)/)
})

test('the server cannot be reached', async ({ page }) => {
  await page.route('**/api/app-config', (route) => route.abort('connectionrefused'))
  await expectConfigError(page, /fetch/i)
})
