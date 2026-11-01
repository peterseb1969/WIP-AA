/**
 * Bootstrap routes — wires the bootstrap library to two HTTP endpoints
 * the React BootstrapGate consumes.
 *
 *   GET  /server-api/bootstrap/status?book=<ns>  → { status: BootstrapStatus, message? }
 *   POST /server-api/bootstrap/run?book=<ns>     → SSE stream of BootstrapProgress
 *
 * Both accept a name that is not a book yet: running the bootstrap on a name
 * the operator reserved for the app is how a book is added. WIP refuses the
 * namespace create for a name that is not reserved.
 *
 * Mounted at `/server-api` in server/index.ts. The SSE stream is what makes
 * the bootstrap UX bearable — live "Creating 12 terminologies... Done"
 * instead of a silent spinner.
 */

import { Router } from 'express'
import { checkStatusDetail, runBootstrap, type BootstrapProgress } from './lib/bootstrap.js'
import { bookOf, forgetBooks, requireBook } from './lib/books.js'
import { initSSE, sendSSE, endSSE } from './lib/sse.js'

const router = Router()

/**
 * GET /server-api/bootstrap/status
 * Check if WIP is reachable and the namespace exists.
 */
router.get('/bootstrap/status', requireBook({ allowNew: true }), async (_req, res) => {
  try {
    res.json(await checkStatusDetail(bookOf(res)))
  } catch (err) {
    res.json({ status: 'wip_unreachable', error: (err as Error).message })
  }
})

/**
 * POST /server-api/bootstrap/run
 * Execute the bootstrap. Streams progress via SSE; client reads with a
 * fetch-stream reader (no eventsource library needed).
 */
router.post('/bootstrap/run', requireBook({ allowNew: true }), (req, res) => {
  const book = bookOf(res)
  initSSE(res)

  let clientConnected = true
  req.on('close', () => { clientConnected = false })

  runBootstrap(book, (p: BootstrapProgress) => {
    if (clientConnected) sendSSE(res, p.done ? 'complete' : 'progress', p)
  })
    .then(() => {
      if (clientConnected) endSSE(res)
    })
    .catch((err) => {
      if (clientConnected) {
        sendSSE(res, 'error', { message: (err as Error).message })
        endSSE(res)
      }
    })
    // The namespace may exist now, finished or not: re-read the books.
    .finally(forgetBooks)
})

export default router
