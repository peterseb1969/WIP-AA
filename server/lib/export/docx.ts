/**
 * DOCX export, in one of two styles:
 * - `manuscript`: standard manuscript format for agents and editors —
 *   12 pt Times New Roman, double spaced, 1" margins, indented paragraphs,
 *   "#" between scenes, a header with surname / title / page number, and a
 *   title page with an approximate word count.
 * - `reading`: a copy to read — Georgia 11 pt, 1.15 spacing, "* * *" between
 *   scenes, page numbers in the footer.
 * Both start every chapter on a new page, as a Heading 1 (Word's
 * navigation pane lists them), and leave the first paragraph of a chapter or
 * scene unindented.
 */
import { AlignmentType, Document, Footer, Header, HeadingLevel, Packer, PageNumber, Paragraph, TextRun, type IRunOptions } from 'docx'
import { chapterHeading, words, type ExportBook, type ExportLanguage } from './book.js'
import { plainText, type Block, type Run } from './prose.js'

export type DocxStyle = 'manuscript' | 'reading'

export interface DocxOptions {
  lang: ExportLanguage
  sceneTitles: boolean
  style: DocxStyle
}

const LOOK = {
  manuscript: { font: 'Times New Roman', size: 24, line: 480, sceneBreak: '#' },
  reading: { font: 'Georgia', size: 22, line: 276, sceneBreak: '* * *' },
} as const

const INDENT = 720 // twips: 0.5"
const INCH = 1440

/** The book's word count, rounded as manuscript title pages give it. */
export function approximateWords(book: ExportBook) {
  const count = book.chapters.flatMap((c) => c.scenes).flatMap((s) => s.blocks)
    .reduce((n, b) => n + (b.kind === 'paragraph' ? plainText(b.runs).split(/\s+/).filter(Boolean).length : 0), 0)
  const step = count < 1000 ? 10 : count < 10000 ? 100 : 1000
  return Math.max(step, Math.round(count / step) * step)
}

function runs(paragraphRuns: Run[]) {
  return paragraphRuns.map((run) =>
    'break' in run ? new TextRun({ break: 1 }) : new TextRun({ text: run.text, bold: run.bold, italics: run.italic, strike: run.strike } satisfies IRunOptions),
  )
}

export async function toDocx(book: ExportBook, opts: DocxOptions): Promise<Buffer> {
  const look = LOOK[opts.style]
  const w = words(opts.lang)
  const centered = (text: string, extra: { spacingBefore?: number; bold?: boolean; size?: number } = {}) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: extra.spacingBefore ?? 0 },
      children: [new TextRun({ text, bold: extra.bold, size: extra.size })],
    })

  const body: Paragraph[] = []
  for (const chapter of book.chapters) {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun(chapterHeading(chapter, opts.lang))] }))
    chapter.scenes.forEach((scene, i) => {
      if (i > 0) body.push(centered(look.sceneBreak))
      if (opts.sceneTitles && scene.title) body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(scene.title)] }))
      let first = true
      for (const block of scene.blocks as Block[]) {
        if (block.kind === 'rule') { body.push(centered(look.sceneBreak)); first = true; continue }
        body.push(new Paragraph({ indent: first ? undefined : { firstLine: INDENT }, children: runs(block.runs) }))
        first = false
      }
    })
  }

  const surname = book.author.split(/\s+/).filter(Boolean).pop() ?? ''
  const titlePage: Paragraph[] = opts.style === 'manuscript'
    ? [
        ...(book.author ? [new Paragraph({ children: [new TextRun(book.author)] })] : []),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(opts.lang === 'de' ? `ca. ${approximateWords(book).toLocaleString('de-DE')} Wörter` : `about ${approximateWords(book).toLocaleString('en-US')} words`)] }),
        centered(book.title.toUpperCase(), { spacingBefore: 4 * INCH }),
        ...(book.author ? [centered(`${w.by} ${book.author}`)] : []),
      ]
    : [
        centered(book.title, { spacingBefore: 3 * INCH, bold: true, size: 48 }),
        ...(book.author ? [centered(`${w.by} ${book.author}`, { spacingBefore: 400 })] : []),
      ]

  const pageNumber = () => new TextRun({ children: [PageNumber.CURRENT] })
  const headers = opts.style === 'manuscript'
    ? { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(`${surname ? `${surname} / ` : ''}${book.title.toUpperCase()} / `), pageNumber()] })] }) }
    : undefined
  const footers = opts.style === 'reading'
    ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pageNumber()] })] }) }
    : undefined
  const margins = { top: INCH, bottom: INCH, left: INCH, right: INCH }

  const doc = new Document({
    creator: book.author || 'AuthorAssist',
    title: book.title,
    styles: {
      default: {
        document: { run: { font: look.font, size: look.size }, paragraph: { spacing: { line: look.line, after: 0 } } },
        heading1: { run: { font: look.font, size: look.size + 4, bold: true, color: '000000' }, paragraph: { spacing: { before: 2 * INCH, after: 480 } } },
        heading2: { run: { font: look.font, size: look.size, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 240 } } },
      },
    },
    sections: [
      { properties: { page: { margin: margins } }, children: titlePage },
      { properties: { page: { margin: margins, pageNumbers: { start: 1 } } }, headers, footers, children: body },
    ],
  })
  return Packer.toBuffer(doc)
}
