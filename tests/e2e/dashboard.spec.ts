import { expect, test } from '@playwright/test'
import { create, pick, tag, terms } from './support/book'
import { watch } from './support/page'

// The Dashboard's Recent Scenes show where a scene is set by the location's
// name. Scenes store the location's term value ("SALT_CELLAR"), which used to
// be printed as it is.
const place = () => pick([
  { value: 'SALT_CELLAR', label: 'The Salt Cellar' },
  { value: 'NORTH_QUAY', label: 'North Quay' },
  { value: 'OLD_CUSTOMS_HOUSE', label: 'The Old Customs House' },
])

test('recent scenes name their location', async ({ page }) => {
  const seen = watch(page)
  const { value, label } = place()
  await terms('AA_LOCATIONS', [{ value, label, aliases: [label] }])
  const title = `Down in the cellar${tag()}`
  await create('AA_EVENT', { title, event_type: 'SCENE', story_time_sort: 1, summary: 's', location: value })

  await page.goto('/')
  const recent = page.getByRole('link', { name: new RegExp(title) })
  await expect(recent).toContainText(label)
  await expect(recent).not.toContainText(value)
  expect(seen.problems).toEqual([])
})
