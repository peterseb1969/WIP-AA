/**
 * Markdown and plain-text exports. Both use the headings and scene breaks
 * the manuscript import reads ("Chapter 5: Title", "Prologue", "***"), so an
 * exported book can be imported again. Two things do not survive that round
 * trip: scene titles (only exported when asked for, and read back as prose)
 * and unnumbered chapters with a title other than Prologue, Interlude or
 * Epilogue (read back as part of the chapter before).
 */
import { chapterHeading, words, type ExportBook, type ExportLanguage } from './book.js'
import { plainText, type Block, type Run } from './prose.js'

export interface TextOptions {
  lang: ExportLanguage
  sceneTitles: boolean
}

const SCENE_BREAK = '***'

/** The book's paragraphs, chapters and scenes as text, rendered by `paragraph`. */
function render(book: ExportBook, opts: TextOptions, md: boolean) {
  const out: string[] = [md ? `# ${escapeMarkdown(book.title)}` : book.title]
  if (book.author) out.push(md ? `*${words(opts.lang).by} ${escapeMarkdown(book.author)}*` : `${words(opts.lang).by} ${book.author}`)
  for (const chapter of book.chapters) {
    const heading = chapterHeading(chapter, opts.lang)
    out.push(md ? `## ${escapeMarkdown(heading)}` : `\n${heading}`)
    chapter.scenes.forEach((scene, i) => {
      if (i > 0) out.push(SCENE_BREAK)
      if (opts.sceneTitles && scene.title) out.push(md ? `### ${escapeMarkdown(scene.title)}` : scene.title)
      for (const block of scene.blocks) out.push(md ? markdownBlock(block) : textBlock(block))
    })
  }
  return out.join('\n\n') + '\n'
}

export const toMarkdown = (book: ExportBook, opts: TextOptions) => render(book, opts, true)
export const toPlainText = (book: ExportBook, opts: TextOptions) => render(book, opts, false)

function textBlock(block: Block) {
  return block.kind === 'rule' ? SCENE_BREAK : plainText(block.runs)
}

function markdownBlock(block: Block) {
  if (block.kind === 'rule') return SCENE_BREAK
  const text = block.runs.map(markdownRun).join('')
  // A line starting like a heading, quote, list or rule would not read back as text.
  return text.replace(/^(#|>|[-+*] |\d+[.)] )/gm, '\\$1')
}

function markdownRun(run: Run) {
  if ('break' in run) return '  \n'
  // Markers must touch the text: keep surrounding spaces outside them.
  const [, lead, core, trail] = run.text.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  if (!core) return run.text
  let text = escapeMarkdown(core)
  if (run.strike) text = `~~${text}~~`
  if (run.italic) text = `*${text}*`
  if (run.bold) text = `**${text}**`
  return `${lead}${text}${trail}`
}

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_~[\]<])/g, '\\$1')
}
