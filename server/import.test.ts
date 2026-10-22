import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'
import { parseText } from './import'

const book = (...lines: string[]) => lines.join('\n')
const shape = (text: string) => parseText(text).map((c) => ({ number: c.number, kind: c.kind, title: c.title, scenes: c.scenes.map((s) => s.title) }))

describe('parseText', () => {
  it('reads every numbered heading form', () => {
    const chapters = parseText(book('Chapter 1: The Ferry', 'a', 'Chapter 2', 'b', 'Chapter III: Tamsin', 'c', 'Chapter 4 — The Logbook', 'd', '## 5. Low Water', 'e', 'Kapitel 6: Ende', 'f'))
    expect(chapters.map((c) => [c.number, c.title])).toEqual([[1, 'The Ferry'], [2, 'Chapter 2'], [3, 'Tamsin'], [4, 'The Logbook'], [5, 'Low Water'], [6, 'Ende']])
  })

  it('splits scenes at every break form', () => {
    const [ch] = parseText(book('Chapter 1', 'one', '***', 'two', '* * *', 'three', '---', 'four', '~~~', 'five'))
    expect(ch!.scenes.map((s) => s.prose)).toEqual(['one', 'two', 'three', 'four', 'five'])
  })

  it('makes prologue, interlude and epilogue unnumbered parts of their own', () => {
    expect(shape(book('Prologue', 'The light went out.', 'Chapter 1: The Ferry', 'Wren arrived.', 'Interlude: The Bell', 'They say it rings.', 'Chapter 2', 'Morning.', 'Epilogue', 'Years later.'))).toEqual([
      { number: null, kind: 'prologue', title: 'Prologue', scenes: ['Prologue Scene 1'] },
      { number: 1, kind: 'chapter', title: 'The Ferry', scenes: ['Ch1 Scene 1'] },
      { number: null, kind: 'interlude', title: 'The Bell', scenes: ['The Bell Scene 1'] },
      { number: 2, kind: 'chapter', title: 'Chapter 2', scenes: ['Ch2 Scene 1'] },
      { number: null, kind: 'epilogue', title: 'Epilogue', scenes: ['Epilogue Scene 1'] },
    ])
  })

  it('keeps the prose of a part apart from its neighbours', () => {
    const chapters = parseText(book('Chapter 1', 'Wren arrived.', 'Epilogue', 'Years later.'))
    expect(chapters[0]!.scenes.map((s) => s.prose)).toEqual(['Wren arrived.'])
    expect(chapters[1]!.scenes.map((s) => s.prose)).toEqual(['Years later.'])
  })

  it('reads German and markdown forms of the unnumbered headings', () => {
    expect(parseText(book('# Prolog', 'a', 'Kapitel 1', 'b', '## Zwischenspiel', 'c', 'Epilog: Danach', 'd')).map((c) => [c.kind, c.title])).toEqual([
      ['prologue', 'Prolog'], ['chapter', 'Chapter 1'], ['interlude', 'Zwischenspiel'], ['epilogue', 'Danach'],
    ])
  })

  it('does not take a sentence that starts with the word for a heading', () => {
    const [ch] = parseText(book('Chapter 1', 'Epilogue of a long day, she thought, and slept.'))
    expect(ch!.scenes.map((s) => s.prose)).toEqual(['Epilogue of a long day, she thought, and slept.'])
  })

  it('turns text before the first heading into front matter, never into chapter 1', () => {
    const chapters = parseText(book('THE TITLE', 'by Someone', '', 'Chapter 1: Start', 'First line.'))
    expect(chapters.map((c) => [c.kind, c.number, c.title])).toEqual([['front', null, 'Front matter'], ['chapter', 1, 'Start']])
    expect(chapters[0]!.scenes[0]!.prose).toBe('THE TITLE\nby Someone')
    expect(chapters[1]!.scenes.map((s) => s.prose)).toEqual(['First line.'])
  })

  it('treats a manuscript without headings as chapter 1', () => {
    expect(shape(book('one', '***', 'two'))).toEqual([{ number: 1, kind: 'chapter', title: 'Chapter 1', scenes: ['Ch1 Scene 1', 'Ch1 Scene 2'] }])
  })

  it('gives every scene a unique title when chapter numbers repeat (title is the identity)', () => {
    const titles = parseText(book('Chapter 1', 'a', 'Chapter 2', 'b', 'Chapter 1: Part Two', 'c', '***', 'd')).flatMap((c) => c.scenes.map((s) => s.title))
    expect(titles).toEqual(['Ch1 Scene 1', 'Ch2 Scene 1', 'Ch1 Scene 1 (2)', 'Ch1 Scene 2'])
  })

  it('keys chapters by position, so repeated numbers stay apart', () => {
    expect(parseText(book('Chapter 1', 'a', 'Chapter 1', 'b')).map((c) => c.key)).toEqual([0, 1])
  })

  it('reads the demo manuscript into front matter and its eight parts', () => {
    const chapters = parseText(readFileSync(new URL('../demo/manuscript.txt', import.meta.url), 'utf8'))
    expect(chapters.map((c) => [c.kind, c.number, c.title, c.scenes.length])).toEqual([
      ['front', null, 'Front matter', 1],
      ['prologue', null, 'Prologue', 1],
      ['chapter', 1, 'The Grey Gull', 3],
      ['chapter', 2, 'Chapter 2', 3],
      ['chapter', 3, 'Tamsin', 3],
      ['interlude', null, 'The Bell', 1],
      ['chapter', 4, 'The Logbook', 2],
      ['chapter', 5, 'Low Water', 2],
      ['epilogue', null, 'Epilogue', 1],
    ])
  })
})
