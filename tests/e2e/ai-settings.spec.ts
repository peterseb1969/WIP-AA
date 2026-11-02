import { expect, test, type Page } from '@playwright/test'
import { wipFetch } from '../integration/support/wip'
import { watch } from './support/page'

// Settings → AI models (DESIGN.md "AI models: providers and their uses"):
// set up the settings namespace, add a provider, assign it to the Ask bar,
// save; the WIP API checks what was stored. Model lists and Tests reach real
// providers on the server, so they are stubbed here: the UI around them is
// under test, not oMLX or Anthropic. The tests run under the master key, so
// the operator's reservation is not exercised.
const settingsNs = process.env.AA_E2E_SETTINGS_NAMESPACE!

async function stored() {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${settingsNs}:AA_AI_SETTINGS`, status: 'active', page_size: 5 })
  return (json as { items: Array<{ version: number; data: { providers: Array<Record<string, string>>; assignments: Array<{ use: string; provider_id: string; model: string }> } }> }).items
}

const section = (page: Page) => page.getByRole('region', { name: 'AI models' })

test.describe.configure({ mode: 'serial' })

test('set up model choice: the defaults are stored as version 1', async ({ page }) => {
  test.setTimeout(60_000)
  const seen = watch(page)
  await page.goto('/settings')
  const ai = section(page)
  await expect(ai.getByText('Model choice is not set up yet.', { exact: false })).toBeVisible()
  await expect(ai.getByText(`wip-deploy app-namespace add wip-aa ${settingsNs}`)).toBeVisible()
  await ai.getByRole('button', { name: 'Set up model choice' }).click()
  await expect(ai.getByText('Version 1')).toBeVisible({ timeout: 40_000 })

  const docs = await stored()
  expect(docs).toHaveLength(1)
  expect(docs[0]!.data.providers.map((p) => p.provider_id)).toEqual(['claude'])
  expect(docs[0]!.data.assignments.map((a) => `${a.use}:${a.provider_id}`)).toEqual(['ASK:claude', 'ANALYSE:claude', 'IMPORT_EXTRACT:claude'])
  expect(seen.problems).toEqual([])
})

test('add a local provider and give it the Ask bar', async ({ page }) => {
  const seen = watch(page)
  await page.route(/\/server-api\/config\/ai\/models$/, (route) => route.fulfill({ json: { models: ['Qwen3.8-Flash-Next', 'Other-Model'] } }))
  await page.route(/\/server-api\/config\/ai\/test$/, (route) => route.fulfill({ json: { ok: true, ms: 1234, toolCall: true } }))
  await page.goto('/settings')
  const ai = section(page)
  await expect(ai.getByText('Version 1')).toBeVisible()

  await ai.getByRole('button', { name: 'Add provider' }).click()
  const row = ai.getByRole('list', { name: 'Providers' }).getByRole('listitem').last()
  await row.getByLabel('Name').fill('Local Qwen')
  await row.getByLabel('ID (lowercase, no spaces)').fill('local')
  await row.getByLabel('Address (as the server reaches it)').fill('http://host.containers.internal:8092')
  await expect(row.getByText('No key needed')).toBeVisible()
  await row.getByRole('button', { name: 'Load models' }).click()
  await expect(row.getByText('2 models')).toBeVisible()

  const ask = ai.getByRole('group', { name: 'Ask bar' })
  await ask.getByLabel('Provider').selectOption({ label: 'Local Qwen' })
  await ask.getByLabel('Model').fill('Qwen3.8-Flash-Next')
  await ask.getByRole('button', { name: 'Test (with a tool)' }).click()
  await expect(ask.getByRole('status')).toHaveText('Works (1.2 s)')

  await ai.getByRole('button', { name: 'Save' }).click()
  await expect(ai.getByText('Saved')).toBeVisible()
  await expect(ai.getByText('Version 2')).toBeVisible()

  const doc = (await stored())[0]!
  expect(doc.version).toBe(2)
  expect(doc.data.providers.find((p) => p.provider_id === 'local')).toEqual({ provider_id: 'local', label: 'Local Qwen', base_url: 'http://host.containers.internal:8092' })
  expect(doc.data.assignments.find((a) => a.use === 'ASK')).toMatchObject({ provider_id: 'local', model: 'Qwen3.8-Flash-Next' })
  expect(doc.data.assignments.find((a) => a.use === 'ANALYSE')).toMatchObject({ provider_id: 'claude' })
  expect(seen.problems).toEqual([])
})

test('a key variable that could name a server secret is refused', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/settings')
  const ai = section(page)
  // Rows are in stored order: Claude, then the local provider.
  const local = ai.getByRole('list', { name: 'Providers' }).getByRole('listitem').nth(1)
  await expect(local.getByLabel('ID (lowercase, no spaces)')).toHaveValue('local')
  await local.getByLabel('Key variable (empty: no key)').fill('WIP_API_KEY')
  await ai.getByRole('button', { name: 'Save' }).click()
  await expect(ai.getByRole('alert')).toContainText('the key variable must be ANTHROPIC_API_KEY or start with AI_KEY_')

  // Nothing stored: still version 2, still without a key variable.
  const doc = (await stored())[0]!
  expect(doc.version).toBe(2)
  expect(doc.data.providers.find((p) => p.provider_id === 'local')?.key_env).toBeUndefined()
  // The refusal is the expected 400 (and the browser's console line for it); nothing else may fail.
  expect(seen.problems).toEqual([
    expect.stringMatching(/^http 400: PUT .*\/server-api\/config\/ai$/),
    'console: Failed to load resource: the server responded with a status of 400 (Bad Request)',
  ])
})
