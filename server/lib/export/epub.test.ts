import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { ExportBook } from './book'
import { toEpub } from './epub'
import { parseProse } from './prose'

const book: ExportBook = {
  title: 'Low Water & Other Tides',
  author: 'Marta Lindqvist',
  chapters: [
    { number: null, title: 'Prologue', scenes: [{ title: 'P', blocks: parseProse('<p>One.</p>') }] },
    { number: 1, title: 'The Ferry', scenes: [
      { title: 'Arrival', blocks: parseProse('<p>She was <em>late</em> &lt;again&gt;.</p><p>Second.</p>') },
      { title: 'Departure', blocks: parseProse('<p>Gone.</p>') },
    ] },
  ],
}

async function open(sceneTitles = false) {
  const bytes = await toEpub(book, { lang: 'en', sceneTitles }, new Date('2026-10-24T20:00:00.123Z'))
  const zip = await JSZip.loadAsync(bytes)
  const read = (name: string) => zip.file(name)!.async('string')
  return { bytes, zip, read }
}

describe('EPUB export', () => {
  it('starts with an uncompressed mimetype entry, as readers require', async () => {
    const { bytes } = await open()
    // Local file header: name at offset 30, compression method (0 = stored) at offset 8.
    expect(bytes.subarray(30, 38).toString()).toBe('mimetype')
    expect(bytes.readUInt16LE(8)).toBe(0)
    expect(bytes.subarray(38, 58).toString()).toBe('application/epub+zip')
  })

  it('lists title page, contents and every chapter in reading order', async () => {
    const { read } = await open()
    expect(await read('META-INF/container.xml')).toContain('full-path="OEBPS/content.opf"')
    const opf = await read('OEBPS/content.opf')
    expect(opf).toContain('<dc:title>Low Water &amp; Other Tides</dc:title>')
    expect(opf).toContain('<dc:creator>Marta Lindqvist</dc:creator>')
    expect(opf).toContain('<meta property="dcterms:modified">2026-10-24T20:00:00Z</meta>')
    expect([...opf.matchAll(/<itemref idref="([^"]+)"/g)].map((m) => m[1])).toEqual(['title', 'nav', 'ch1', 'ch2'])
    expect(await read('OEBPS/nav.xhtml')).toContain('<a href="chapter-002.xhtml">Chapter 1: The Ferry</a>')
  })

  it('writes escaped prose with scene breaks and unindented first paragraphs', async () => {
    const { read } = await open()
    const ch = await read('OEBPS/chapter-002.xhtml')
    expect(ch).toContain('<h1>Chapter 1: The Ferry</h1>')
    expect(ch).toContain('<p class="first">She was <em>late</em> &lt;again&gt;.</p>\n<p>Second.</p>\n<p class="scene-break">* * *</p>\n<p class="first">Gone.</p>')
    expect(ch).not.toContain('Arrival')
    expect(await (await open(true)).read('OEBPS/chapter-002.xhtml')).toContain('<h2>Arrival</h2>')
  })

  it('keeps the identifier stable for the same title and author', async () => {
    const id = async () => (await (await open()).read('OEBPS/content.opf')).match(/<dc:identifier id="book-id">([^<]+)</)![1]
    expect(await id()).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(await id()).toBe(await id())
  })
})
