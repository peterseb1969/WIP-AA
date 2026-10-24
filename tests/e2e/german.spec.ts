import { readFileSync } from 'fs'
import { expect, test } from '@playwright/test'
import { watch } from './support/page'

// The German UI: switched in the sidebar, kept across a reload, and every
// page shows German text with no raw translation keys. (Missing German keys
// would fall back to English silently; src/i18n/locales.test.ts checks that
// both languages define the same keys.)
const en = JSON.parse(readFileSync(new URL('../../src/i18n/locales/en.json', import.meta.url), 'utf8')) as Record<string, unknown>
const de = JSON.parse(readFileSync(new URL('../../src/i18n/locales/de.json', import.meta.url), 'utf8')) as { nav: Record<string, string> }
// A raw key shows as "<section>.<key>", e.g. "dashboard.delete_book".
const rawKey = new RegExp(`\\b(${Object.keys(en).join('|')})\\.[a-z_]+`)

const pages = ['/', '/scenes', '/corkboard', '/characters', '/chapters', '/timeline', '/locations', '/plot-threads', '/notes', '/world-rules', '/media', '/prompts', '/import', '/export', '/settings']

test('switch to German; every page is German, no raw keys', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/')
  await page.getByLabel('Language').selectOption('de')
  const nav = page.getByRole('navigation')
  for (const label of [de.nav.characters, de.nav.locations, de.nav.world_rules, de.nav.dashboard]) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }

  await page.reload()
  await expect(page.getByLabel('Sprache')).toHaveValue('de')

  for (const path of pages) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()
    expect(text.match(rawKey)?.[0], `raw key on ${path}`).toBeUndefined()
  }
  expect(seen.problems).toEqual([])
})
