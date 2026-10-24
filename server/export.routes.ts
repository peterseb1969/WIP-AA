/**
 * Book export — the manuscript as a file to download.
 *
 *   GET /api/export/:format?lang=en|de&scene_titles=1
 *
 * Formats: `md` (Markdown), `txt` (plain text). `lang` sets the words the
 * export adds itself ("Chapter", "by"); the book's own text is never
 * translated. Scene titles are left out unless `scene_titles=1`: imported
 * titles ("Scene 2") are labels for the writer, not text for readers.
 * Mounted at `/api` in server/index.ts.
 */

import { Router } from 'express'
import { deploymentBook } from './lib/book-space.js'
import { fileStem, loadBook, type ExportLanguage } from './lib/export/book.js'
import { toMarkdown, toPlainText } from './lib/export/text.js'

const router = Router()

const FORMATS = {
  md: { type: 'text/markdown; charset=utf-8', render: toMarkdown },
  txt: { type: 'text/plain; charset=utf-8', render: toPlainText },
} as const

router.get('/export/:format', async (req, res) => {
  const format = FORMATS[req.params.format as keyof typeof FORMATS]
  if (!format) {
    res.status(404).json({ error: `unknown export format: ${req.params.format}` })
    return
  }
  const lang: ExportLanguage = req.query.lang === 'de' ? 'de' : 'en'
  try {
    const book = await loadBook(deploymentBook(), lang)
    const body = format.render(book, { lang, sceneTitles: req.query.scene_titles === '1' })
    res.setHeader('Content-Type', format.type)
    res.setHeader('Content-Disposition', `attachment; filename="${fileStem(book)}.${req.params.format}"`)
    res.send(body)
  } catch (err) {
    console.error('Export error:', err)
    res.status(500).json({ error: (err as Error).message || 'Export failed' })
  }
})

export default router
