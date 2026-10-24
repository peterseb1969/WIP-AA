/**
 * Book export — the manuscript as a file to download.
 *
 *   GET /api/export/:format?lang=en|de&scene_titles=1[&style=manuscript|reading]
 *
 * Formats: `md` (Markdown), `txt` (plain text), `docx` (Word; `style` picks
 * standard manuscript format, the default, or a reading copy). `lang` sets
 * the words the export adds itself ("Chapter", "by"); the book's own text is never
 * translated. Scene titles are left out unless `scene_titles=1`: imported
 * titles ("Scene 2") are labels for the writer, not text for readers.
 * Mounted at `/api` in server/index.ts.
 */

import { Router } from 'express'
import { deploymentBook } from './lib/book-space.js'
import { fileStem, loadBook, type ExportBook, type ExportLanguage } from './lib/export/book.js'
import { toMarkdown, toPlainText, type TextOptions } from './lib/export/text.js'
import { toDocx } from './lib/export/docx.js'

const router = Router()

interface Options extends TextOptions {
  style: 'manuscript' | 'reading'
}

const FORMATS: Record<string, { type: string; render: (book: ExportBook, opts: Options) => string | Promise<Buffer> }> = {
  md: { type: 'text/markdown; charset=utf-8', render: toMarkdown },
  txt: { type: 'text/plain; charset=utf-8', render: toPlainText },
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', render: toDocx },
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
    })
    res.setHeader('Content-Type', format.type)
    res.setHeader('Content-Disposition', `attachment; filename="${fileStem(book)}.${req.params.format}"`)
    res.send(body)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: (err as Error).message || 'Export failed' })
  }
})

export default router
