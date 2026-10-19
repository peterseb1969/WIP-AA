import { expect, test } from '@playwright/test'
import { watch } from './support/page'

// Every sidebar page renders its heading, shows no error state and logs no
// error — on an empty, freshly bootstrapped book. The first line of defence
// when libraries change.
const pages = [
  ['/', 'Dashboard'],
  ['/scenes', 'Scene Editor'],
  ['/corkboard', 'Corkboard'],
  ['/characters', 'Characters'],
  ['/chapters', 'Chapters'],
  ['/timeline', 'Timeline'],
  ['/locations', 'Locations'],
  ['/plot-threads', 'Plot Threads'],
  ['/notes', 'Notes'],
  ['/world-rules', 'World Rules'],
  ['/media', 'Images'],
  ['/prompts', 'Prompts'],
  ['/import', 'Import Book'],
  ['/settings', 'Settings'],
] as const

for (const [path, name] of pages) {
  test(`${name} (${path}) renders without errors`, async ({ page }) => {
    const seen = watch(page)
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(seen.problems).toEqual([])
    expect(seen.dialogs).toEqual([])
  })
}
