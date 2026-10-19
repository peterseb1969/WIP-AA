import { describe, expect, it } from 'vitest'
import { validateSceneAnnotations, type AnnotationResult, type TermEntry } from './useValidateScene'

// Shaped like an imported book: term values in UPPER_SNAKE, display names as
// labels, the display name repeated among the aliases.
const characters: TermEntry[] = [
  { value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', aliases: ['Lady Linora Thalyn', 'Linora'] },
  { value: 'CARTER', label: 'Carter' },
  { value: 'ADA', label: 'Ada' },
  { value: 'JOSE', label: 'José' },
  { value: 'RENEE', label: 'Renée' },
  { value: 'ODON', label: 'Ödön' },
]
const locations: TermEntry[] = [
  { value: 'THE_MILL', label: 'The Mill', aliases: ['the old mill'] },
  { value: 'HARBOUR', label: 'Harbour' },
]
const threads: TermEntry[] = [
  { value: 'THE_LOST_KEY', label: 'The Lost Key' },
]

const check = (prose: string, opts: { chars?: string[]; loc?: string; threads?: string[]; suppressed?: string[] } = {}) =>
  validateSceneAnnotations(prose, opts.chars ?? [], opts.loc, opts.threads ?? [], opts.suppressed ?? [], characters, locations, threads)

const stateOf = (results: AnnotationResult[], value: string) => results.find((r) => r.termValue === value)?.state

describe('validateSceneAnnotations: the four states', () => {
  const prose = '<p>Carter met Linora at the old mill.</p>'

  it('confirms a listed entity that the prose names', () => {
    expect(stateOf(check(prose, { chars: ['CARTER'] }), 'CARTER')).toBe('confirmed')
  })

  it('reports a listed entity the prose never names as missing', () => {
    expect(stateOf(check(prose, { chars: ['ADA'] }), 'ADA')).toBe('missing')
  })

  it('detects an unlisted entity the prose names', () => {
    const r = check(prose)
    expect(stateOf(r, 'CARTER')).toBe('detected')
    expect(r.find((x) => x.termValue === 'CARTER')?.label).toBe('Carter')
  })

  it('keeps a dismissed suggestion as suppressed', () => {
    expect(stateOf(check(prose, { suppressed: ['CARTER'] }), 'CARTER')).toBe('suppressed')
  })

  it('checks locations and plot threads too', () => {
    const r = check('<p>The Lost Key lay at the old mill.</p>', { loc: 'THE_MILL' })
    expect(stateOf(r, 'THE_MILL')).toBe('confirmed')
    expect(r.find((x) => x.termValue === 'THE_MILL')?.category).toBe('location')
    expect(stateOf(r, 'THE_LOST_KEY')).toBe('detected')
    expect(r.find((x) => x.termValue === 'THE_LOST_KEY')?.category).toBe('plot_thread')
  })

  it('returns nothing for empty prose', () => {
    expect(check('', { chars: ['CARTER'] })).toEqual([])
    expect(check('<p> </p>', { chars: ['CARTER'] })).toEqual([])
  })
})

describe('validateSceneAnnotations: matching', () => {
  it('matches by alias', () => {
    expect(stateOf(check('<p>Linora smiled.</p>', { chars: ['LADY_LINORA_THALYN'] }), 'LADY_LINORA_THALYN')).toBe('confirmed')
  })

  it('matches a listed value case-insensitively', () => {
    expect(stateOf(check('<p>Carter left.</p>', { chars: ['carter'] }), 'carter')).toBe('confirmed')
  })

  it('ignores case for names of five letters or more', () => {
    expect(stateOf(check('<p>CARTER shouted.</p>'), 'CARTER')).toBe('detected')
  })

  it('is case-sensitive for short names, to avoid false hits', () => {
    expect(stateOf(check('<p>Ada laughed.</p>'), 'ADA')).toBe('detected')
    expect(stateOf(check('<p>ADA laughed.</p>'), 'ADA')).toBeUndefined()
  })

  it('only matches whole words', () => {
    expect(stateOf(check('<p>The Cartersons arrived. Adam waved.</p>'), 'CARTER')).toBeUndefined()
    expect(stateOf(check('<p>Adam waved.</p>'), 'ADA')).toBeUndefined()
  })

  it('ignores markup and entities', () => {
    expect(stateOf(check('<p><strong>Car</strong>ter</p><p>Harbour&nbsp;lights</p>'), 'HARBOUR')).toBe('detected')
    expect(stateOf(check('<p><em>Carter</em> left.</p>'), 'CARTER')).toBe('detected')
  })

  it('treats a listed value without a term as its own name', () => {
    const r = check('<p>Mallory waited.</p>', { chars: ['Mallory', 'Nobody'] })
    expect(stateOf(r, 'Mallory')).toBe('confirmed')
    expect(stateOf(r, 'Nobody')).toBe('missing')
  })

  it.each([
    ['José', 'JOSE', '<p>José opened the door.</p>'],
    ['José at the end', 'JOSE', '<p>The door was opened by José.</p>'],
    ['Renée', 'RENEE', '<p>Then Renée sang.</p>'],
    ['Ödön', 'ODON', '<p>Ödön kam herein.</p>'],
  ])('finds names with accented letters at the edges: %s', (_case, value, prose) => {
    expect(stateOf(check(prose), value)).toBe('detected')
  })

  it('still respects word edges next to accented letters', () => {
    expect(stateOf(check('<p>Josées Haus.</p>'), 'JOSE')).toBeUndefined()
  })
})
