/**
 * Book export — the manuscript as a file to download, or as a page to print.
 *
 *   GET /api/export/:format?lang=en|de&scene_titles=1[&style=…][&size=…]
 *
 * Formats: `md` (Markdown), `txt` (plain text), `docx` (Word; `style` picks
 * standard manuscript format, the default, or a reading copy), `epub`
 * (e-book), `print` (a page laid out for paper, opened in the browser to
 * print or save as PDF; `size=a5|a4|letter`, A5 by default). `lang` sets
 * the words the export adds itself ("Chapter", "by"); the book's own text
 * is never translated. Scene titles are left out unless `scene_titles=1`: imported
 * titles ("Scene 2") are labels for the writer, not text for readers.
 *
 *   GET /api/export/bible/:format?lang=en|de
 *
 * The story bible (characters, locations, plot threads, world rules, notes)
 * as `md` (download) or `print` (opened in the browser, for a PDF).
 * Mounted at `/api` in server/index.ts.
 */

import { Router } from 'express'
import { deploymentBook } from './lib/book-space.js'
import { fileStem, loadBook, type ExportBook, type ExportLanguage } from './lib/export/book.js'
import { toMarkdown, toPlainText, type TextOptions } from './lib/export/text.js'
import { toDocx } from './lib/export/docx.js'
import { toEpub } from './lib/export/epub.js'
import { toPrintHtml, type PageSize } from './lib/export/print.js'
import { loadBible, toBibleMarkdown, toBiblePrintHtml } from './lib/export/bible.js'

const router = Router()

interface Options extends TextOptions {
  style: 'manuscript' | 'reading'
  size: PageSize
}

const SIZES: PageSize[] = ['a5', 'a4', 'letter']

// `inline`: shown in the browser instead of downloaded.
const FORMATS: Record<string, { type: string; inline?: boolean; render: (book: ExportBook, opts: Options) => string | Promise<Buffer> }> = {
  md: { type: 'text/markdown; charset=utf-8', render: toMarkdown },
  txt: { type: 'text/plain; charset=utf-8', render: toPlainText },
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', render: toDocx },
  epub: { type: 'application/epub+zip', render: (book, opts) => toEpub(book, opts) },
  print: { type: 'text/html; charset=utf-8', inline: true, render: toPrintHtml },
}

router.get('/export/:format', async (req, res) => {
  const format = FORMATS[req.params.format]
  if (!format) {
    res.status(404).json({ error: `unknown export format: ${req.params.format}` })
    return
  }
  const lang: ExportLanguage = req.query.lang === 'de' ? 'de' : 'en'
  try {
    const book = await loadBook(deploymentBook(), lang)
    const body = await format.render(book, {
      lang,
      sceneTitles: req.query.scene_titles === '1',
      style: req.query.style === 'reading' ? 'reading' : 'manuscript',
      size: SIZES.includes(req.query.size as PageSize) ? req.query.size as PageSize : 'a5',
    })
    res.setHeader('Content-Type', format.type)
    if (!format.inline) res.setHeader('Content-Disposition', `attachment; filename="${fileStem(book)}.${req.params.format}"`)
    res.send(body)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: (err as Error).message || 'Export failed' })
  }
})

router.get('/export/bible/:format', async (req, res) => {
  const format = req.params.format
  if (format !== 'md' && format !== 'print') {
    res.status(404).json({ error: `unknown story bible format: ${format}` })
    return
  }
  const lang: ExportLanguage = req.query.lang === 'de' ? 'de' : 'en'
  try {
    const bible = await loadBible(deploymentBook(), lang)
    if (format === 'print') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(toBiblePrintHtml(bible, lang))
      return
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fileStem(bible)}-${lang === 'de' ? 'story-bibel' : 'story-bible'}.md"`)
    res.send(toBibleMarkdown(bible, lang))
  } catch (err) {
    console.error('Story bible export error:', err)
    res.status(500).json({ error: (err as Error).message || 'Export failed' })
  }
})

export default router
