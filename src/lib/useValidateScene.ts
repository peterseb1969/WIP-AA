import { useMemo } from 'react'
import { useTerms, useTerminologies } from '@wip/react'
import { NAMESPACE, TERMINOLOGIES } from './constants'

// ── Types ─────────────────────────────────────────────────

export type AnnotationState = 'confirmed' | 'missing' | 'detected' | 'suppressed'

export interface AnnotationResult {
  /** Term value (e.g. "CARTER") */
  termValue: string
  /** Human-readable label (e.g. "Carter") */
  label: string
  /** Entity category */
  category: 'character' | 'location' | 'plot_thread'
  /** Validation state */
  state: AnnotationState
}

export interface TermEntry {
  value: string
  label: string
  aliases?: string[]
  /** The term's id — what references resolve to; stable across renames. */
  termId?: string
}

// ── Core matching logic ───────────────────────────────────

/** Strip HTML tags to get plain text for matching */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Check if a name appears in text as a whole word. Word edges are Unicode
 * letters, digits and "_" — `\b` knows only ASCII letters, so it missed
 * "José" and "Ödön" and found "José" inside "Josées".
 */
function nameFoundInText(name: string, plainText: string): boolean {
  if (!name || name.length < 2) return false
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Case-sensitive for short names (< 5 chars) to avoid false positives
  const flags = name.length < 5 ? 'u' : 'iu'
  const regex = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, flags)
  return regex.test(plainText)
}

/** Check if any name variant (label + aliases) is found in text */
function entityFoundInText(term: TermEntry, plainText: string): boolean {
  if (nameFoundInText(term.label, plainText)) return true
  if (term.aliases) {
    for (const alias of term.aliases) {
      if (nameFoundInText(alias, plainText)) return true
    }
  }
  return false
}

// ── Validation function (pure) ────────────────────────────

export function validateSceneAnnotations(
  prose: string,
  storedCharacters: string[],
  storedLocation: string | undefined,
  storedPlotThreads: string[],
  suppressedSuggestions: string[],
  allCharacterTerms: TermEntry[],
  allLocationTerms: TermEntry[],
  allPlotThreadTerms: TermEntry[],
): AnnotationResult[] {
  const plainText = stripHtml(prose)
  if (!plainText) return []

  const results: AnnotationResult[] = []
  const suppressedSet = new Set(suppressedSuggestions)

  // Helper: validate one category
  function validateCategory(
    category: AnnotationResult['category'],
    storedValues: string[],
    allTerms: TermEntry[],
  ) {
    const storedSet = new Set(storedValues.map(v => v.toUpperCase()))
    const termMap = new Map<string, TermEntry>()
    for (const t of allTerms) {
      termMap.set(t.value.toUpperCase(), t)
    }

    // Check stored annotations
    for (const stored of storedValues) {
      const key = stored.toUpperCase()
      const term = termMap.get(key)
      const label = term?.label ?? stored
      const found = term ? entityFoundInText(term, plainText) : nameFoundInText(stored, plainText)

      results.push({
        termValue: stored,
        label,
        category,
        state: found ? 'confirmed' : 'missing',
      })
    }

    // Check for detected-but-not-listed entities
    for (const term of allTerms) {
      const key = term.value.toUpperCase()
      if (storedSet.has(key)) continue // already handled

      if (entityFoundInText(term, plainText)) {
        const isSuppressed = suppressedSet.has(term.value)
        results.push({
          termValue: term.value,
          label: term.label,
          category,
          state: isSuppressed ? 'suppressed' : 'detected',
        })
      }
    }
  }

  validateCategory('character', storedCharacters, allCharacterTerms)
  validateCategory('location', storedLocation ? [storedLocation] : [], allLocationTerms)
  validateCategory('plot_thread', storedPlotThreads, allPlotThreadTerms)

  return results
}

// ── React hook for term data ──────────────────────────────

export function useEntityTerms() {
  // First resolve terminology values to UUIDs
  const { data: terminologies } = useTerminologies({
    namespace: NAMESPACE,
    page_size: 50,
  })

  const termIdMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of terminologies?.items ?? []) {
      map.set(t.value, t.terminology_id)
    }
    return map
  }, [terminologies])

  const charId = termIdMap.get(TERMINOLOGIES.CHARACTERS)
  const locId = termIdMap.get(TERMINOLOGIES.LOCATIONS)
  const threadId = termIdMap.get(TERMINOLOGIES.PLOT_THREADS)

  // Now fetch terms using resolved UUIDs (hooks are disabled when ID is falsy).
  // Active only: a merged-away name stays behind as a deprecated term.
  const { data: charTerms } = useTerms(charId ?? '', {
    page_size: 1000,
    status: 'active',
  })
  const { data: locTerms } = useTerms(locId ?? '', {
    page_size: 1000,
    status: 'active',
  })
  const { data: threadTerms } = useTerms(threadId ?? '', {
    page_size: 1000,
    status: 'active',
  })

  const characterTerms: TermEntry[] = useMemo(
    () => (charTerms?.items ?? []).map((t) => ({
      value: t.value,
      label: t.label || t.value,
      aliases: t.aliases ?? [],
      termId: t.term_id,
    })),
    [charTerms]
  )

  const locationTerms: TermEntry[] = useMemo(
    () => (locTerms?.items ?? []).map((t) => ({
      value: t.value,
      label: t.label || t.value,
      aliases: t.aliases ?? [],
      termId: t.term_id,
    })),
    [locTerms]
  )

  const plotThreadTerms: TermEntry[] = useMemo(
    () => (threadTerms?.items ?? []).map((t) => ({
      value: t.value,
      label: t.label || t.value,
      aliases: t.aliases ?? [],
      termId: t.term_id,
    })),
    [threadTerms]
  )

  const isLoading = !charTerms || !locTerms || !threadTerms

  return { characterTerms, locationTerms, plotThreadTerms, isLoading }
}
