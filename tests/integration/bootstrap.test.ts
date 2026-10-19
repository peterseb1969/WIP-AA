import { readdirSync } from 'fs'
import { beforeAll, describe, expect, inject, it } from 'vitest'
import { wipFetch } from './support/wip'

// The global setup bootstrapped the run's namespace with the app's own
// bootstrap; these tests check the result against server/seed.
const seedTemplates = readdirSync('server/seed/templates').filter((f) => f.endsWith('.json'))
const seedTerminologies = readdirSync('server/seed/terminologies').filter((f) => f.endsWith('.json') && !f.startsWith('_'))

let ns = ''
beforeAll(() => { ns = inject('namespace') })

const templates = async () =>
  ((await wipFetch('GET', `/api/template-store/templates?namespace=${ns}&latest_only=false&page_size=200`)).json as { items: Array<{ value: string; version: number; status: string }> }).items

describe('bootstrap', () => {
  it('creates one active template per seed file, all at version 1', async () => {
    const items = await templates()
    expect(items.length).toBe(seedTemplates.length)
    expect(items.every((t) => t.version === 1 && t.status === 'active')).toBe(true)
    const values = items.map((t) => t.value)
    for (const v of ['AA_MEDIA', 'AA_ATTACHED_TO', 'AA_PROMPT', 'AA_BOOK_STRUCTURE', 'AA_BOOTSTRAP_RECORD']) expect(values).toContain(v)
  })

  it('creates every seed vocabulary', async () => {
    const { json } = await wipFetch('GET', `/api/def-store/terminologies?namespace=${ns}&page_size=100`)
    expect((json as { items: unknown[] }).items.length).toBe(seedTerminologies.length)
  })

  it('writes the bootstrap record last, listing what it created', async () => {
    const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${ns}:AA_BOOTSTRAP_RECORD`, page_size: 5 })
    const records = (json as { items: Array<{ data: { templates_created: string[]; terminologies_created: string[] } }> }).items
    expect(records).toHaveLength(1)
    // every template except the record's own, which must exist before the record can be written
    expect(records[0]!.data.templates_created.length).toBe(seedTemplates.length - 1)
  })

  it('can run again without creating new template versions (resume after an interrupted run)', async () => {
    process.env.WIP_NAMESPACE = ns
    const { runBootstrap, checkStatus } = await import('../../server/lib/bootstrap')
    await runBootstrap(() => {})
    expect(await checkStatus()).toBe('ready')
    const items = await templates()
    expect(items.length).toBe(seedTemplates.length)
    expect(items.every((t) => t.version === 1)).toBe(true)
  })
})
