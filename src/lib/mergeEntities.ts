import type { WipClient, Term } from '@wip/client'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES } from './constants'
import { validateSceneAnnotations, type TermEntry } from './useValidateScene'

/**
 * Merging characters, locations or plot threads ("X into Y").
 *
 * WIP cannot redirect one vocabulary name to another for document writes
 * (CASE-904: deprecate + alias, Registry merge and hard-delete + alias all
 * leave "X" resolving to X's own term), and stored documents never
 * re-resolve their term fields. So the app rewrites every stored reference
 * to Y's canonical term value, then retires X:
 *
 *   1. Y's document keeps its details and fills its EMPTY fields from X
 *      (Peter's rule); X's relationships are added, re-pointed to Y.
 *   2. Every reference to X — by its value, label or any alias, case-
 *      insensitively — becomes Y's value in every referencing document.
 *   3. X's image attachments move to Y.
 *   4. X's value, label and aliases become aliases of Y — so the scene check
 *      still recognises X's old name in the prose — and then X's document is
 *      deleted and X's term is deleted (the name vocabularies are mutable,
 *      so terms are hard-deleted).
 *
 * Every step is idempotent and X is removed last, so a merge that failed
 * half-way is completed by running it again. The app always writes Y's canonical value; nothing may
 * write X's name back (WIP would still resolve it to X's deleted term).
 */

export type MergeKind = 'character' | 'location' | 'plot_thread'

interface RefSpec {
  template: string
  field: string
  shape: 'scalar' | 'array'
}

const SCENE_SUPPRESSED: RefSpec = { template: TEMPLATES.EVENT, field: 'suppressed_suggestions', shape: 'array' }

const KINDS: Record<MergeKind, { template: string; terminology: string; nameField: 'name' | 'title'; refs: RefSpec[] }> = {
  character: {
    template: TEMPLATES.CHARACTER,
    terminology: TERMINOLOGIES.CHARACTERS,
    nameField: 'name',
    refs: [
      { template: TEMPLATES.EVENT, field: 'characters', shape: 'array' },
      { template: TEMPLATES.CHAPTER, field: 'pov_character', shape: 'scalar' },
      { template: TEMPLATES.PLOT_THREAD, field: 'characters', shape: 'array' },
      { template: TEMPLATES.NOTE, field: 'linked_characters', shape: 'array' },
      { template: TEMPLATES.WORLD_RULE, field: 'related_characters', shape: 'array' },
      SCENE_SUPPRESSED,
    ],
  },
  location: {
    template: TEMPLATES.LOCATION,
    terminology: TERMINOLOGIES.LOCATIONS,
    nameField: 'name',
    refs: [
      { template: TEMPLATES.EVENT, field: 'location', shape: 'scalar' },
      { template: TEMPLATES.NOTE, field: 'linked_locations', shape: 'array' },
      { template: TEMPLATES.WORLD_RULE, field: 'related_locations', shape: 'array' },
      SCENE_SUPPRESSED,
    ],
  },
  plot_thread: {
    template: TEMPLATES.PLOT_THREAD,
    terminology: TERMINOLOGIES.PLOT_THREADS,
    nameField: 'title',
    refs: [
      { template: TEMPLATES.EVENT, field: 'plot_threads', shape: 'array' },
      { template: TEMPLATES.NOTE, field: 'linked_plot_threads', shape: 'array' },
      SCENE_SUPPRESSED,
    ],
  },
}

interface Relationship { character: string; relationship_type: string; [key: string]: unknown }
type Data = Record<string, unknown>
interface Doc { document_id: string; template_value?: string | null; data: Data }

/** One document to rewrite, and why (for the preview). */
export interface DocChange {
  documentId: string
  template: string
  title: string
  patch: Data
}

export interface MergePlan {
  kind: MergeKind
  survivor: { documentId: string; term: Term }
  absorbed: Array<{ documentId: string; term: Term }>
  /** Patch for the survivor's own document (filled fields, relationships). */
  survivorPatch: Data
  /** Other documents whose references change. */
  changes: DocChange[]
  /** Image attachments of the absorbed entities: move, or drop when the survivor already has that image. */
  images: Array<{ edgeId: string; mediaId: string; role: string; alreadyOnSurvivor: boolean }>
  /** Aliases the survivor's term ends up with. */
  aliases: string[]
}

const isEmpty = (v: unknown) =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

const uniq = <T,>(xs: T[], key: (x: T) => string = String) => {
  const seen = new Set<string>()
  return xs.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)))
}

async function allActive(wip: WipClient, template: string): Promise<Doc[]> {
  const out: Doc[] = []
  for (let page = 1; ; page++) {
    const res = await wip.documents.queryDocuments({ template_id: template, status: 'active', page, page_size: 1000 }, NAMESPACE)
    out.push(...((res.items ?? []) as unknown as Doc[]))
    if (page >= (res.pages ?? 1)) return out
  }
}

