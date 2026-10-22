/**
 * Loads the demo novel (server/demo/book.ts) into a new namespace, or writes
 * its manuscript for testing the import. In the app, an empty book offers
 * the same as "Load the demo book" (server/lib/demo-book.ts does the work).
 *
 *   npx tsx tools/load-demo-book.ts               # load into aa-demo-book
 *   npx tsx tools/load-demo-book.ts --namespace aa-demo-2
 *   npx tsx tools/load-demo-book.ts --manuscript  # only write demo/manuscript.txt
 *
 * Creates the namespace and bootstraps it with the app's own bootstrap
 * (server/seed), then loads the book. Refuses `aa` (the real book) and any
 * namespace that already exists: use a new name for a fresh copy (on WIP as
 * of 2026-10-22 a namespace deleted and created again under the same name
 * still resolves `ns:VALUE` to the deleted entries, CASE-927). Open the book
 * with a second app instance (demo/README.md).
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import * as book from '../server/demo/book'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }

// The same prose as the loaded book, in the plain-text form the import reads:
// chapter headings in the varieties the parser accepts, varied scene breaks.
function manuscript(): string {
  const breaks = ['***', '* * *', '---', '~~~']
  const out = [book.project.title.toUpperCase(), `by ${book.project.author}`, '']
  book.chapters.forEach((chapter, c) => {
    out.push('', chapter.heading, '')
    chapter.scenes.forEach((scene, s) => {
      if (s > 0) out.push('', breaks[c % breaks.length]!, '')
      out.push(scene.prose.join('\n\n'))
    })
  })
  return out.join('\n').trim() + '\n'
}

async function main() {
  if (args.includes('--manuscript')) {
    const path = join(ROOT, 'demo', 'manuscript.txt')
    writeFileSync(path, manuscript())
    console.log(`wrote ${path}`)
    return
  }

  const NS = option('--namespace') ?? 'aa-demo-book'
  if (NS === 'aa' || !/^[a-z0-9-]+$/.test(NS)) throw new Error(`refusing namespace "${NS}": the demo never writes to the real book`)
  const BASE = process.env.WIP_BASE_URL ?? 'https://localhost:8443'
  const KEY = process.env.WIP_API_KEY ?? (process.env.WIP_API_KEY_FILE ? readFileSync(process.env.WIP_API_KEY_FILE, 'utf8').trim() : '')
  if (!KEY) throw new Error('Set WIP_API_KEY_FILE (in .env) or WIP_API_KEY')
  // The local install uses a self-signed certificate.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'
  // The bootstrap module reads these when it loads, so set them first.
  process.env.WIP_NAMESPACE = NS
  process.env.WIP_BASE_URL = BASE
  process.env.WIP_API_KEY = KEY

  const headers = { 'X-API-Key': KEY, 'Content-Type': 'application/json' }
  const namespaces = await (await fetch(`${BASE}/api/registry/namespaces`, { headers })).json() as Array<{ prefix: string }>
  if (namespaces.some((n) => n.prefix === NS)) throw new Error(`namespace ${NS} already exists; pass a new name with --namespace`)
  const created = await fetch(`${BASE}/api/registry/namespaces/${NS}`, { method: 'PUT', headers, body: JSON.stringify({ description: `AuthorAssist demo book: ${book.project.title}`, deletion_mode: 'full' }) })
  if (created.status !== 200) throw new Error(`creating ${NS}: HTTP ${created.status}`)

  const { runBootstrap, checkStatus } = await import('../server/lib/bootstrap')
  let failure = ''
  await runBootstrap((p) => { if (p.step === 'error') failure = p.detail })
  if (failure) throw new Error(`bootstrap: ${failure}`)
  if ((await checkStatus()) !== 'ready') throw new Error('bootstrap did not finish')
  console.log(`bootstrapped ${NS}`)

  const { loadDemoBook } = await import('../server/lib/demo-book')
  const summary = await loadDemoBook({ namespace: NS, baseUrl: BASE, apiKey: KEY }, (p) => console.log(`  ${p.detail}`))
  console.log(`done: ${summary}. Open it with WIP_NAMESPACE=${NS} (demo/README.md)`)
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1) })
