import type { Page } from '@playwright/test'

/**
 * Collects what the page reports while a test runs: uncaught errors, console
 * errors, failed HTTP requests and native dialogs (alert/confirm). Playwright
 * dismisses dialogs on its own; recording them makes an unexpected one fail
 * the test instead of passing silently. A request that fails is recorded even
 * when the UI hides it, since a swallowed write error looks like success.
 */
export function watch(page: Page) {
  const problems: string[] = []
  const dialogs: string[] = []
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`) })
  page.on('response', (res) => { if (res.status() >= 400) problems.push(`http ${res.status()}: ${res.request().method()} ${res.url()}`) })
  page.on('requestfailed', (req) => problems.push(`request failed: ${req.method()} ${req.url()} (${req.failure()?.errorText})`))
  page.on('dialog', async (dialog) => { dialogs.push(`${dialog.type()}: ${dialog.message()}`); await dialog.dismiss() })
  return { problems, dialogs }
}
