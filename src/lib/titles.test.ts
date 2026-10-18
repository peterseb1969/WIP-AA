import { describe, expect, it } from 'vitest'
import { chapterLabel, chapterTitleShown, sceneTitleShown } from './titles'

describe('chapterTitleShown', () => {
  it.each([
    'Chapter 5',
    'chapter 12',
    'Kapitel 5',
    'KAPITEL 3.',
    'Chap. 7',
    'Kap 2',
    'Ch.4',
    'Chapter XIV',
    'Kapitel iv',
    '12',
    '  Chapter 5  ',
  ])('hides the number-only title %j', (title) => {
    expect(chapterTitleShown(title)).toBe('')
  })

  it.each([
    ['The Storm', 'The Storm'],
    ['Chapter 5: The Storm', 'Chapter 5: The Storm'],
    ['Chapter Five', 'Chapter Five'],
    ['Kapitel 5 – Der Sturm', 'Kapitel 5 – Der Sturm'],
    ['Children', 'Children'],
    ['Mind', 'Mind'],
    // "Ch"/"Kap" followed by letters that are all roman-numeral letters
    ['Child', 'Child'],
    ['Chill', 'Chill'],
    ['Chic', 'Chic'],
    ['Chapter Mild', 'Chapter Mild'],
    ['  Prologue ', 'Prologue'],
  ])('keeps the real title %j', (title, shown) => {
    expect(chapterTitleShown(title)).toBe(shown)
  })

  it('treats a missing title as empty', () => {
    expect(chapterTitleShown(undefined)).toBe('')
    expect(chapterTitleShown(null)).toBe('')
  })
})

describe('sceneTitleShown', () => {
  it.each([
    ['Ch5 Scene 1', 'Scene 1'],
    ['ch12 The Harbour', 'The Harbour'],
    ['Ch. 3 Arrival', 'Arrival'],
    ['Kap 2 Ankunft', 'Ankunft'],
  ])('drops the import prefix from %j', (title, shown) => {
    expect(sceneTitleShown(title)).toBe(shown)
  })

  it.each([
    'Scene 1',
    'Chapel at dawn',
    'Ch5',
    'Kapitel 5 Ankunft',
  ])('leaves %j alone', (title) => {
    expect(sceneTitleShown(title)).toBe(title)
  })

  it('treats a missing title as empty', () => {
    expect(sceneTitleShown(undefined)).toBe('')
  })
})

describe('chapterLabel', () => {
  const t = (key: string, options?: Record<string, unknown>) =>
    options ? `${key}(${options.number})` : key

  it('shows number and title', () => {
    expect(chapterLabel(t, 6, 'The Storm')).toBe('dashboard.ch_short(6): The Storm')
  })

  it('shows only the number when the title is just a number', () => {
    expect(chapterLabel(t, 6, 'Chapter 5')).toBe('dashboard.ch_short(6)')
    expect(chapterLabel(t, 6, 'Chapter 5', true)).toBe('scenes.chapter_label(6)')
  })

  it('shows the title of an unnumbered chapter, or "untitled"', () => {
    expect(chapterLabel(t, null, 'Prologue')).toBe('Prologue')
    expect(chapterLabel(t, null, 'Chapter 1')).toBe('chapters_page.untitled_unnumbered')
    expect(chapterLabel(t, undefined, '')).toBe('chapters_page.untitled_unnumbered')
  })
})
