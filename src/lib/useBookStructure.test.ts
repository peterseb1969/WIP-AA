import { describe, expect, it } from 'vitest'
import {
  buildStructure,
  chapterDropBefore,
  displayNumberAfterMove,
  ruleOf,
  withChapterMoved,
  withNumbering,
  withSceneMoved,
  withSceneRemoved,
  type ChapterSlot,
} from './useBookStructure'

const slot = (chapter_id: string, extra: Partial<ChapterSlot> = {}): ChapterSlot => ({
  chapter_id,
  scene_ids: [],
  ...extra,
})

const numbers = (chapters: ChapterSlot[]) => {
  const s = buildStructure({ book_title: 'Book', chapters })
  return chapters.map((c) => s.getDisplayNumber(c.chapter_id))
}

describe('buildStructure: display numbers', () => {
  it('counts chapters in book order', () => {
    expect(numbers([slot('a'), slot('b'), slot('c')])).toEqual([1, 2, 3])
  })

  it('skips unnumbered chapters', () => {
    expect(numbers([slot('pro', { unnumbered: true }), slot('a'), slot('b'), slot('epi', { unnumbered: true })]))
      .toEqual([null, 1, 2, null])
  })

  it('restarts at number_start and counts on from there', () => {
    expect(numbers([slot('a'), slot('b'), slot('c', { number_start: 10 }), slot('d')])).toEqual([1, 2, 10, 11])
  })

  it('lets unnumbered win over number_start on the same chapter', () => {
    expect(numbers([slot('a'), slot('b', { unnumbered: true, number_start: 10 }), slot('c')])).toEqual([1, null, 2])
  })

  it('accepts number_start 0 and null as "continue"', () => {
    expect(numbers([slot('a', { number_start: 0 }), slot('b', { number_start: null }), slot('c')])).toEqual([0, 1, 2])
  })

  it('is undefined for a chapter not in the structure', () => {
    expect(buildStructure({ book_title: '', chapters: [slot('a')] }).getDisplayNumber('x')).toBeUndefined()
  })
})

describe('buildStructure: positions and scenes', () => {
  const s = buildStructure({
    book_title: 'Book',
    chapters: [
      slot('pro', { unnumbered: true, scene_ids: ['s1'] }),
      slot('a', { scene_ids: ['s2', 's3'] }),
      slot('b', { number_start: 7, scene_ids: ['s4'] }),
    ],
  })

  it('reports positions, not display numbers, from getChapterNumber', () => {
    expect(['pro', 'a', 'b'].map((id) => s.getChapterNumber(id))).toEqual([1, 2, 3])
  })

  it('locates scenes', () => {
    expect(s.getScenePosition('s3')).toEqual({ chapterIndex: 1, sceneIndex: 1, chapterId: 'a' })
    expect(s.getChapterForScene('s4')).toBe('b')
    expect(s.getChapterNumberForScene('s4')).toBe(3)
    expect(s.getDisplayNumberForScene('s4')).toBe(7)
    expect(s.getDisplayNumberForScene('s1')).toBeNull()
    expect(s.getDisplayNumberForScene('nope')).toBeUndefined()
  })

  it('lists chapters and scenes in order', () => {
    expect(s.chapterCount).toBe(3)
    expect(s.sceneCount).toBe(4)
    expect(s.getChapterIds()).toEqual(['pro', 'a', 'b'])
    expect(s.getAllSceneIds()).toEqual(['s1', 's2', 's3', 's4'])
    expect(s.getScenesForChapter('a')).toEqual(['s2', 's3'])
    expect(s.getScenesForChapter('nope')).toEqual([])
  })
})

describe('buildStructure: reading order across chapters', () => {
  const s = buildStructure({
    book_title: 'Book',
    chapters: [
      slot('a', { scene_ids: ['a1', 'a2'] }),
      slot('empty'),
      slot('b', { scene_ids: ['b1'] }),
    ],
  })

  it('steps within a chapter', () => {
    expect(s.getSceneInReadingOrder('a1', 'next')).toEqual({ sceneId: 'a2', chapterId: 'a' })
    expect(s.getSceneInReadingOrder('a2', 'prev')).toEqual({ sceneId: 'a1', chapterId: 'a' })
  })

  it('crosses into the next and previous chapter, skipping empty ones', () => {
    expect(s.getSceneInReadingOrder('a2', 'next')).toEqual({ sceneId: 'b1', chapterId: 'b' })
    expect(s.getSceneInReadingOrder('b1', 'prev')).toEqual({ sceneId: 'a2', chapterId: 'a' })
  })

  it('ends at the start and end of the book, and for a scene in no chapter', () => {
    expect(s.getSceneInReadingOrder('a1', 'prev')).toBeUndefined()
    expect(s.getSceneInReadingOrder('b1', 'next')).toBeUndefined()
    expect(s.getSceneInReadingOrder('nope', 'next')).toBeUndefined()
  })
})

describe('ruleOf', () => {
  it('maps a slot to its numbering rule', () => {
    expect(ruleOf(slot('a'))).toEqual({ kind: 'continue' })
    expect(ruleOf(slot('a', { number_start: 4 }))).toEqual({ kind: 'start', number: 4 })
    expect(ruleOf(slot('a', { unnumbered: true, number_start: 4 }))).toEqual({ kind: 'none' })
  })
})

