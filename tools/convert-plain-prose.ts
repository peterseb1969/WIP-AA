/**
 * Converts scene prose stored as plain text into the editor's HTML. Imports
 * before 2026-10-24 stored each scene's manuscript text as is, which the
 * editor showed as one long paragraph; the import now converts it
 * (src/lib/prose.ts), and this fixes scenes imported earlier.
 *
 *   npx tsx tools/convert-plain-prose.ts --namespace aa            # list what would change
 *   npx tsx tools/convert-plain-prose.ts --namespace aa --apply    # write it
 *
 * Only active scenes whose prose does not start with a tag are touched; each
 * is written as a new version with if_match, so a scene saved in the editor
 * meanwhile is skipped, not overwritten.
 */
import 'dotenv/config'
import { readFileSync } from 'fs'
import { createWipClient } from '@wip/client'
import { proseFromText } from '../src/lib/prose'

const args = process.argv.slice(2)
const NS = args[args.indexOf('--namespace') + 1]
if (!args.includes('--namespace') || !NS) throw new Error('--namespace <ns> is required')
const apply = args.includes('--apply')

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'
const BASE = process.env.WIP_BASE_URL ?? 'https://localhost:8443'
const KEY = process.env.WIP_API_KEY ?? readFileSync(process.env.WIP_API_KEY_FILE!, 'utf8').trim()
const wip = createWipClient({ baseUrl: BASE, auth: { type: 'api-key', key: KEY } })

type Scene = { document_id: string; version: number; data: { title: string; prose?: string } }

async function main() {
  const res = await fetch(`${BASE}/api/document-store/documents/query`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: `${NS}:AA_EVENT`, status: 'active', page_size: 1000 }),
  })
  if (!res.ok) throw new Error(`query: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
  const scenes = ((await res.json()) as { items: Scene[] }).items
  const plain = scenes.filter((s) => (s.data.prose ?? '').trim() && !/^\s*</.test(s.data.prose!))
  console.log(`${NS}: ${scenes.length} scenes, ${plain.length} with plain-text prose`)

  let done = 0
  for (const scene of plain) {
    const html = proseFromText(scene.data.prose!)
    const paragraphs = html.match(/<p>/g)?.length ?? 0
    if (!apply) { console.log(`  would convert "${scene.data.title}" (v${scene.version}, ${paragraphs} paragraphs)`); continue }
    try {
      await wip.documents.updateDocument(scene.document_id, { prose: html }, { ifMatch: scene.version })
      done++
      console.log(`  converted "${scene.data.title}" (${paragraphs} paragraphs)`)
    } catch (err) {
      console.log(`  SKIPPED "${scene.data.title}": ${(err as Error).message}`)
    }
  }
  if (apply) console.log(`converted ${done} of ${plain.length}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
