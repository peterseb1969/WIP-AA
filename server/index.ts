import 'dotenv/config'
import express, { Router } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { wipProxy, appConfigHandler } from '@wip/proxy'
import { createWipClient } from '@wip/client'
import { initAgent, ask } from './agent.js'
import { parseText, extractEntities } from './import.js'
import { analyse } from './analyse.js'
import bootstrapRoutes from './bootstrap.routes.js'
import configRoutes from './config.routes.js'
import demoRoutes from './demo.routes.js'
import exportRoutes from './export.routes.js'
import { bookContents, deleteBook, deploymentBook } from './lib/book-space.js'

const PORT = parseInt(process.env.PORT || '3014')
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

// --- Runtime app-config ---
// Client-visible per-deployment values, served to every browser — an
// allowlist only, never secrets or an env spread.
router.get('/api/app-config', appConfigHandler({
  namespace: WIP_NAMESPACE,
}))

// Bootstrap (offer-on-empty / use-on-exists for the aa namespace)
router.use('/server-api', bootstrapRoutes)

// Runtime config (Anthropic key set/rotate from the Settings UI)
router.use('/server-api', configRoutes)

// Demo book ("Load the demo book" in an empty book)
router.use('/server-api', demoRoutes)

// Book export (manuscript download)
router.use('/api', exportRoutes)

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

// --- Scene analysis (prompt library) ---
// Body: { system: string, user: string } — built in the browser from the
// chosen prompt and the scene's context.
router.post('/api/analyse', async (req, res) => {
  const { system, user } = req.body || {}
  if (typeof system !== 'string' || typeof user !== 'string') {
    res.status(400).json({ error: 'system and user are required' })
    return
  }
  try {
    res.json({ text: await analyse(system, user) })
  } catch (err: any) {
    console.error('Analyse error:', err)
    res.status(500).json({ error: err.message || 'Analysis failed' })
  }
})

// --- The whole book: what is in it, delete it ---
// One action, no partial deletes: "Delete book" leaves the book exactly as a
// fresh bootstrap does (server/lib/book-space.ts).
router.get('/api/book/contents', async (_req, res) => {
  try {
    res.json(await bookContents(deploymentBook()))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.delete('/api/book', async (_req, res) => {
  try {
    const deleted = await deleteBook(deploymentBook())
    res.json({ status: 'ok', ...deleted })
  } catch (err) {
    console.error('Delete book error:', err)
    res.status(500).json({ error: (err as Error).message })
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
  // API prefixes never fall through to the SPA: a JSON client asking for a
  // route this server does not serve gets a 404 it can parse. Any method.
  // req.path is relative to the router's mount, so BASE_PATH needs no handling.
  // The (\/|$) anchor catches a bare /api but lets a page route like /apiary
  // fall through. Registered after every real route, so it shadows none.
  const API_PREFIXES = /^\/(api|auth|wip|server-api|mcp)(\/|$)/
  router.use((req, res, next) => {
    if (API_PREFIXES.test(req.path)) {
      res.status(404).json({ error: 'not_found', path: req.path })
      return
    }
    next()
  })
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
