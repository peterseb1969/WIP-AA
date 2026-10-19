/**
 * Display rules for titles that carry a number (display only — stored
 * titles are never changed here).
 *
 * The import names chapters "Chapter 5" / "Kapitel 5" and scenes
 * "Ch5 Scene 1". Chapter numbers are computed from the book order and its
 * numbering rules, so such a number goes stale as soon as chapters move.
 * A chapter title that is nothing but a number is therefore treated as no
 * title, and a scene title's "ChN " prefix is hidden.
 */

// Well-formed roman numerals only: a bare letter class would read "Child"
// as "Ch" + "ild" and hide it as a number.
const ROMAN = '(?=[ivxlcdm])m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})'
const NUMBER_ONLY_CHAPTER = new RegExp(`^(?:(?:chapter|kapitel|chap\\.?|kap\\.?|ch\\.?)\\s*(?:\\d+|${ROMAN})|\\d+)\\.?$`, 'i')
const SCENE_CHAPTER_PREFIX = /^(?:ch|kap)\.?\s*\d+\s+(?=\S)/i

/** The chapter's title as worth showing: '' when it is only a number. */
export function chapterTitleShown(title: string | undefined | null) {
  const trimmed = (title ?? '').trim()
  return NUMBER_ONLY_CHAPTER.test(trimmed) ? '' : trimmed
}

/** A scene title without the chapter-number prefix the import gave it. */
export function sceneTitleShown(title: string | undefined | null) {
  const trimmed = (title ?? '').trim()
  return trimmed.replace(SCENE_CHAPTER_PREFIX, '') || trimmed
}

type T = (key: string, options?: Record<string, unknown>) => string

/**
 * How a chapter is named in the UI. Numbered: "Ch. 6: The Storm", or just
 * "Ch. 6" when its title is only a number ("Chapter 6" with `long`).
 * Unnumbered: its title, or "Untitled chapter".
 */
export function chapterLabel(t: T, number: number | null | undefined, title: string | undefined | null, long = false) {
  const shown = chapterTitleShown(title)
  if (number == null) return shown || t('chapters_page.untitled_unnumbered')
  const num = long ? t('scenes.chapter_label', { number }) : t('dashboard.ch_short', { number })
  return shown ? `${num}: ${shown}` : num
}

/**
 * A book title suggested by an uploaded file's name: extension dropped,
 * underscores read as spaces. '' when there is no file (pasted text).
 */
export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
}
