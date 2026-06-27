/**
 * Server-side bootstrap library — the offer-on-empty / use-on-exists pattern.
 *
 * Adapted from templates/bootstrap/bootstrap.server.ts.template. APP-AA
 * additions to the gene-pool body:
 *   - NAMESPACE = 'aa'.
 *   - mapField() forwards `array_template_ref` and derives
 *     `array_item_type` when the seed omits it (AA's data-model seeds
 *     predate the explicit array_item_type convention): term when a
 *     terminology ref is present, object when a template ref is, else
 *     string.
 *
 * Three rules (per CLAUDE.md "Namespace Bootstrap on Launch"):
 *   1. If the namespace does NOT exist on launch, the app shows the user
 *      an explicit bootstrap offer. We do NOT auto-bootstrap silently.
 *   2. If the namespace DOES exist, the app uses it as-is. No schema
 *      reconciliation, no "templates differ" check. Rolling redeploys
 *      against an existing namespace must come up clean.
 *   3. On user-initiated bootstrap, write one BOOTSTRAP_RECORD audit doc
 *      capturing app version, timestamp, what was created, and the
 *      current commit SHA.
 *
 * Restore is NOT an app concern. The bootstrap UI just MENTIONS restore
 * as an alternative the user may prefer; it does not provide UI for it.
 *
 * SEED FILE CONVENTION:
 *   server/seed/terminologies/<VALUE>.json
 *   server/seed/templates/<NN>_<VALUE>.json  (numeric prefix orders deps)
 * server/seed/ mirrors data-model/ (the /export-model target) plus the
 * BOOTSTRAP_RECORD template — keep the two in sync when the model evolves.
 */

import { wipGet, wipPost, wipPut } from './wip-api.js'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(__dirname, '..', 'seed')

const NAMESPACE = 'aa'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>

interface BulkItemResult {
  index?: number
  status?: string
  id?: string
  error?: string
  error_code?: string
}

/**
 * Assert that a WIP bulk-write response contains zero per-item errors.
 *
 * WIP's bulk APIs always return HTTP 200 (PoNIF #4 — Bulk-First). Per-item
 * failures are inside `results[i].status === 'error'`. Without this check
 * the namespace ends up partially seeded and BootstrapGate transitions to
 * `ready` anyway.
 */
function assertBulkSuccess(response: unknown, context: string): void {
  const r = response as { results?: BulkItemResult[] } | BulkItemResult[]
  const items = Array.isArray(r) ? r : r.results || []
  const errors = items.filter((i) => i.status === 'error')
  if (errors.length) {
    const summary = errors
      .map((e) =>
        `[${e.index ?? '?'}] ${e.error_code || ''} ${e.error || 'unknown'}`.trim(),
      )
      .join('; ')
    throw new Error(
      `${context}: ${errors.length}/${items.length} items failed — ${summary}`,
    )
  }
}

export type BootstrapStatus = 'unknown' | 'wip_unreachable' | 'needs_bootstrap' | 'ready'

export interface BootstrapProgress {
  step: string
  detail: string
  done: boolean
  error?: string
}

/**
 * Check if WIP is reachable and whether the namespace exists.
 *
 * Namespace exists → ready, period. No "and has expected templates" check —
 * that's schema reconciliation, a YAC/migration concern, not a startup gate.
 */
export async function checkStatus(): Promise<BootstrapStatus> {
  let namespaces: Array<{ prefix: string }>
  try {
    namespaces = (await wipGet('/api/registry/namespaces')) as Array<{ prefix: string }>
  } catch {
    return 'wip_unreachable'
  }

  return namespaces.some((ns) => ns.prefix === NAMESPACE) ? 'ready' : 'needs_bootstrap'
}

/**
 * Run the full bootstrap. Calls onProgress for each step.
 *
 * Order: namespace → terminologies (terms inline) → ontology term-relations
 * → templates (filename-sorted for dependency order) → BOOTSTRAP_RECORD.
 */
