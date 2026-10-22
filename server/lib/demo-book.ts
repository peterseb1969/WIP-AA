/**
 * Loads the demo novel (server/demo/book.ts) into a book space, through the
 * WIP API in the shapes the app writes. Used by the app (POST
 * /server-api/demo/load: "Load the demo book" in an empty book) and by
 * tools/load-demo-book.ts.
 *
 * Only an empty book takes the demo: it would otherwise mix into the
 * writer's own novel. `bookIsEmpty` is the check; `loadDemoBook` repeats it
 * before writing anything.
 */
import { deflateSync, crc32 } from 'zlib'
import { createWipClient } from '@wip/client'
import * as book from '../demo/book.js'
import { bookClient, bookIsEmpty, type BookTarget } from './book-space.js'

export { bookIsEmpty }
export type DemoTarget = BookTarget

export interface DemoProgress {
  step: string
  detail: string
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

/**
 * Writes the demo book into an empty, bootstrapped book space. Refuses a book
 * that already has documents or names.
 */
export async function loadDemoBook(t: DemoTarget, onProgress: (p: DemoProgress) => void = () => {}) {
  if (!(await bookIsEmpty(t))) throw new Error('This book already has content; the demo book is only loaded into an empty book.')
  const { bulk, create } = bookClient(t)
  const progress = (step: string, detail: string) => onProgress({ step, detail })

  progress('names', 'Creating names…')
  for (const [terminology, terms] of [['AA_CHARACTERS', book.characterTerms], ['AA_LOCATIONS', book.locationTerms], ['AA_PLOT_THREADS', book.threadTerms]] as const) {
    await bulk(`/api/def-store/terminologies/${t.namespace}:${terminology}/terms?namespace=${t.namespace}`, terms)
  }
  const label = new Map(book.threadTerms.map((x) => [x.value, x.label]))

  progress('entities', 'Creating the project, characters, locations and plot threads…')
  await create('AA_PROJECT', [book.project])
  const charDocs = await create('AA_CHARACTER', book.characters)
  const locDocs = await create('AA_LOCATION', book.locations)
  const threadDocs = await create('AA_PLOT_THREAD', book.threads.map((x) => ({ ...x, title: label.get(x.title) })))

  progress('chapters', 'Creating chapters and scenes…')
  const sceneIds = new Map<string, string>()
  const chapterIds = new Map<string, string>()
  const slots = []
  for (const chapter of book.chapters) {
    const { key, heading: _heading, scenes, number_start, unnumbered, ...data } = chapter
    const [chapterId] = await create('AA_CHAPTER', [data])
    chapterIds.set(key, chapterId!)
    const ids = await create('AA_EVENT', scenes.map(({ key: _k, prose, ...scene }) => ({ ...scene, prose: prose.map((p) => `<p>${p}</p>`).join('') })))
    scenes.forEach((s, i) => sceneIds.set(s.key, ids[i]!))
    slots.push({ chapter_id: chapterId, scene_ids: ids, ...(number_start != null ? { number_start } : {}), ...(unnumbered ? { unnumbered } : {}) })
  }
  const { key: _wreck, prose: _none, ...wreck } = book.backstory
  await create('AA_EVENT', [wreck])
  await create('AA_BOOK_STRUCTURE', [{ book_title: book.project.title, chapters: slots }])

  progress('notes', 'Creating notes, world rules and prompts…')
  const noteDocs = await create('AA_NOTE', book.notes.map((n) => ({ ...n, linked_events: (n.linked_events ?? []).map((k) => sceneIds.get(k)!) })))
  const ruleDocs = await create('AA_WORLD_RULE', book.worldRules)
  await create('AA_PROMPT', book.prompts)

  progress('images', 'Adding images…')
  const targets: Record<string, (key: string) => string | undefined> = {
    character: (k) => charDocs[book.characters.findIndex((c) => c.name === k)],
    location: (k) => locDocs[book.locations.findIndex((l) => l.name === k)],
    thread: (k) => threadDocs[book.threads.findIndex((x) => x.title === k)],
    scene: (k) => sceneIds.get(k),
    chapter: (k) => chapterIds.get(k),
    note: (k) => noteDocs[book.notes.findIndex((n) => n.title === k)],
    world_rule: (k) => ruleDocs[book.worldRules.findIndex((r) => r.name === k)],
  }
  const files = createWipClient({ baseUrl: t.baseUrl, auth: { type: 'api-key', key: t.apiKey } }).files
  let edges = 0
  for (const image of book.images) {
    const file = await files.uploadFile(new Blob([picture(image.shape, image.color)], { type: 'image/png' }), image.file, undefined, t.namespace)
    const [mediaId] = await create('AA_MEDIA', [{ file: file.file_id, title: image.title, caption: image.caption, ...('credit' in image ? { credit: image.credit } : {}) }])
    const attach = image.attach.map(([kind, key, role], i) => {
      const target = targets[kind]!(key)
      if (!target) throw new Error(`image ${image.file}: no ${kind} "${key}"`)
      return { source_ref: mediaId, target_ref: target, role, sort_order: i }
    })
    if (attach.length) await create('AA_ATTACHED_TO', attach)
    edges += attach.length
  }

  const summary = `${book.characters.length} characters, ${book.locations.length} locations, ${book.threads.length} plot threads, ${book.chapters.length} chapters, ${sceneIds.size + 1} events, ${book.notes.length} notes, ${book.worldRules.length} world rules, ${book.prompts.length} prompts, ${book.images.length} images (${edges} attachments)`
  progress('done', summary)
  return summary
}
