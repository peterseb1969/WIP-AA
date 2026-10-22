import { expect, test } from '@playwright/test'
import { create, doc, pick, term, terms } from './support/book'
import { watch } from './support/page'

// Merging two characters through the Characters page: select both, keep one,
// read the preview, merge. The stored data proves what happened: references
// rewritten, empty fields filled, the absorbed entry retired and its term
// deprecated in favour of the kept one.
const ids = { tLinora: '', tLinnie: '', linora: '', linnie: '', scene: '' }
// One pair per --repeat-each pass: names are identities, and a pass's
// survivor stays in the list for the next pass.
const pair = () => pick([
  { keep: { value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', alias: 'Linora' }, absorb: { value: 'LINNIE', label: 'Linnie Rowe', alias: 'Linnie' } },
  { keep: { value: 'MASTER_ODO_FENWICK', label: 'Master Odo Fenwick', alias: 'Odo' }, absorb: { value: 'ODIE', label: 'Odie Barr', alias: 'Odie' } },
  { keep: { value: 'CAPTAIN_SELA_MOORE', label: 'Captain Sela Moore', alias: 'Sela' }, absorb: { value: 'SELLY', label: 'Selly Quin', alias: 'Selly' } },
])

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const [tKeep, tAbsorb] = await terms('AA_CHARACTERS', [
    { value: pair().keep.value, label: pair().keep.label, aliases: [pair().keep.label, pair().keep.alias] },
    { value: pair().absorb.value, label: pair().absorb.label, aliases: [pair().absorb.alias] },
  ])
  ids.tLinora = tKeep!
  ids.tLinnie = tAbsorb!
  ids.linora = await create('AA_CHARACTER', { name: pair().keep.label, role: 'SUPPORTING', description: 'Elderly, horned.' })
  ids.linnie = await create('AA_CHARACTER', { name: pair().absorb.alias, role: 'MINOR', backstory: 'Called Linnie by her students.' })
  ids.scene = await create('AA_EVENT', { title: `Lecture ${pair().absorb.alias}`, event_type: 'SCENE', story_time_sort: 1000, summary: 's', characters: [pair().absorb.value, pair().keep.value], prose: '<p>Linnie spoke.</p>' })
})

test('merge one character into another', async ({ page }) => {
  const { keep, absorb } = pair()
  const seen = watch(page)
  await page.goto('/characters')
  await page.getByRole('button', { name: 'Merge…' }).click()
  const linnie = page.getByRole('button', { name: new RegExp(absorb.label) })
  const linora = page.getByRole('button', { name: new RegExp(keep.label) })
  await linnie.click()
  await linora.click()
  await expect(linnie).toHaveAttribute('aria-pressed', 'true')
  await expect(linora).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Merge (2)' }).click()

  const dialog = page.getByRole('dialog', { name: 'Merge characters' })
  await dialog.getByRole('radio', { name: new RegExp(keep.label) }).check()
  // The preview lists what will change before anything is written.
  await expect(dialog.getByText('1 scene', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Empty fields filled in: backstory')).toBeVisible()
  expect((await doc(ids.linnie)).status).toBe('active')

  await dialog.getByRole('button', { name: 'Merge 2' }).click()
  await expect(dialog.getByText(`Merged into ${keep.label}.`)).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: new RegExp(absorb.label) })).toHaveCount(0)

  expect((await doc(ids.scene)).data.characters).toEqual([keep.value])
  expect((await doc(ids.linora)).data).toMatchObject({ description: 'Elderly, horned.', backstory: 'Called Linnie by her students.' })
  expect((await doc(ids.linnie)).status).toBe('inactive')
  expect(await term(ids.tLinnie)).toMatchObject({ status: 'deprecated', replaced_by_term_id: ids.tLinora })
  expect((await term(ids.tLinora)).aliases).toContain(absorb.label)
  expect(seen.problems).toEqual([])
  expect(seen.dialogs).toEqual([])
})
