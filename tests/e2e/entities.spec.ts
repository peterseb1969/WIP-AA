import { expect, test, type Page } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { pick } from './support/book'
import { watch } from './support/page'

// Locations, plot threads, notes and world rules: create → view → update
// through the shared entity dialog, each step checked against the stored
// document (an update must be a new version of the same document, not a
// second one). Names per --repeat-each pass.
const ns = process.env.AA_E2E_NAMESPACE!

async function stored(template: string, field: string, value: string) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', {
    template_id: `${ns}:${template}`, status: 'active', filters: [{ field: `data.${field}`, operator: 'eq', value }], page_size: 5,
  })
  return (json as { items: Array<{ document_id: string; version: number; data: Record<string, unknown> }> }).items
}

async function save(page: Page, dialogName: string, button: string) {
  const dialog = page.getByRole('dialog', { name: dialogName })
  await dialog.getByRole('button', { name: button }).click()
  await expect(dialog).toBeHidden()
}

test('location: create, view, update', async ({ page }) => {
  const seen = watch(page)
  const { label, value } = pick([
    { label: 'Gull Rock', value: 'GULL_ROCK' }, { label: 'Pilot House', value: 'PILOT_HOUSE' }, { label: 'Tide Mill', value: 'TIDE_MILL' },
  ])
  await page.goto('/locations')
  await page.getByRole('button', { name: 'New Location' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Location' })
  await dialog.getByLabel('Name').fill(label)
  await dialog.getByLabel('Type').selectOption('BUILDING')
  await dialog.getByLabel('Description').fill('A squat stone house.')
  await save(page, 'New Location', 'Create Location')

  const [created] = await stored('AA_LOCATION', 'name', value)
  expect(created?.data).toMatchObject({ name: value, type: 'BUILDING', description: 'A squat stone house.' })

  await page.getByRole('button', { name: new RegExp(label) }).click()
  await expect(page.getByRole('heading', { name: label })).toBeVisible()
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog', { name: 'Edit Location' }).getByLabel('Atmosphere').fill('Smells of tar.')
  await save(page, 'Edit Location', 'Save Changes')
  await expect(page.getByText('Smells of tar.')).toBeVisible()
  await expect.poll(async () => (await stored('AA_LOCATION', 'name', value)).map((d) => [d.document_id, d.version, d.data.atmosphere]))
    .toEqual([[created!.document_id, 2, 'Smells of tar.']])
  expect(seen.problems).toEqual([])
})

test('plot thread: create, view, update', async ({ page }) => {
  const seen = watch(page)
  const { label, value } = pick([
    { label: 'The stolen chart', value: 'THE_STOLEN_CHART' }, { label: 'A debt at sea', value: 'A_DEBT_AT_SEA' }, { label: 'The quiet lighthouse', value: 'THE_QUIET_LIGHTHOUSE' },
  ])
  await page.goto('/plot-threads')
  await page.getByRole('button', { name: 'New Thread' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Plot Thread' })
  await dialog.getByLabel('Title').fill(label)
  await dialog.getByLabel('Status').selectOption('DEVELOPING')
  await dialog.getByLabel('Description').fill('Who took it.')
  await save(page, 'New Plot Thread', 'Create Plot Thread')

  const [created] = await stored('AA_PLOT_THREAD', 'title', value)
  expect(created?.data).toMatchObject({ title: value, status: 'DEVELOPING', description: 'Who took it.' })

  const card = page.getByRole('article', { name: label })
  await expect(card).toContainText('Who took it.')
  await card.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog', { name: 'Edit Plot Thread' }).getByLabel('Description').fill('Who took it, and why.')
  await save(page, 'Edit Plot Thread', 'Save Changes')
  await expect(card).toContainText('Who took it, and why.')
  await expect.poll(async () => (await stored('AA_PLOT_THREAD', 'title', value)).map((d) => [d.document_id, d.version, d.data.description]))
    .toEqual([[created!.document_id, 2, 'Who took it, and why.']])
  expect(seen.problems).toEqual([])
})

test('note: create, view, update', async ({ page }) => {
  const seen = watch(page)
  const title = pick(['Tide tables', 'Lamp oil', 'Ferry timetable'])
  await page.goto('/notes')
  await page.getByRole('button', { name: 'New Note' }).click()
  const dialog = page.getByRole('dialog', { name: 'New Note' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByLabel('Type').selectOption('RESEARCH')
  await dialog.getByLabel('Content').fill('Check the spring tides.')
  await save(page, 'New Note', 'Create Note')

  const [created] = await stored('AA_NOTE', 'title', title)
  expect(created?.data).toMatchObject({ title, note_type: 'RESEARCH', content: 'Check the spring tides.' })

  const card = page.getByRole('article', { name: title })
  await expect(card).toContainText('Check the spring tides.')
  await card.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog', { name: 'Edit Note' }).getByLabel('Content').fill('Check the neap tides too.')
  await save(page, 'Edit Note', 'Save Changes')
  await expect(card).toContainText('Check the neap tides too.')
  await expect.poll(async () => (await stored('AA_NOTE', 'title', title)).map((d) => [d.document_id, d.version, d.data.content]))
    .toEqual([[created!.document_id, 2, 'Check the neap tides too.']])
  expect(seen.problems).toEqual([])
})

test('world rule: create, view, update', async ({ page }) => {
  const seen = watch(page)
  const name = pick(['No boats after dark', 'The bell is never rung', 'Salt keeps the drowned away'])
  await page.goto('/world-rules')
  await page.getByRole('button', { name: 'New Rule' }).click()
  const dialog = page.getByRole('dialog', { name: 'New World Rule' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Domain').fill('Custom')
  await dialog.getByLabel('Rule').fill('Nobody sails once the light is lit.')
  await save(page, 'New World Rule', 'Create World Rule')

  const [created] = await stored('AA_WORLD_RULE', 'name', name)
  expect(created?.data).toMatchObject({ name, domain: 'Custom', rule: 'Nobody sails once the light is lit.' })

  const card = page.getByRole('article', { name })
  await expect(card).toContainText('Nobody sails once the light is lit.')
  await card.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('dialog', { name: 'Edit World Rule' }).getByLabel('Implications').fill('Night crossings are smuggling.')
  await save(page, 'Edit World Rule', 'Save Changes')
  await expect.poll(async () => (await stored('AA_WORLD_RULE', 'name', name)).map((d) => [d.document_id, d.version, d.data.implications]))
    .toEqual([[created!.document_id, 2, 'Night crossings are smuggling.']])
  expect(seen.problems).toEqual([])
})