describe('chapterDropBefore', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('drops before the target on its upper half', () => {
    expect(chapterDropBefore(ids, 'd', 'b', true)).toBe('b')
  })

  it('drops after the target on its lower half', () => {
    expect(chapterDropBefore(ids, 'a', 'c', false)).toBe('d')
  })

  it('drops at the end (null) below the last chapter', () => {
    expect(chapterDropBefore(ids, 'a', 'd', false)).toBeNull()
  })

  it('is undefined when the order would not change', () => {
    expect(chapterDropBefore(ids, 'b', 'b', true)).toBeUndefined()
    expect(chapterDropBefore(ids, 'b', 'b', false)).toBeUndefined()
    expect(chapterDropBefore(ids, 'b', 'c', true)).toBeUndefined() // right after a: already there
    expect(chapterDropBefore(ids, 'b', 'a', false)).toBeUndefined()
    expect(chapterDropBefore(ids, 'd', 'd', false)).toBeUndefined()
  })

  it('is undefined for an unknown target', () => {
    expect(chapterDropBefore(ids, 'a', 'x', true)).toBeUndefined()
  })
})

describe('displayNumberAfterMove', () => {
  const book = [slot('pro', { unnumbered: true }), slot('a'), slot('b'), slot('c', { number_start: 10 }), slot('d')]

  it('numbers the moved chapter at its new place', () => {
    expect(displayNumberAfterMove(book, 'a', null)).toBe(12) // pro, b=1, c=10, d=11, a=12
    expect(displayNumberAfterMove(book, 'd', 'a')).toBe(1)
  })

  it('carries the chapter rule with it', () => {
    expect(displayNumberAfterMove(book, 'c', 'pro')).toBe(10)
    expect(displayNumberAfterMove(book, 'pro', null)).toBeNull()
  })

  it('treats an unknown "before" as the end', () => {
    expect(displayNumberAfterMove(book, 'a', 'x')).toBe(12)
  })

  it('is undefined for a chapter not in the book', () => {
    expect(displayNumberAfterMove(book, 'x', null)).toBeUndefined()
  })

  it('does not modify the input', () => {
    const copy = structuredClone(book)
    displayNumberAfterMove(book, 'a', null)
    expect(book).toEqual(copy)
  })
})

describe('structure edits (pure; the editor saves the result)', () => {
  const book = (): ChapterSlot[] => [
    slot('a', { scene_ids: ['s1', 's2'] }),
    slot('b', { scene_ids: ['s3'], number_start: 5 }),
  ]

  it('moves a scene within and across chapters', () => {
    expect(withSceneMoved(book(), 's2', 'a', 's1').map((c) => c.scene_ids)).toEqual([['s2', 's1'], ['s3']])
    expect(withSceneMoved(book(), 's1', 'b', null).map((c) => c.scene_ids)).toEqual([['s2'], ['s3', 's1']])
    expect(withSceneMoved(book(), 's1', 'b', 's3').map((c) => c.scene_ids)).toEqual([['s2'], ['s1', 's3']])
  })

  it('appends a chapter missing from the structure', () => {
    const next = withSceneMoved(book(), 's3', 'c', null)
    expect(next.map((c) => c.chapter_id)).toEqual(['a', 'b', 'c'])
    expect(next[2]!.scene_ids).toEqual(['s3'])
  })

  it('moves a chapter with its scenes and numbering rule', () => {
    expect(withChapterMoved(book(), 'b', 'a')).toEqual([slot('b', { scene_ids: ['s3'], number_start: 5 }), slot('a', { scene_ids: ['s1', 's2'] })])
  })

  it('returns undefined for a chapter move that changes nothing', () => {
    expect(withChapterMoved(book(), 'b', null)).toBeUndefined()
    expect(withChapterMoved(book(), 'a', 'a')).toBeUndefined()
    expect(withChapterMoved(book(), 'a', 'b')).toBeUndefined()
    expect(withChapterMoved(book(), 'x', null)).toBeUndefined()
  })

  it('removes a scene', () => {
    expect(withSceneRemoved(book(), 's1').map((c) => c.scene_ids)).toEqual([['s2'], ['s3']])
  })

  it('sets a numbering rule and clears the other one', () => {
    expect(withNumbering(book(), 'b', { kind: 'none' })[1]).toEqual(slot('b', { scene_ids: ['s3'], unnumbered: true }))
    expect(withNumbering(book(), 'b', { kind: 'continue' })[1]).toEqual(slot('b', { scene_ids: ['s3'] }))
    expect(withNumbering(book(), 'a', { kind: 'start', number: 3 })[0]).toEqual(slot('a', { scene_ids: ['s1', 's2'], number_start: 3 }))
  })

  it('never modifies its input', () => {
    const input = book()
    const copy = structuredClone(input)
    withSceneMoved(input, 's1', 'b', null)
    withChapterMoved(input, 'b', 'a')
    withSceneRemoved(input, 's1')
    withNumbering(input, 'b', { kind: 'none' })
    expect(input).toEqual(copy)
  })
})