export async function runBootstrap(
  onProgress: (p: BootstrapProgress) => void,
): Promise<void> {
  const progress = (step: string, detail: string) =>
    onProgress({ step, detail, done: false })

  const startedAt = new Date().toISOString()
  const templatesCreated: string[] = []
  const edgeTypesCreated: string[] = []
  const terminologiesCreated: string[] = []

  try {
    // Step 1: Create namespace (idempotent upsert via PUT)
    progress('namespace', `Creating ${NAMESPACE} namespace...`)
    await wipPut(`/api/registry/namespaces/${NAMESPACE}`, {
      description: 'AuthorAssist app data (bootstrap created)',
    })

    // Step 2: Load and create terminologies
    progress('terminologies', 'Loading seed data...')
    const termFiles = readdirSync(join(SEED_DIR, 'terminologies'))
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .sort()

    const terminologies: AnyObj[] = []
    for (const file of termFiles) {
      const data = JSON.parse(readFileSync(join(SEED_DIR, 'terminologies', file), 'utf-8'))
      terminologies.push(data)
    }

    progress('terminologies', `Creating ${terminologies.length} terminologies...`)
    const termBulk = terminologies.map((t) => ({
      value: t.value,
      label: t.label,
      description: t.description || '',
      namespace: NAMESPACE,
      ...(t.mutable ? { mutable: true } : {}),
    }))
    const termResult = (await wipPost('/api/def-store/terminologies', termBulk)) as {
      results: Array<{ status: string; id: string; error?: string }>
    }
    assertBulkSuccess(termResult, 'terminologies create')

    const termIdMap = new Map<string, string>()
    termResult.results.forEach((r, i) => {
      const seed = terminologies[i]
      if (r?.id && seed) {
        termIdMap.set(seed.value, r.id)
        terminologiesCreated.push(seed.value)
      }
    })

    // Step 3: Create terms for each terminology
    let totalTerms = 0
    for (const termData of terminologies) {
      const terms = termData.terms || []
      if (!terms.length) continue

      const termId = termIdMap.get(termData.value)
      if (!termId) continue

      progress('terms', `Creating ${terms.length} terms for ${termData.value}...`)
      const termsResult = await wipPost(
        `/api/def-store/terminologies/${termId}/terms`,
        terms,
      )
      assertBulkSuccess(termsResult, `terms create for ${termData.value}`)
      totalTerms += terms.length
    }
    progress('terms', `Created ${totalTerms} terms across ${terminologies.length} terminologies`)

    // Step 4: Create ontology term-relations.
    // AA's registry seeds carry `ontology: "part_of"` as a string HINT
    // (runtime relations are user-created); only an
    // `ontology.relationships[]` array produces bootstrap-time relations.
    const allRelations: AnyObj[] = []
    for (const termData of terminologies) {
      const rels = termData.ontology?.relationships || []
      for (const rel of rels) {
        allRelations.push({
          source_term_id: rel.source,
          target_term_id: rel.target,
          relation_type: rel.type,
        })
      }
    }

    if (allRelations.length) {
      progress('term-relations', `Creating ${allRelations.length} ontology term-relations...`)
      const relsResult = await wipPost(
        `/api/def-store/ontology/term-relations?namespace=${NAMESPACE}`,
        allRelations,
      )
      assertBulkSuccess(relsResult, 'ontology term-relations create')
    }

    // Step 5: Create templates (sorted by filename prefix for dependency order)
    const templateFiles = readdirSync(join(SEED_DIR, 'templates'))
      .filter((f) => f.endsWith('.json'))
      .sort()

    progress('templates', `Creating ${templateFiles.length} templates...`)
    for (const file of templateFiles) {
      const data = JSON.parse(readFileSync(join(SEED_DIR, 'templates', file), 'utf-8'))
      progress('templates', `Creating ${data.value}...`)

      const template: AnyObj = {
        value: data.value,
        label: data.label,
        description: data.description || '',
        namespace: NAMESPACE,
        identity_fields: data.identity_fields || [],
        fields: data.fields.map((f: AnyObj) => mapField(f)),
      }

      if (data.usage && data.usage !== 'entity') template.usage = data.usage
      if (data.source_templates) template.source_templates = data.source_templates
      if (data.target_templates) template.target_templates = data.target_templates
      if (data.versioned === false) template.versioned = false
      if (data.header_fields) template.header_fields = data.header_fields
      if (data.reporting) template.reporting = data.reporting

      const tplResult = await wipPost(
        '/api/template-store/templates?on_conflict=validate',
        [template],
      )
      assertBulkSuccess(tplResult, `template create ${data.value}`)

      if (data.usage === 'relationship') edgeTypesCreated.push(data.value)
      else templatesCreated.push(data.value)
    }

    // Wait for template cache to refresh (PoNIF #6). Without this, the
    // BOOTSTRAP_RECORD write below races the just-created template.
    progress('cache', 'Waiting for template cache to refresh...')
    await new Promise((resolve) => setTimeout(resolve, 6000))

    // Step 6: Write the BOOTSTRAP_RECORD audit doc.
    progress('audit', 'Writing BOOTSTRAP_RECORD audit doc...')
    await writeBootstrapRecord({
      startedAt,
      templatesCreated,
      edgeTypesCreated,
      terminologiesCreated,
    })

    onProgress({ step: 'done', detail: 'Bootstrap complete', done: true })
  } catch (err) {
    onProgress({
      step: 'error',
      detail: (err as Error).message,
      done: true,
      error: (err as Error).message,
    })
    throw err
  }
}

