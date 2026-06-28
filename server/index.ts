import 'dotenv/config'
import express, { Router } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { wipProxy } from '@wip/proxy'
import { createWipClient } from '@wip/client'
import { initAgent, ask } from './agent.js'
import { parseText, extractEntities } from './import.js'
import bootstrapRoutes from './bootstrap.routes.js'
import configRoutes from './config.routes.js'

const PORT = parseInt(process.env.PORT || '3002')
const WIP_BASE_URL = process.env.WIP_BASE_URL || 'https://localhost:8443'
const WIP_API_KEY = process.env.WIP_API_KEY || 'dev_master_key_for_testing'
const WIP_NAMESPACE = process.env.WIP_NAMESPACE || 'aa'

// APP_BASE_PATH — external path prefix when behind a reverse proxy.
// E.g. /apps/aa when Caddy routes https://host/apps/aa/* to this app.
// The reverse proxy does NOT strip the prefix; the app mounts every route
// under APP_BASE_PATH so asset URLs and proxied paths match.
const BASE_PATH = (process.env.APP_BASE_PATH || '').replace(/\/$/, '') || '/'

// Cached term enums for AI extraction prompt
let termEnums: { roles: string[], locationTypes: string[] } | undefined
const app = express()
const router = Router()

app.use(cors())

// WIP API proxy — must be before express.json() (uses raw body forwarding)
router.use('/wip', wipProxy({
  baseUrl: WIP_BASE_URL,
  apiKey: WIP_API_KEY,
}))

// JSON body parsing for our own routes (skips /wip, already handled above).
router.use((req, res, next) => {
  if (req.path.startsWith('/wip')) return next()
  express.json({ limit: '5mb' })(req, res, next)
})

// --- Health ---
router.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'authorassist' })
})

// Bootstrap (offer-on-empty / use-on-exists for the aa namespace)
router.use('/server-api', bootstrapRoutes)

// Runtime config (Anthropic key set/rotate from the Settings UI)
router.use('/server-api', configRoutes)

// --- Ask endpoint ---
router.post('/api/ask', async (req, res) => {
  const { question, sessionId } = req.body
  if (!question) {
    res.status(400).json({ error: 'question is required' })
    return
  }
  try {
    const result = await ask(question, sessionId)
    res.json(result)
  } catch (err: any) {
    console.error('Ask error:', err)
    res.status(500).json({ error: err.message || 'Internal error' })
  }
})

// --- Import: parse text into chapters/scenes ---
router.post('/api/import/parse', (req, res) => {
  const { text } = req.body
  if (!text) {
    res.status(400).json({ error: 'text is required' })
    return
  }
  try {
    const chapters = parseText(text)
    res.json({ chapters })
  } catch (err: any) {
    console.error('Parse error:', err)
    res.status(500).json({ error: err.message || 'Parse failed' })
  }
})

// --- Import: extract entities from a chapter ---
router.post('/api/import/extract', async (req, res) => {
  const { text, title } = req.body
  if (!text) {
    res.status(400).json({ error: 'text is required' })
    return
  }
  try {
    const entities = await extractEntities(text, title || 'Untitled', termEnums)
    res.json(entities)
  } catch (err: any) {
    console.error('Extract error:', err)
    res.status(500).json({ error: err.message || 'Extraction failed' })
  }
})

// --- Delete book data ---
// Body: { templates: string[], clearNames: boolean }
// templates: array of template values to delete documents for (e.g. ['AA_CHAPTER', 'AA_EVENT'])
// clearNames: also delete terms from extensible terminologies (AA_CHARACTERS, AA_LOCATIONS, AA_PLOT_THREADS)
const TEMPLATE_VALUES = [
  'AA_CHAPTER', 'AA_EVENT', 'AA_CHARACTER', 'AA_LOCATION',
  'AA_PLOT_THREAD', 'AA_NOTE', 'AA_WORLD_RULE', 'AA_BOOK_STRUCTURE',
] as const

