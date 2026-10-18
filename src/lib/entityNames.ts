import { useCallback, useMemo } from 'react'
import { useEntityTerms, type TermEntry } from './useValidateScene'

export type NameKind = 'character' | 'location' | 'plot_thread'

/**
 * Names of characters, locations and plot threads, resolved through their
 * vocabulary terms.
 *
 * Stored data spells the same entity differently: an entity's own document
 * keeps the name as typed ("Lady Linora Thalyn"), references in scenes and
 * notes keep the term value ("LADY_LINORA_THALYN"), older data may hold an
 * alias. All of them resolve to one term. The UI shows the term's LABEL —
 * which is also what a rename changes (the term and every reference keep
 * their id) — and matches entities by term id, never by spelling.
 */
export function useEntityNames() {
  const { characterTerms, locationTerms, plotThreadTerms, isLoading } = useEntityTerms()

  const names = useMemo(
    () => ({
      character: nameIndex(characterTerms),
      location: nameIndex(locationTerms),
      plot_thread: nameIndex(plotThreadTerms),
    }),
    [characterTerms, locationTerms, plotThreadTerms],
  )

  const term = useCallback((kind: NameKind, spelling: unknown) => names[kind].term(spelling), [names])
  const label = useCallback((kind: NameKind, spelling: unknown) => names[kind].label(spelling), [names])
  const termId = useCallback((kind: NameKind, spelling: unknown) => names[kind].termId(spelling), [names])
  const same = useCallback((kind: NameKind, a: unknown, b: unknown) => names[kind].same(a, b), [names])

  return { label, termId, term, same, isLoading }
}

/** Name lookups over one vocabulary's terms (the logic behind useEntityNames). */
export function nameIndex(terms: TermEntry[]) {
  // value first, then label, then aliases: a spelling that is one term's
  // value and another's alias belongs to the first.
  const map = new Map<string, TermEntry>()
  const add = (spelling: string | undefined, term: TermEntry) => {
    const key = (spelling ?? '').toLowerCase()
    if (key && !map.has(key)) map.set(key, term)
  }
  terms.forEach((t) => add(t.value, t))
  terms.forEach((t) => add(t.label, t))
  terms.forEach((t) => t.aliases?.forEach((a) => add(a, t)))

  const term = (spelling: unknown) => map.get(String(spelling ?? '').toLowerCase())
  /** The term id a spelling resolves to (undefined when it matches no term). */
  const termId = (spelling: unknown) => term(spelling)?.termId
  return {
    term,
    termId,
    /** The name to show: the term's current label, else the spelling as stored. */
    label: (spelling: unknown) => term(spelling)?.label ?? String(spelling ?? ''),
    /** Do two spellings name the same entity? */
    same: (a: unknown, b: unknown) => {
      const ta = termId(a)
      return ta ? ta === termId(b) : String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
    },
  }
}
