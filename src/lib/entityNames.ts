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

  const index = useMemo(() => {
    // value first, then label, then aliases: a spelling that is one term's
    // value and another's alias belongs to the first.
    const build = (terms: TermEntry[]) => {
      const map = new Map<string, TermEntry>()
      const add = (spelling: string | undefined, term: TermEntry) => {
        const key = (spelling ?? '').toLowerCase()
        if (key && !map.has(key)) map.set(key, term)
      }
      terms.forEach((t) => add(t.value, t))
      terms.forEach((t) => add(t.label, t))
      terms.forEach((t) => t.aliases?.forEach((a) => add(a, t)))
      return map
    }
    return {
      character: build(characterTerms),
      location: build(locationTerms),
      plot_thread: build(plotThreadTerms),
    }
  }, [characterTerms, locationTerms, plotThreadTerms])

  const term = useCallback(
    (kind: NameKind, spelling: unknown) => index[kind].get(String(spelling ?? '').toLowerCase()),
    [index],
  )
  /** The name to show: the term's current label, else the spelling as stored. */
  const label = useCallback(
    (kind: NameKind, spelling: unknown) => term(kind, spelling)?.label ?? String(spelling ?? ''),
    [term],
  )
  /** The term id a spelling resolves to (undefined when it matches no term). */
  const termId = useCallback((kind: NameKind, spelling: unknown) => term(kind, spelling)?.termId, [term])
  /** Do two spellings name the same entity? */
  const same = useCallback((kind: NameKind, a: unknown, b: unknown) => {
    const ta = termId(kind, a)
    return ta ? ta === termId(kind, b) : String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
  }, [termId])

  return { label, termId, term, same, isLoading }
}
