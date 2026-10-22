/**
 * Demo book routes — "Load the demo book" for an empty book space.
 *
 *   GET  /server-api/demo/status → { available: boolean }
 *   POST /server-api/demo/load   → SSE stream of { step, detail }
 *
 * Available only when the book is bootstrapped and has no documents and no
 * names: the demo must never mix into a writer's own novel. The load checks
 * again before writing. Mounted at `/server-api` in server/index.ts.
 */

import { Router } from 'express'
import { checkStatus } from './lib/bootstrap.js'
import { bookIsEmpty, loadDemoBook, type DemoTarget } from './lib/demo-book.js'
import { initSSE, sendSSE, endSSE } from './lib/sse.js'

// Read per request, like the bootstrap: the namespace is the deployment's.
const target = (): DemoTarget => ({
  namespace: process.env.WIP_NAMESPACE || 'aa',
  baseUrl: process.env.WIP_BASE_URL || 'https://localhost:8443',
  apiKey: process.env.WIP_API_KEY || '',
})

const router = Router()

router.get('/demo/status', async (_req, res) => {
  try {
    const available = (await checkStatus()) === 'ready' && (await bookIsEmpty(target()))
    res.json({ available })
  } catch (err) {
    res.json({ available: false, error: (err as Error).message })
  }
})

router.post('/demo/load', (req, res) => {
  initSSE(res)
  let clientConnected = true
  req.on('close', () => { clientConnected = false })

  loadDemoBook(target(), (p) => { if (clientConnected) sendSSE(res, 'progress', p) })
    .then((summary) => {
      if (clientConnected) {
        sendSSE(res, 'complete', { step: 'done', detail: summary })
        endSSE(res)
      }
    })
    .catch((err) => {
      if (clientConnected) {
        sendSSE(res, 'error', { message: (err as Error).message })
        endSSE(res)
      }
    })
})

export default router
