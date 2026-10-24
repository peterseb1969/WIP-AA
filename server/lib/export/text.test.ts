import { describe, expect, it } from 'vitest'
import { parseText } from '../../import'
import { chapterHeading, fileStem, type ExportBook } from './book'
import { parseProse } from './prose'
import { toMarkdown, toPlainText } from './text'

const book: ExportBook = {
  title: 'The Crumbs of Meridian Tower',
  author: 'Marta Lindqvist',
  chapters: [
    { number: null, title: 'Prologue', scenes: [{ title: 'Prologue Scene 1', blocks: parseProse('<p>At half past six.</p><p>Two mice woke up.</p>') }] },
    {
      number: 1, title: 'The Warm Dark', scenes: [
        { title: 'Scene 1', blocks: parseProse('<p>Tuck woke <em>first</em>.</p>') },
        { title: 'Scene 2', blocks: parseProse('<p>The way up.</p>') },
      ],
    },
    { number: 2, title: '', scenes: [{ title: 'Scene 1', blocks: parseProse('<p>FROM: a<br>TO: b</p>') }] },
    { number: null, title: 'Epilogue', scenes: [{ title: 'Epilogue Scene 1', blocks: parseProse('<p>He was home.</p>') }] },
  ],
}
const en = { lang: 'en' as const, sceneTitles: false }

describe('parseProse', () => {
  it('reads paragraphs, marks and line breaks', () => {
    expect(parseProse('<p>A <strong>bold <em>and</em></strong> &amp; <s>gone</s></p><hr><p>x<br>y</p><p></p>')).toEqual([
      { kind: 'paragraph', runs: [{ text: 'A ' }, { text: 'bold ', bold: true }, { text: 'and', bold: true, italic: true }, { text: ' & ' }, { text: 'gone', strike: true }] },
      { kind: 'rule' },
      { kind: 'paragraph', runs: [{ text: 'x' }, { break: true }, { text: 'y' }] },
    ])
  })

  it('reads prose that was stored as plain text', () => {
    expect(parseProse('One.\n\nTwo\nlines.')).toEqual([
      { kind: 'paragraph', runs: [{ text: 'One.' }] },
      { kind: 'paragraph', runs: [{ text: 'Two' }, { break: true }, { text: 'lines.' }] },
    ])
  })

  it('decodes entities and drops empty prose', () => {
    expect(parseProse('<p>&lt;3 &#233;t&#xE9;&nbsp;&quot;x&quot;</p>')).toEqual([{ kind: 'paragraph', runs: [{ text: '<3 été "x"' }] }])
    expect(parseProse('')).toEqual([])
    expect(parseProse(null)).toEqual([])
  })
})

describe('headings and file names', () => {
  it('names chapters as the app numbers them', () => {
    expect(book.chapters.map((c) => chapterHeading(c, 'en'))).toEqual(['Prologue', 'Chapter 1: The Warm Dark', 'Chapter 2', 'Epilogue'])
    expect(chapterHeading(book.chapters[1]!, 'de')).toBe('Kapitel 1: The Warm Dark')
    expect(chapterHeading({ number: null, title: '', scenes: [] }, 'en')).toBe('Untitled chapter')
  })

  it('makes a file name from the title', () => {
    expect(fileStem(book)).toBe('the-crumbs-of-meridian-tower')
    expect(fileStem({ ...book, title: 'Café Größe!' })).toBe('cafe-grosse')
    expect(fileStem({ ...book, title: '???' })).toBe('book')
  })
})

describe('Markdown and plain text', () => {
  it('writes Markdown with marks and escapes', () => {
    const md = toMarkdown({ ...book, chapters: [{ number: 1, title: 'A *b*', scenes: [{ title: 'S', blocks: parseProse('<p><em>soft </em>edge</p><p>- not a list</p><p># nor a heading</p>') }] }] }, en)
    expect(md).toBe('# The Crumbs of Meridian Tower\n\n*by Marta Lindqvist*\n\n## Chapter 1: A \\*b\\*\n\n*soft* edge\n\n\\- not a list\n\n\\# nor a heading\n')
  })

  it('adds scene titles only when asked', () => {
    expect(toMarkdown(book, en)).not.toContain('### ')
    expect(toMarkdown(book, { ...en, sceneTitles: true })).toContain('### Scene 2\n\nThe way up.')
    expect(toPlainText(book, { ...en, sceneTitles: true })).toContain('***\n\nScene 2\n\nThe way up.')
  })

  for (const [name, render] of [['plain text', toPlainText], ['Markdown', toMarkdown]] as const) {
    it(`reads back through the import: ${name}`, () => {
      const parsed = parseText(render(book, en)).filter((c) => c.kind !== 'front')
      expect(parsed.map((c) => [c.kind, c.number, c.scenes.length])).toEqual([
        ['prologue', null, 1], ['chapter', 1, 2], ['chapter', 2, 1], ['epilogue', null, 1],
      ])
      expect(parsed[1]!.title).toBe('The Warm Dark')
      expect(parsed[0]!.scenes[0]!.prose).toBe('At half past six.\n\nTwo mice woke up.')
      expect(parsed[2]!.scenes[0]!.prose).toMatch(/^FROM: a\s*\nTO: b$/)
    })
  }
})