/** Every term of a name vocabulary (namespace-qualified, see CASE-900). */
export async function vocabulary(wip: WipClient, kind: MergeKind): Promise<Term[]> {
  const res = await wip.defStore.listTerms(`${NAMESPACE}:${KINDS[kind].terminology}`, { page_size: 1000, status: 'active' })
  return res.items ?? []
}

/** The term an entity document's name refers to (by value, label or alias). */
export function termFor(terms: Term[], name: string): Term | undefined {
  const n = name.toLowerCase()
  return terms.find((t) => t.value.toLowerCase() === n)
    ?? terms.find((t) => (t.label ?? '').toLowerCase() === n || t.aliases?.some((a) => a.toLowerCase() === n))
}

export const namesOf = (t: Term) => [t.value, t.label ?? '', ...(t.aliases ?? [])].filter(Boolean)

/** Work out everything a merge would change, without writing anything. */
export async function planMerge(
  wip: WipClient,
  kind: MergeKind,
  survivorId: string,
  absorbedIds: string[],
): Promise<MergePlan> {
  const cfg = KINDS[kind]
  const terms = await vocabulary(wip, kind)
  const entityDocs = await allActive(wip, cfg.template)
  const byId = new Map(entityDocs.map((d) => [d.document_id, d]))
  const entity = (id: string) => {
    const doc = byId.get(id)
    if (!doc) throw new Error(`Not found: ${id}`)
    const term = termFor(terms, String(doc.data[cfg.nameField] ?? ''))
    if (!term) throw new Error(`No name entry for "${String(doc.data[cfg.nameField])}"`)
    return { doc, term }
  }
  const survivor = entity(survivorId)
  const absorbed = absorbedIds.map(entity)
  const target = survivor.term.value

  // Every spelling of an absorbed entity, matched case-insensitively.
  const absorbedNames = new Set(absorbed.flatMap((a) => namesOf(a.term)).map((n) => n.toLowerCase()))
  const survivorNames = new Set(namesOf(survivor.term).map((n) => n.toLowerCase()))
  const rewrite = (v: unknown) => (typeof v === 'string' && absorbedNames.has(v.toLowerCase()) ? target : v)

  // 1. The survivor's document: fill empty fields, collect relationships.
  const survivorPatch: Data = {}
  for (const a of absorbed) {
    for (const [field, value] of Object.entries(a.doc.data)) {
      if (field === cfg.nameField || field === 'relationships') continue
      const current = field in survivorPatch ? survivorPatch[field] : survivor.doc.data[field]
      if (isEmpty(current) && !isEmpty(value)) survivorPatch[field] = value
    }
  }
  if (kind === 'character') {
    const isSelf = (name: string) => survivorNames.has(name.toLowerCase()) || absorbedNames.has(name.toLowerCase())
    const all = [survivor.doc, ...absorbed.map((a) => a.doc)]
      .flatMap((d) => (d.data.relationships as Relationship[] | undefined) ?? [])
      .map((r) => ({ ...r, character: rewrite(r.character) as string }))
      .filter((r) => !isSelf(r.character))
    const merged = uniq(all, (r) => `${r.character.toLowerCase()}|${r.relationship_type}`)
    const before = (survivor.doc.data.relationships as Relationship[] | undefined) ?? []
    if (JSON.stringify(merged) !== JSON.stringify(before)) survivorPatch.relationships = merged
  }

  // 2. References in every other document.
  const skip = new Set([survivorId, ...absorbedIds])
  const changes = new Map<string, DocChange>()
  const templates = uniq([...cfg.refs.map((r) => r.template), ...(kind === 'character' ? [TEMPLATES.CHARACTER] : [])])
  for (const template of templates) {
    const docs = template === cfg.template ? entityDocs : await allActive(wip, template)
    for (const doc of docs) {
      if (skip.has(doc.document_id)) continue
      const patch: Data = {}
      for (const ref of cfg.refs.filter((r) => r.template === template)) {
        const value = doc.data[ref.field]
        if (ref.shape === 'scalar') {
          if (rewrite(value) !== value) patch[ref.field] = target
        } else if (Array.isArray(value)) {
          const next = uniq(value.map(rewrite), (x) => String(x).toLowerCase())
          if (JSON.stringify(next) !== JSON.stringify(value)) patch[ref.field] = next
        }
      }
      if (kind === 'character' && template === TEMPLATES.CHARACTER) {
        const rels = (doc.data.relationships as Relationship[] | undefined) ?? []
        if (rels.some((r) => rewrite(r.character) !== r.character)) {
          const self = String(doc.data.name ?? '').toLowerCase()
          patch.relationships = uniq(
            rels.map((r) => ({ ...r, character: rewrite(r.character) as string })).filter((r) => r.character.toLowerCase() !== self),
            (r) => `${r.character.toLowerCase()}|${r.relationship_type}`,
          )
        }
      }
      if (Object.keys(patch).length) {
        const title = String(doc.data.title ?? doc.data.name ?? doc.document_id)
        const prev = changes.get(doc.document_id)
        changes.set(doc.document_id, { documentId: doc.document_id, template, title, patch: { ...prev?.patch, ...patch } })
      }
    }
  }

  // 3. Image attachments.
  const attachedTo = async (id: string) => {
    const res = await wip.documents.getDocumentRelationships(id, {
      direction: 'incoming',
      template: `${NAMESPACE}:${TEMPLATES.ATTACHED_TO}`,
      namespace: NAMESPACE,
      page_size: 500,
    })
    return (res.items ?? []) as unknown as Array<{ document_id: string; data: { source_ref: string; role: string } }>
  }
  const survivorMedia = new Set((await attachedTo(survivorId)).map((e) => e.data.source_ref))
  const images: MergePlan['images'] = []
  for (const a of absorbed) {
    for (const e of await attachedTo(a.doc.document_id)) {
      images.push({ edgeId: e.document_id, mediaId: e.data.source_ref, role: e.data.role, alreadyOnSurvivor: survivorMedia.has(e.data.source_ref) })
      survivorMedia.add(e.data.source_ref)
    }
  }

  // 4. Aliases: the survivor's own, plus every absorbed spelling.
  const aliases = uniq(
    [...(survivor.term.aliases ?? []), ...absorbed.flatMap((a) => namesOf(a.term))]
      .filter((n) => n && n !== survivor.term.value),
  )

  return {
    kind,
    survivor: { documentId: survivorId, term: survivor.term },
    absorbed: absorbed.map((a) => ({ documentId: a.doc.document_id, term: a.term })),
    survivorPatch,
    changes: [...changes.values()],
    images,
    aliases,
  }
}

