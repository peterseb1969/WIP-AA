import { readFileSync } from 'fs'
import { expect, test, type Page } from '@playwright/test'
import { create, setStructure, tag } from './support/book'
import { watch } from './support/page'

// The manuscript export (Export page): chapters in book order with the
// numbers the app shows, an unnumbered prologue, scene breaks, marks, and
// scene titles only when asked for. Downloads are read back from disk.
const ids = { prologue: '', chapter: '', s1: '', s2: '', s3: '' }
const titles = { chapter: '', s2: '' }

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  titles.chapter = `Export harbour${tag()}`
  titles.s2 = `Export quay${tag()}`
  ids.prologue = await create('AA_CHAPTER', { title: `Prologue${tag()}` })
  ids.chapter = await create('AA_CHAPTER', { title: titles.chapter })
  ids.s1 = await create('AA_EVENT', { title: `Export dawn${tag()}`, event_type: 'PROLOGUE', story_time_sort: 1, summary: 's', prose: '<p>The light went out.</p>' })
  ids.s2 = await create('AA_EVENT', { title: titles.s2, event_type: 'SCENE', story_time_sort: 2, summary: 's', prose: '<p>She was <em>late</em> &amp; <strong>wet</strong>.</p><p>FROM: a<br>TO: b</p>' })
  ids.s3 = await create('AA_EVENT', { title: `Export ferry${tag()}`, event_type: 'SCENE', story_time_sort: 3, summary: 's', prose: '<p>The ferry left.</p>' })
  // The prologue has no number, so the harbour chapter is Chapter 1.
  await setStructure([
    { chapter_id: ids.prologue, scene_ids: [ids.s1], unnumbered: true },
    { chapter_id: ids.chapter, scene_ids: [ids.s2, ids.s3] },
  ])
})

async function download(page: Page, format: string) {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: `Download ${format}` }).click()])
  return { name: file.suggestedFilename(), text: readFileSync((await file.path())!, 'utf8') }
}

test('Markdown: headings, scene breaks and marks', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/export')
  const { name, text } = await download(page, 'Markdown')
  expect(name).toBe('e2e-book.md')
  expect(text).toContain(`## Prologue${tag()}\n\nThe light went out.`)
  expect(text).toContain(`## Chapter 1: ${titles.chapter}\n\nShe was *late* & **wet**.\n\nFROM: a  \nTO: b\n\n***\n\nThe ferry left.`)
  expect(text).not.toContain(titles.s2)
  expect(seen.problems).toEqual([])
})

test('plain text with scene titles', async ({ page }) => {
  const seen = watch(page)
  await page.goto('/export')
  await page.getByRole('checkbox', { name: /Include scene titles/ }).check()
  const { name, text } = await download(page, 'Plain text')
  expect(name).toBe('e2e-book.txt')
  expect(text).toContain(`Chapter 1: ${titles.chapter}\n\n${titles.s2}\n\nShe was late & wet.\n\nFROM: a\nTO: b`)
  expect(seen.problems).toEqual([])
})
