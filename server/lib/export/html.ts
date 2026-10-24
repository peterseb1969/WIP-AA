/**
 * Prose blocks as HTML for the EPUB and the print view: escaped text, marks,
 * line breaks, a centred "* * *" between scenes, and class "first" on a
 * paragraph that opens a scene (no indent).
 */
import type { Block, Run } from './prose.js'

export const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function runHtml(run: Run) {
  if ('break' in run) return '<br/>'
  let html = esc(run.text)
  if (run.strike) html = `<s>${html}</s>`
  if (run.italic) html = `<em>${html}</em>`
  if (run.bold) html = `<strong>${html}</strong>`
  return html
}

export const SCENE_BREAK = '<p class="scene-break">* * *</p>'

export function blocksHtml(blocks: Block[]) {
  let first = true
  return blocks.map((block) => {
    if (block.kind === 'rule') { first = true; return SCENE_BREAK }
    const html = `<p${first ? ' class="first"' : ''}>${block.runs.map(runHtml).join('')}</p>`
    first = false
    return html
  })
}