/**
 * Write the BOOTSTRAP_RECORD audit doc.
 *
 * Canonical fields: bootstrap_id, app_version, bootstrapped_at, commit_sha,
 * templates_created, edge_types_created, terminologies_created.
 *
 * Resolve BOOTSTRAP_RECORD's template_id first — the document-store endpoint
 * requires `template_id` (template_value is rejected, CASE-299). Explicit
 * template_version avoids the 5s "latest" cache (PoNIF #6).
 */
async function writeBootstrapRecord(meta: {
  startedAt: string
  templatesCreated: string[]
  edgeTypesCreated: string[]
  terminologiesCreated: string[]
}): Promise<void> {
  const tmpl = (await wipGet(
    `/api/template-store/templates/by-value/BOOTSTRAP_RECORD?namespace=${NAMESPACE}`,
  )) as { template_id: string; version: number }

  const bootstrapId = `bootstrap-${meta.startedAt.replace(/[:.]/g, '-')}`
  const doc = {
    template_id: tmpl.template_id,
    template_version: tmpl.version,
    namespace: NAMESPACE,
    data: {
      bootstrap_id: bootstrapId,
      app_version: process.env.APP_VERSION || 'unknown',
      bootstrapped_at: meta.startedAt,
      commit_sha: process.env.GIT_COMMIT_SHA || 'unknown',
      templates_created: meta.templatesCreated,
      edge_types_created: meta.edgeTypesCreated,
      terminologies_created: meta.terminologiesCreated,
    },
  }
  const result = await wipPost('/api/document-store/documents', [doc])
  assertBulkSuccess(result, 'BOOTSTRAP_RECORD write')
}

/**
 * Map a seed field definition to WIP template field format.
 *
 * AA addition over the gene-pool template: forwards `array_template_ref`
 * and derives `array_item_type` when the seed omits it — AA's data-model
 * seeds predate the explicit array_item_type convention. CASE-493: nested
 * template refs now carry a mandatory pinned version; forward
 * `array_template_ref_version` / `template_ref_version`.
 */
function mapField(f: AnyObj): AnyObj {
  const field: AnyObj = {
    name: f.name,
    label: f.label,
    type: f.type,
  }

  if (f.mandatory) field.mandatory = true
  if (f.terminology_ref) field.terminology_ref = f.terminology_ref
  if (f.semantic_type) field.semantic_type = f.semantic_type
  if (f.full_text_indexed) field.full_text_indexed = f.full_text_indexed
  if (f.default_value !== undefined) field.default_value = f.default_value

  // Reference fields
  if (f.reference_type) field.reference_type = f.reference_type
  if (f.target_templates) field.target_templates = f.target_templates
  // CASE-493: object template_ref carries a mandatory pinned version.
  if (f.template_ref) field.template_ref = f.template_ref
  if (f.template_ref_version !== undefined) field.template_ref_version = f.template_ref_version

  // Array fields
  if (f.type === 'array') {
    const terminologyRef = f.items?.terminology_ref || f.array_terminology_ref
    const templateRef = f.items?.template_ref || f.array_template_ref
    field.array_item_type =
      f.items?.type || f.array_item_type ||
      (terminologyRef ? 'term' : templateRef ? 'object' : 'string')
    if (terminologyRef) field.array_terminology_ref = terminologyRef
    if (templateRef) {
      field.array_template_ref = templateRef
      // CASE-493: mandatory pinned version for the nested array template.
      field.array_template_ref_version =
        f.items?.template_ref_version ?? f.array_template_ref_version ?? 1
    }
  }

  // Validation
  if (f.validation) field.validation = f.validation
  if (f.enum) field.validation = { ...field.validation, enum: f.enum }

  return field
}
