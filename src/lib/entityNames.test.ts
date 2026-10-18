import { describe, expect, it } from 'vitest'
import { nameIndex } from './entityNames'

// Shaped like an imported book: the entity's own document stores the display
// name ("Lady Linora Thalyn"), references store the term value
// ("LADY_LINORA_THALYN"), older data may hold an alias.
const names = nameIndex([
  { termId: 't-linora', value: 'LADY_LINORA_THALYN', label: 'Lady Linora Thalyn', aliases: ['Linora', 'The Lady'] },
  { termId: 't-carter', value: 'CARTER', label: 'Carter' },
  // a spelling that is one term's value and another's alias belongs to the value's owner
  { termId: 't-cart', value: 'CART', label: 'The Cart', aliases: ['CARTER'] },
])

describe('nameIndex', () => {
  it('resolves value, label and alias spellings to one term id', () => {
    for (const spelling of ['LADY_LINORA_THALYN', 'Lady Linora Thalyn', 'Linora', 'The Lady']) {
      expect(names.termId(spelling)).toBe('t-linora')
    }
  })

  it('ignores case', () => {
    expect(names.termId('lady linora thalyn')).toBe('t-linora')
    expect(names.termId('lady_linora_thalyn')).toBe('t-linora')
  })

  it('gives a value precedence over another term’s alias', () => {
    expect(names.termId('CARTER')).toBe('t-carter')
  })

  it('shows the term label, or the stored spelling when no term matches', () => {
    expect(names.label('LADY_LINORA_THALYN')).toBe('Lady Linora Thalyn')
    expect(names.label('Ghost')).toBe('Ghost')
    expect(names.label(undefined)).toBe('')
  })

  it('is undefined for unknown or empty spellings', () => {
    expect(names.termId('Ghost')).toBeUndefined()
    expect(names.termId('')).toBeUndefined()
    expect(names.termId(null)).toBeUndefined()
  })

  it('matches the entity document against its references (the "Appears in" case)', () => {
    expect(names.same('Lady Linora Thalyn', 'LADY_LINORA_THALYN')).toBe(true)
    expect(names.same('Linora', 'lady linora thalyn')).toBe(true)
    expect(names.same('Lady Linora Thalyn', 'CARTER')).toBe(false)
  })

  it('falls back to case-insensitive spelling for names without a term', () => {
    expect(names.same('Ghost', 'ghost')).toBe(true)
    expect(names.same('Ghost', 'Spectre')).toBe(false)
    expect(names.same('Ghost', 'Carter')).toBe(false)
  })
})
