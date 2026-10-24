import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { ExportBook } from './book'
import { approximateWords, toDocx } from './docx'
import { parseProse } from './prose'

const book: ExportBook = {
  title: 'Low Water',
  author: 'Marta Lindqvist',
  chapters: [
    { number: null, title: 'Prologue', scenes: [{ title: 'Prologue Scene 1', blocks: parseProse('<p>One.</p>') }] },
    { number: 1, title: 'The Ferry', scenes: [
      { title: 'Arrival', blocks: parseProse('<p>She was <em>late</em>.</p><p>Second paragraph.</p>') },
      { title: 'Departure', blocks: parseProse('<p>Gone.</p>') },
    ] },
  ],
}

async function xml(style: 'manuscript' | 'reading', sceneTitles = false) {
  const zip = await JSZip.loadAsync(await toDocx(book, { lang: 'en', sceneTitles, style }))
  const files = Object.keys(zip.files)
  const read = async (pattern: RegExp) => (await Promise.all(files.filter((f) => pattern.test(f)).map((f) => zip.file(f)!.async('string')))).join('')
  return { document: await read(/^word\/document\.xml$/), headers: await read(/^word\/header\d*\.xml$/), footers: await read(/^word\/footer\d*\.xml$/) }
}

describe('DOCX export', () => {
  it('manuscript format: title page with word count, header with surname, title and page', async () => {
    const { document, headers, footers } = await xml('manuscript')
    expect(document).toContain('about 10 words')
    expect(document).toContain('LOW WATER')
    expect(headers).toContain('Lindqvist / LOW WATER / ')
    expect(headers).toContain('PAGE')
    expect(footers).not.toContain('PAGE')
  })

  it('chapters are page-breaking Heading 1s with the shown numbers; scenes split by #', async () => {
    const { document } = await xml('manuscript')
    const headings = [...document.matchAll(/<w:pStyle w:val="Heading1"\/>.*?<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1])
    expect(headings).toEqual(['Prologue', 'Chapter 1: The Ferry'])
    expect(document.match(/<w:pageBreakBefore\/>/g)).toHaveLength(2)
    expect(document).toMatch(/<w:t[^>]*>#<\/w:t>/)
  })

  it('keeps marks, indents all but the first paragraph of a scene', async () => {
    const { document } = await xml('manuscript')
    expect(document).toMatch(/<w:i\/>.*?<w:t[^>]*>late<\/w:t>/)
    expect(document).toMatch(/<w:ind w:firstLine="720"\/>.*?Second paragraph/)
    expect(document).not.toMatch(/<w:ind w:firstLine="720"\/>(?:(?!<w:p>).)*She was/)
  })

  it('reading copy: footer page numbers, * * * between scenes, scene titles on request', async () => {
    const plain = await xml('reading')
    expect(plain.footers).toContain('PAGE')
    expect(plain.headers).toBe('')
    expect(plain.document).toContain('* * *')
    expect(plain.document).not.toContain('Arrival')
    expect((await xml('reading', true)).document).toMatch(/<w:pStyle w:val="Heading2"\/>.*?Arrival/)
  })

  it('rounds the word count the way title pages do', () => {
    const many = (n: number): ExportBook => ({ ...book, chapters: [{ number: 1, title: '', scenes: [{ title: '', blocks: [{ kind: 'paragraph', runs: [{ text: 'w '.repeat(n) }] }] }] }] })
    expect(approximateWords(many(4))).toBe(10)
    expect(approximateWords(many(1234))).toBe(1200)
    expect(approximateWords(many(81_620))).toBe(82_000)
  })
})
