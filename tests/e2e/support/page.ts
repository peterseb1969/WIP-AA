import type { Page } from '@playwright/test'

/**
 * Collects what the page reports while a test runs: uncaught errors, console
 * errors and native dialogs (alert/confirm). Playwright dismisses dialogs on
 * its own; recording them makes an unexpected one fail the test instead of
 * passing silently.
 */
export function watch(page: Page) {
  const problems: string[] = []
  const dialogs: string[] = []
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`) })
  page.on('dialog', async (dialog) => { dialogs.push(`${dialog.type()}: ${dialog.message()}`); await dialog.dismiss() })
  return { problems, dialogs }
}