/** Carry out a plan. `onStep` reports progress for the dialog. */
export async function executeMerge(wip: WipClient, plan: MergePlan, onStep: (step: string) => void) {
  if (Object.keys(plan.survivorPatch).length) {
    onStep('survivor')
    await wip.documents.updateDocument(plan.survivor.documentId, plan.survivorPatch)
  }
  for (const [i, change] of plan.changes.entries()) {
    onStep(`references:${i + 1}/${plan.changes.length}`)
    await wip.documents.updateDocument(change.documentId, change.patch)
  }
  for (const image of plan.images) {
    onStep('images')
    if (!image.alreadyOnSurvivor) {
      await wip.documents.createDocument({
        template_id: TEMPLATES.ATTACHED_TO,
        namespace: NAMESPACE,
        data: { source_ref: image.mediaId, target_ref: plan.survivor.documentId, role: image.role },
      })
    }
    await wip.documents.deleteDocument(image.edgeId)
  }
  // Aliases before retiring: until the absorbed entries are gone, a failed
  // merge can simply be run again. (The vocabularies allow two terms to
  // share a name, so the brief overlap with the absorbed term is accepted.)
  onStep('aliases')
  await wip.defStore.updateTerm(plan.survivor.term.term_id, { aliases: plan.aliases })
  onStep('retire')
  for (const a of plan.absorbed) {
    await wip.documents.deleteDocument(a.documentId)
    await wip.defStore.deleteTerm(a.term.term_id)
  }
}

/**
 * Re-run the scene check on the scenes a merge rewrote, with the
 * vocabularies as they are now. Returns the scenes with suggestions.
 */
export async function checkScenes(wip: WipClient, sceneIds: string[]) {
  const toEntries = (terms: Term[]): TermEntry[] =>
    terms.map((t) => ({ value: t.value, label: t.label || t.value, aliases: t.aliases ?? [] }))
  const [chars, locs, threads] = await Promise.all([
    vocabulary(wip, 'character'), vocabulary(wip, 'location'), vocabulary(wip, 'plot_thread'),
  ])
  const scenes = (await allActive(wip, TEMPLATES.EVENT)).filter((s) => sceneIds.includes(s.document_id))
  return scenes
    .map((s) => {
      const d = s.data as { title?: string; prose?: string; characters?: string[]; location?: string; plot_threads?: string[]; suppressed_suggestions?: string[] }
      const results = validateSceneAnnotations(
        d.prose ?? '', d.characters ?? [], d.location, d.plot_threads ?? [], d.suppressed_suggestions ?? [],
        toEntries(chars), toEntries(locs), toEntries(threads),
      )
      return { id: s.document_id, title: d.title ?? '', suggestions: results.filter((r) => r.state === 'detected' || r.state === 'missing').length }
    })
    .filter((s) => s.suggestions > 0)
}
