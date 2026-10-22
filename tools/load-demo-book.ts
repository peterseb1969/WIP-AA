/**
 * Loads the demo novel (demo/book.ts) into its own namespace, or writes its
 * manuscript for testing the import.
 *
 *   npx tsx tools/load-demo-book.ts               # load into aa-demo-book
 *   npx tsx tools/load-demo-book.ts --namespace aa-demo-2
 *   npx tsx tools/load-demo-book.ts --manuscript  # only write demo/manuscript.txt
 *   npx tsx tools/load-demo-book.ts --reset       # delete the namespace first, then load
 *
 * Prefer a new namespace name over --reset: on WIP as of 2026-10-22, a
 * namespace deleted and created again under the same name still resolves
 * `ns:VALUE` to the deleted terminologies, so the reload fails with 404.
 *
 * The namespace is bootstrapped with the app's own bootstrap (server/seed),
 * then filled through the WIP API in the shapes the app writes. It refuses
 * `aa` (the real book) and any namespace that already exists unless --reset
 * is given. Open the book with a second app instance:
 *   WIP_NAMESPACE=aa-demo-book PORT=3018 VITE_PORT=5183 npm run dev
 * (with WIP_API_KEY set; see demo/README.md).
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { deflateSync, crc32 } from 'zlib'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createWipClient } from '@wip/client'
import * as book from '../demo/book'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }

// ── Manuscript ─────────────────────────────────────────────
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

if (flag('--manuscript')) {
  const path = join(ROOT, 'demo', 'manuscript.txt')
  writeFileSync(path, manuscript())
  console.log(`wrote ${path}`)
  process.exit(0)
}

// ── Configuration ──────────────────────────────────────────
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

async function wip(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: unknown
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, json }
}

/** Bulk writes answer 200 even when an item failed: check every item. */
async function bulk(path: string, items: unknown[]) {
  const { status, json } = await wip('POST', path, items)
  const results = (json as { results?: Array<{ status: string; error?: string; document_id?: string; id?: string }> }).results
  if (status !== 200 || !results) throw new Error(`${path}: HTTP ${status} ${JSON.stringify(json).slice(0, 300)}`)
  const failed = results.filter((r) => r.status === 'error')
  if (failed.length) throw new Error(`${path}: ${failed.map((r) => r.error).join('; ')}`)
  return results
}

async function create(template: string, items: Array<Record<string, unknown>>) {
  try {
    const results = await bulk('/api/document-store/documents', items.map((data) => ({ template_id: `${NS}:${template}`, namespace: NS, data })))
    return results.map((r) => r.document_id!)
  } catch (err) {
    throw new Error(`${template}: ${err instanceof Error ? err.message : err}`)
  }
}

// ── PNG images (solid colour + a simple shape) ─────────────
function png(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]) {
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y)
      const o = y * (width * 3 + 1) + 1 + x * 3
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function picture(shape: string, [r, g, b]: readonly number[]) {
  const light = (k: number) => [Math.min(255, r! + k), Math.min(255, g! + k), Math.min(255, b! + k)] as [number, number, number]
  const base = [r!, g!, b!] as [number, number, number]
  return png(240, 240, (x, y) => {
    const dx = x - 120, dy = y - 120
    switch (shape) {
      case 'portrait': return dx * dx + (y - 95) ** 2 < 45 ** 2 || (y > 150 && Math.abs(dx) < 70 + (y - 150) / 2) ? light(90) : base
      case 'map': return (dx / 90) ** 2 + (dy / 60) ** 2 + Math.sin(x / 9) * 0.15 < 1 ? light(70) : base
      case 'ship': return (y > 140 && y < 170 && Math.abs(dx) < 80 - (y - 140)) || (Math.abs(dx) < 4 && y > 60 && y <= 140) ? light(110) : base
      default: return y % 24 < 2 && x > 30 && x < 210 ? light(-80) : base
    }
  })
}

