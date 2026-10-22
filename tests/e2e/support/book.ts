import { test, type Page } from '@playwright/test'
import { bulk, wipFetch } from '../../integration/support/wip'

const ns = () => process.env.AA_E2E_NAMESPACE!

/**
 * Names for this pass of `--repeat-each`. All passes share the run's
 * namespace, and titles and names are identities (a second "Arrival" is a new
 * version of the first), so each pass needs its own. `pick` takes the pass's
 * entry from a list: use it where a selector matches by substring, so one
 * name must not contain another. `tag` suffixes a title (" II", " III") for
 * selectors that match exactly.
 */
export function pick<T>(options: readonly T[]): T {
  const i = test.info().repeatEachIndex
  if (i >= options.length) throw new Error(`No variant for repeat pass ${i + 1}: add one to the list`)
  return options[i]!
}
export const tag = () => pick(['', ' II', ' III', ' IV', ' V'])

export async function create(template: string, data: Record<string, unknown>) {
  return (await bulk('/api/document-store/documents', [{ template_id: `${ns()}:${template}`, namespace: ns(), data }]))[0]!.document_id!
}

/** Creates terms in one of the run's vocabularies; returns their ids in order. */
export async function terms(terminology: string, items: Array<{ value: string; label: string; aliases?: string[] }>) {
  return (await bulk(`/api/def-store/terminologies/${ns()}:${terminology}/terms?namespace=${ns()}`, items)).map((r) => r.id!)
}

export async function term(id: string) {
  return (await wipFetch('GET', `/api/def-store/terms/${id}?namespace=${ns()}`)).json as { status: string; label: string; aliases: string[]; replaced_by_term_id?: string }
}

export async function doc(id: string) {
  return (await wipFetch('GET', `/api/document-store/documents/${id}`)).json as { status: string; version: number; data: Record<string, unknown> }
}

/**
 * A book has one structure document, and the app reads the first active one;
 * so specs share it: this sets its chapters (creating it on first use) and
 * returns its id.
 */
export async function setStructure(chapters: Array<{ chapter_id: string; scene_ids: string[] }>) {
  const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns()}:AA_BOOK_STRUCTURE`, status: 'active', page_size: 5 })
  const existing = (json as { items: Array<{ document_id: string }> }).items[0]?.document_id
  if (!existing) return create('AA_BOOK_STRUCTURE', { book_title: 'E2E book', chapters })
  const res = await wipFetch('PATCH', '/api/document-store/documents', [{ document_id: existing, patch: { chapters } }])
  const item = (res.json as { results?: Array<{ status: string; error?: string }> }).results?.[0]
  if (res.status !== 200 || !item || item.status === 'error') throw new Error(`structure PATCH: ${res.status} ${JSON.stringify(res.json).slice(0, 200)}`)
  return existing
}

/** Drag with a real mouse: press, move in steps (the app starts a drag after 5 px), release. */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}
