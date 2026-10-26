import { readdirSync } from 'fs'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { bulk, NAMESPACE_PREFIX, wipClient, wipFetch } from './support/wip'

// The global setup bootstrapped the run's namespace with the app's own
// bootstrap; these tests check the result against server/seed.
const seedTemplates = readdirSync('server/seed/templates').filter((f) => f.endsWith('.json'))
const seedTerminologies = readdirSync('server/seed/terminologies').filter((f) => f.endsWith('.json') && !f.startsWith('_'))

let ns = ''
beforeAll(() => { ns = inject('namespace') })

const templates = async (namespace = ns) =>
  ((await wipFetch('GET', `/api/template-store/templates?namespace=${namespace}&latest_only=false&page_size=200`)).json as { items: Array<{ value: string; version: number; status: string }> }).items

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

  it('refuses to run again on a finished namespace, writing nothing', async () => {
    process.env.WIP_NAMESPACE = ns
    const { runBootstrap } = await import('../../server/lib/bootstrap')
    await expect(runBootstrap(() => {})).rejects.toThrow(/already complete/)
    expect((await templates()).every((t) => t.version === 1)).toBe(true)
  })
})

// A resume is only safe on a namespace nobody uses yet. These steps need a
// namespace of their own: the run's namespace holds the other test files'
// documents. The bootstrap reads WIP_NAMESPACE when it is imported, hence
// resetModules.
describe('resuming an interrupted bootstrap', () => {
  const own = `${NAMESPACE_PREFIX}resume-${Date.now()}`
  let boot: typeof import('../../server/lib/bootstrap')
  const deleteRecord = async () => {
    const { json } = await wipFetch('POST', '/api/document-store/documents/query', { template_id: `${own}:AA_BOOTSTRAP_RECORD`, page_size: 5 })
    const ids = (json as { items: Array<{ document_id: string }> }).items.map((d) => d.document_id)
    expect(ids).toHaveLength(1)
    await wipClient().documents.deleteDocuments(ids, { hardDelete: true })
  }

  beforeAll(async () => {
    await wipFetch('PUT', `/api/registry/namespaces/${own}`, { description: 'AA integration test: bootstrap resume (deleted afterwards)', deletion_mode: 'full' })
    process.env.WIP_NAMESPACE = own
    vi.resetModules()
    boot = await import('../../server/lib/bootstrap')
    await boot.runBootstrap(() => {})
  }, 120_000)
  afterAll(async () => { await wipFetch('DELETE', `/api/registry/namespaces/${own}?confirm=true`) })

  it('offers a resume on an empty namespace without a record, and the resume adds no template versions', async () => {
    await deleteRecord()
    expect(await boot.checkStatus()).toBe('incomplete')
    await boot.runBootstrap(() => {})
    expect(await boot.checkStatus()).toBe('ready')
    const items = await templates(own)
    expect(items.length).toBe(seedTemplates.length)
    expect(items.every((t) => t.version === 1)).toBe(true)
  }, 120_000)

  it('blocks a resume once the namespace holds documents, and the run refuses it', async () => {
    await bulk('/api/document-store/documents', [{ template_id: `${own}:AA_NOTE`, namespace: own, data: { title: 'Resume guard probe', note_type: 'IDEA', content: 'x' } }])
    await deleteRecord()
    const detail = await boot.checkStatusDetail()
    expect(detail.status).toBe('resume_blocked')
    expect(detail.message).toContain(`'${own}' (1 document)`)
    await expect(boot.runBootstrap(() => {})).rejects.toThrow(/Cannot resume bootstrap/)
    expect((await templates(own)).every((t) => t.version === 1)).toBe(true)
  }, 120_000)
})
