/**
 * Scene prose is stored as HTML (the editor's format). A manuscript arrives
 * as plain text, where line breaks carry the paragraphs; HTML reads them as
 * spaces, so plain text stored as is opens as one long paragraph.
 */

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Plain manuscript text as editor HTML, escaped. Blank lines separate
 * paragraphs, and a single line break inside one is kept as a line break
 * (email headers, verse). Text without any blank line has one paragraph per
 * line, as word processors export it.
 */
export function proseFromText(text: string) {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''
  const blocks = /\n[ \t]*\n/.test(normalized) ? normalized.split(/\n[ \t]*\n+/) : normalized.split('\n')
  return blocks
    .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map((lines) => `<p>${lines.map(escapeHtml).join('<br>')}</p>`)
    .join('')
}

/**
 * Texts joined into one, as sentences: a text that already ends in
 * punctuation (closing quotes or brackets after it count) is followed by a
 * space, any other by ". ". Used when merging entities' descriptions.
 */
export function joinSentences(texts: string[]) {
  return texts.map((t) => t.trim()).filter(Boolean)
    .reduce((out, text) => (!out ? text : /[.!?…:;][)"'”’»«]*$/.test(out) ? `${out} ${text}` : `${out}. ${text}`), '')
}