router.delete('/api/book/reset', async (req, res) => {
  try {
    const { templates = [], clearNames = false } = req.body || {}
    const templateSet = new Set(templates as string[])
    const wip = createWipClient({
      baseUrl: WIP_BASE_URL,
      auth: { type: 'api-key', key: WIP_API_KEY },
    })

    let deletedDocs = 0
    let deletedTerms = 0

    // Delete documents by template
    for (const tv of TEMPLATE_VALUES) {
      if (!templateSet.has(tv)) continue

      while (true) {
        const docs = await wip.documents.listDocuments({
          namespace: WIP_NAMESPACE,
          template_value: tv,
          status: 'active',
          page: 1,
          page_size: 100,
        })

        if (!docs.items.length) break

        await Promise.all(
          docs.items.map((doc: any) =>
            wip.documents.deleteDocument(doc.document_id, { updatedBy: 'book-reset' }).catch(() => {})
          )
        )
        deletedDocs += docs.items.length

        if (docs.items.length < 100) break
      }
    }

    // Delete terms from extensible terminologies
    if (clearNames) {
      const extensible = ['AA_CHARACTERS', 'AA_LOCATIONS', 'AA_PLOT_THREADS']
      for (const termValue of extensible) {
        let terminologyId: string | null = null
        try {
          const t = await wip.defStore.getTerminology(termValue)
          terminologyId = (t as any).terminology_id
        } catch { continue }
        if (!terminologyId) continue

        while (true) {
          const termPage = await wip.defStore.listTerms(terminologyId, { page: 1, page_size: 100 })
          if (!termPage.items.length) break

          await Promise.all(
            termPage.items.map((term: any) =>
              wip.defStore.deleteTerm(term.term_id, { hardDelete: true }).catch(() => {})
            )
          )
          deletedTerms += termPage.items.length

          if (termPage.items.length < 100) break
        }
      }
    }

    res.json({ status: 'ok', deletedDocs, deletedTerms })
  } catch (err: any) {
    console.error('Reset error:', err)
    res.status(500).json({ error: err.message || 'Reset failed' })
  }
})

// --- Load term enums from WIP ---
async function loadTermEnums() {
  try {
    const wip = createWipClient({
      baseUrl: WIP_BASE_URL,
      auth: { type: 'api-key', key: WIP_API_KEY },
    })
    const [roles, locTypes] = await Promise.all([
      wip.defStore.listTerms('AA_CHARACTER_ROLE', { page_size: 50, namespace: WIP_NAMESPACE }),
      wip.defStore.listTerms('AA_LOCATION_TYPE', { page_size: 50, namespace: WIP_NAMESPACE }),
    ])
    termEnums = {
      roles: roles.items.map((t: any) => t.value),
      locationTypes: locTypes.items.map((t: any) => t.value),
    }
    console.log(`Loaded term enums: ${termEnums.roles.length} roles, ${termEnums.locationTypes.length} location types`)
  } catch (err: any) {
    console.warn('Failed to load term enums from WIP, using defaults:', err.message)
  }
}

// In production (compose / k8s targets), serve the built frontend from dist/.
// Dev-with-app-source forces NODE_ENV=development, so this block is skipped
// and the dev_simple renderer routes /apps/aa/* to the Vite dev port instead.
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const distPath = path.resolve(__dirname, '..', 'dist')
  router.use(express.static(distPath))
  const indexHtml = path.join(distPath, 'index.html')
  router.get('/', (_req, res) => { res.sendFile(indexHtml) })
  router.get('{*path}', (_req, res) => { res.sendFile(indexHtml) })
}

// Mount router at BASE_PATH
app.use(BASE_PATH, router)

// --- Start ---
async function main() {
  await initAgent()
  await loadTermEnums()
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
    if (BASE_PATH !== '/') {
      console.log(`  base path: ${BASE_PATH}`)
    }
  })
}

main().catch(err => {
  console.error('Failed to start:', err)
  process.exit(1)
})
