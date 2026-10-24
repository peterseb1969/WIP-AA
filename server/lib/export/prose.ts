/**
 * Scene prose as the exports need it. The editor stores HTML from a small
 * set of marks (TipTap's StarterKit without headings, lists, quotes or
 * code): paragraphs, line breaks, horizontal rules, bold, italic and
 * strikethrough. Each export format renders these blocks its own way, so
 * none of them passes stored HTML through.
 */

export interface Marks {
  bold?: boolean
  italic?: boolean
  strike?: boolean
}
export type Run = ({ text: string } & Marks) | { break: true }
export type Block = { kind: 'paragraph'; runs: Run[] } | { kind: 'rule' }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[name.toLowerCase()] ?? whole
  })
}

const MARK_OF: Record<string, keyof Marks> = { strong: 'bold', b: 'bold', em: 'italic', i: 'italic', s: 'strike', strike: 'strike', del: 'strike' }

/**
 * Stored prose as blocks. Prose that is not HTML (scenes imported before the
 * import converted manuscript text) is read the way the import reads text:
 * blank lines separate paragraphs.
 */
export function parseProse(stored: string | undefined | null): Block[] {
  const source = (stored ?? '').trim()
  if (!source) return []
  if (!source.startsWith('<')) {
    return source.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/).map((para) => ({
      kind: 'paragraph' as const,
      runs: para.split('\n').map((l) => l.trim()).filter(Boolean)
        .flatMap((line, i): Run[] => (i ? [{ break: true }, { text: line }] : [{ text: line }])),
    })).filter((b) => b.runs.length)
  }

  const blocks: Block[] = []
  const depth: Record<keyof Marks, number> = { bold: 0, italic: 0, strike: 0 }
  let runs: Run[] | null = null
  const flush = () => {
    if (runs) {
      const cleaned = tidy(runs)
      if (cleaned.length) blocks.push({ kind: 'paragraph', runs: cleaned })
    }
    runs = null
  }

  for (const [, closing, tagName, text] of source.matchAll(/<(\/?)([a-zA-Z0-9]+)[^>]*>|([^<]+)/g)) {
    if (text !== undefined) {
      const value = decodeEntities(text).replace(/\s+/g, ' ')
      if (!value) continue
      runs ??= []
      runs.push({ text: value, ...(depth.bold ? { bold: true } : {}), ...(depth.italic ? { italic: true } : {}), ...(depth.strike ? { strike: true } : {}) })
      continue
    }
    const tag = tagName!.toLowerCase()
    const mark = MARK_OF[tag]
    if (mark) depth[mark] = Math.max(0, depth[mark] + (closing ? -1 : 1))
    else if (tag === 'p' || tag === 'div') { flush(); if (!closing) runs = [] }
    else if (tag === 'br') (runs ??= []).push({ break: true })
    else if (tag === 'hr') { flush(); blocks.push({ kind: 'rule' }) }
  }
  flush()
  return blocks
}

const sameMarks = (a: Marks, b: Marks) => !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.strike === !!b.strike

/** Joins neighbouring runs with the same marks; trims the paragraph's ends and around line breaks. */
function tidy(runs: Run[]): Run[] {
  const out: Run[] = []
  for (const run of runs) {
    const last = out[out.length - 1]
    if ('text' in run && last && 'text' in last && sameMarks(last, run)) last.text += run.text
    else out.push({ ...run })
  }
  // Whitespace at a paragraph's ends and next to a line break is not text.
  out.forEach((run, i) => {
    if (!('text' in run)) return
    const prev = out[i - 1], next = out[i + 1]
    if (!prev || 'break' in prev) run.text = run.text.replace(/^\s+/, '')
    if (!next || 'break' in next) run.text = run.text.replace(/\s+$/, '')
  })
  const kept = out.filter((run) => !('text' in run) || run.text)
  while (kept.length && 'break' in kept[kept.length - 1]!) kept.pop()
  while (kept.length && 'break' in kept[0]!) kept.shift()
  return kept
}

/** A paragraph's text without marks (line breaks as newlines). */
export function plainText(runs: Run[]) {
  return runs.map((run) => ('break' in run ? '\n' : run.text)).join('')
}
