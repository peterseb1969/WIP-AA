import { expect, test, type Page } from '@playwright/test'
import { create, setStructure, tag } from './support/book'
import { watch } from './support/page'

// The scene editor's Previous / Next arrows follow reading order across
// chapters: the last scene of a chapter leads to the first scene of the next
// one, empty chapters are skipped, and only the start and end of the book
// stop them. Merging with a neighbour stays within the chapter.
const ids = { chapterA: '', empty: '', chapterC: '', a1: '', a2: '', c1: '' }
const titles = { chapterA: '', chapterC: '', a2: '', c1: '' }

const previous = (page: Page) => page.getByRole('button', { name: /^Previous/ })
const next = (page: Page) => page.getByRole('button', { name: /^Next/ })

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  titles.chapterA = `Nav harbour${tag()}`
  titles.chapterC = `Nav lighthouse${tag()}`
  titles.a2 = `Nav quay${tag()}`
  titles.c1 = `Nav lamp room${tag()}`
  ids.chapterA = await create('AA_CHAPTER', { title: titles.chapterA })
  ids.empty = await create('AA_CHAPTER', { title: `Nav empty${tag()}` })
  ids.chapterC = await create('AA_CHAPTER', { title: titles.chapterC })
  ids.a1 = await create('AA_EVENT', { title: `Nav landing${tag()}`, event_type: 'SCENE', story_time_sort: 1, summary: 's', prose: '<p>One.</p>' })
  ids.a2 = await create('AA_EVENT', { title: titles.a2, event_type: 'SCENE', story_time_sort: 2, summary: 's', prose: '<p>Two.</p>' })
  ids.c1 = await create('AA_EVENT', { title: titles.c1, event_type: 'SCENE', story_time_sort: 3, summary: 's', prose: '<p>Three.</p>' })
  await setStructure([
    { chapter_id: ids.chapterA, scene_ids: [ids.a1, ids.a2] },
    { chapter_id: ids.empty, scene_ids: [] },
    { chapter_id: ids.chapterC, scene_ids: [ids.c1] },
  ])
})

test('Next leads from the last scene of a chapter into the next chapter, Previous back', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.a2}`)

  // The empty chapter (Ch. 2) is skipped.
  await expect(next(page)).toBeEnabled()
  await expect(next(page)).toContainText('Next chapter')
  await expect(next(page)).toContainText(`Ch. 3: ${titles.chapterC}`)
  await expect(next(page)).toContainText(titles.c1)
  await next(page).click()
  await expect(page).toHaveURL(new RegExp(`id=${ids.c1}`))

  await expect(previous(page)).toContainText('Previous chapter')
  await expect(previous(page)).toContainText(`Ch. 1: ${titles.chapterA}`)
  await expect(previous(page)).toContainText(titles.a2)
  // Within a chapter the arrows say Previous / Next, without a chapter.
  await previous(page).click()
  await expect(page).toHaveURL(new RegExp(`id=${ids.a2}`))
  await expect(previous(page)).not.toContainText('Previous chapter')
  await expect(previous(page)).not.toContainText(titles.chapterA)
  expect(seen.problems).toEqual([])
})

test('the arrows stop only at the start and end of the book', async ({ page }) => {
  const seen = watch(page)
  await page.goto(`/scenes?id=${ids.a1}`)
  await expect(previous(page)).toBeDisabled()
  await expect(previous(page)).toContainText('Start of book')
  await expect(next(page)).toBeEnabled()

  await page.goto(`/scenes?id=${ids.c1}`)
  await expect(next(page)).toBeDisabled()
  await expect(next(page)).toContainText('End of book')
  // Merge still only offers neighbours in the same chapter: this one has none.
  await expect(page.getByRole('button', { name: 'Merge with the previous or next scene' })).toBeDisabled()
  expect(seen.problems).toEqual([])
})
