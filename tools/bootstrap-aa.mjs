#!/usr/bin/env node
// Bootstrap the `aa` namespace from data-model/ seed files using @wip/client.
//
// Idempotent-ish: terminologies/templates that already exist surface as
// per-item errors which are reported but don't abort the run. For a truly
// fresh namespace every item reports `created`.
//
// Usage:
//   NODE_TLS_REJECT_UNAUTHORIZED=0 node tools/bootstrap-aa.mjs
//
// Env (falls back to .env):
//   WIP_BASE_URL  (default https://localhost:8443)
//   WIP_API_KEY   (admin or aa-granted key)
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWipClient } from '@wip/client'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const NS = 'aa'
const BASE_URL = process.env.WIP_BASE_URL || 'https://localhost:8443'
const API_KEY = process.env.WIP_API_KEY
if (!API_KEY) { console.error('WIP_API_KEY not set'); process.exit(1) }

const wip = createWipClient({ baseUrl: BASE_URL, auth: { type: 'api-key', key: API_KEY } })

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const seedDir = (sub) => path.join(ROOT, 'data-model', sub)

// Seed template arrays lack array_item_type (the API requires it);
// derive it the same way the May-2026 MCP bootstrap did.
function normalizeFields(fields) {
  return fields.map((f) => {
    if (f.type === 'array' && !f.array_item_type) {
      const item_type = f.array_terminology_ref ? 'term' : f.array_template_ref ? 'object' : 'string'
      return { ...f, array_item_type: item_type }
    }
    return f
  })
}

async function main() {
  console.log(`Bootstrapping namespace '${NS}' at ${BASE_URL}`)

  // 1. Namespace (PUT upsert — idempotent)
  await wip.registry.upsertNamespace(NS, { description: 'AuthorAssist app data' })
  console.log(`namespace '${NS}': upserted`)

  // 2. Terminologies + terms
  const termFiles = fs.readdirSync(seedDir('terminologies')).filter((f) => f.endsWith('.json')).sort()
  for (const file of termFiles) {
    const seed = readJson(path.join(seedDir('terminologies'), file))
    const res = await wip.defStore.createTerminology({
      value: seed.value,
      label: seed.label,
      description: seed.description || '',
      namespace: NS,
      extensible: !!seed.extensible,
      mutable: !!seed.mutable,
    })
    if (res.status === 'error') {
      console.log(`terminology ${seed.value}: ERROR ${res.error}`)
      continue
    }
    const terminologyId = res.id
    console.log(`terminology ${seed.value}: ${res.status} (${terminologyId})`)
    if (seed.terms?.length) {
      const bulk = await wip.defStore.createTerms(terminologyId, seed.terms)
      const failed = (bulk.results || []).filter((r) => r.status === 'error')
      console.log(`  terms: ${bulk.succeeded}/${bulk.total} created${failed.length ? ` — FAILURES: ${failed.map((f) => `${f.value}: ${f.error}`).join('; ')}` : ''}`)
    }
  }

  // 3. Templates in numbered order
  const tplFiles = fs.readdirSync(seedDir('templates')).filter((f) => f.endsWith('.json')).sort()
  for (const file of tplFiles) {
    const seed = readJson(path.join(seedDir('templates'), file))
    const res = await wip.templates.createTemplate({
      value: seed.value,
      label: seed.label,
      description: seed.description || '',
      namespace: NS,
      identity_fields: seed.identity_fields || [],
      fields: normalizeFields(seed.fields),
    })
    if (res.status === 'error') {
      console.log(`template ${seed.value}: ERROR ${res.error}`)
    } else {
      console.log(`template ${seed.value}: ${res.status} v${res.version} (${res.id})`)
    }
  }

  console.log('Done.')
}

main().catch((err) => { console.error('Bootstrap failed:', err.message || err); process.exit(1) })