// ── Load ───────────────────────────────────────────────────
async function main() {
  const existing = ((await wip('GET', '/api/registry/namespaces')).json as Array<{ prefix: string }>).some((n) => n.prefix === NS)
  if (existing && !flag('--reset')) throw new Error(`namespace ${NS} already exists; pass --reset to delete and reload it`)
  if (existing) {
    const del = await wip('DELETE', `/api/registry/namespaces/${NS}?confirm=true`)
    if (del.status >= 300) throw new Error(`deleting ${NS}: HTTP ${del.status} ${JSON.stringify(del.json).slice(0, 200)}`)
    console.log(`deleted ${NS}`)
  }
  const ns = await wip('PUT', `/api/registry/namespaces/${NS}`, { description: `AuthorAssist demo book: ${book.project.title}`, deletion_mode: 'full' })
  if (ns.status !== 200) throw new Error(`creating ${NS}: HTTP ${ns.status}`)

  // The app's own bootstrap, as a writer's first launch runs it.
  const { runBootstrap, checkStatus } = await import('../server/lib/bootstrap')
  let failure = ''
  await runBootstrap((p) => { if (p.step === 'error') failure = p.detail })
  if (failure) throw new Error(`bootstrap: ${failure}`)
  if ((await checkStatus()) !== 'ready') throw new Error('bootstrap did not finish')
  console.log(`bootstrapped ${NS}`)

  // Names: terms first, then the documents that reference them.
  for (const [terminology, terms] of [['AA_CHARACTERS', book.characterTerms], ['AA_LOCATIONS', book.locationTerms], ['AA_PLOT_THREADS', book.threadTerms]] as const) {
    await bulk(`/api/def-store/terminologies/${NS}:${terminology}/terms?namespace=${NS}`, terms)
  }
  const label = new Map(book.threadTerms.map((t) => [t.value, t.label]))
  await create('AA_PROJECT', [book.project])
  const characterIds = new Map(book.characters.map((c, i) => [c.name, i]))
  const charDocs = await create('AA_CHARACTER', book.characters)
  const locDocs = await create('AA_LOCATION', book.locations)
  const threadDocs = await create('AA_PLOT_THREAD', book.threads.map((t) => ({ ...t, title: label.get(t.title) })))

  // Chapters and scenes, then the book structure that orders them.
  const sceneIds = new Map<string, string>()
  const chapterIds = new Map<string, string>()
  const slots = []
  for (const chapter of book.chapters) {
    const { key, heading: _heading, scenes, number_start, unnumbered, ...data } = chapter
    const [chapterId] = await create('AA_CHAPTER', [data])
    chapterIds.set(key, chapterId!)
    const ids = await create('AA_EVENT', scenes.map(({ key: _k, prose, ...scene }) => ({ ...scene, prose: prose.map((t) => `<p>${t}</p>`).join('') })))
    scenes.forEach((s, i) => sceneIds.set(s.key, ids[i]!))
    slots.push({ chapter_id: chapterId, scene_ids: ids, ...(number_start != null ? { number_start } : {}), ...(unnumbered ? { unnumbered } : {}) })
  }
  const { key: _wreck, prose: _none, ...wreck } = book.backstory
  await create('AA_EVENT', [wreck])
  await create('AA_BOOK_STRUCTURE', [{ book_title: book.project.title, chapters: slots }])

  const noteDocs = await create('AA_NOTE', book.notes.map((n) => ({ ...n, linked_events: (n.linked_events ?? []).map((k) => sceneIds.get(k)!) })))
  const ruleDocs = await create('AA_WORLD_RULE', book.worldRules)
  await create('AA_PROMPT', book.prompts)
  console.log(`wrote ${book.characters.length} characters, ${book.locations.length} locations, ${book.threads.length} threads, ${book.chapters.length} chapters, ${sceneIds.size + 1} events, ${book.notes.length} notes, ${book.worldRules.length} world rules, ${book.prompts.length} prompts`)

  // Images: one AA_MEDIA per file, AA_ATTACHED_TO edges to what they illustrate.
  const targets: Record<string, (key: string) => string | undefined> = {
    character: (k) => charDocs[characterIds.get(k)!],
    location: (k) => locDocs[book.locations.findIndex((l) => l.name === k)],
    thread: (k) => threadDocs[book.threads.findIndex((t) => t.title === k)],
    scene: (k) => sceneIds.get(k),
    chapter: (k) => chapterIds.get(k),
    note: (k) => noteDocs[book.notes.findIndex((n) => n.title === k)],
    world_rule: (k) => ruleDocs[book.worldRules.findIndex((r) => r.name === k)],
  }
  const client = createWipClient({ baseUrl: BASE, auth: { type: 'api-key', key: KEY } })
  let edges = 0
  for (const image of book.images) {
    const file = await client.files.uploadFile(new Blob([picture(image.shape, image.color)], { type: 'image/png' }), image.file, undefined, NS)
    const [mediaId] = await create('AA_MEDIA', [{ file: file.file_id, title: image.title, caption: image.caption, ...('credit' in image ? { credit: image.credit } : {}) }])
    const attach = image.attach.map(([kind, key, role], i) => {
      const target = targets[kind]!(key)
      if (!target) throw new Error(`image ${image.file}: no ${kind} "${key}"`)
      return { source_ref: mediaId, target_ref: target, role, sort_order: i }
    })
    if (attach.length) await create('AA_ATTACHED_TO', attach)
    edges += attach.length
  }
  console.log(`uploaded ${book.images.length} images, ${edges} attachments`)
  console.log(`done: open it with WIP_NAMESPACE=${NS} (demo/README.md)`)
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1) })
