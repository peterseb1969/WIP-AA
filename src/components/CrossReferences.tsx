import { useTranslation } from 'react-i18next'
import { useReportQuery, wipKeys } from '@wip/react'
import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { NAMESPACE } from '../lib/constants'

type EntityKind = 'character' | 'location' | 'plot_thread'

interface RefQuery {
  group: 'scenes' | 'notes' | 'world_rules'
  sql: string
  to: (id: string) => string
}

// Every query takes the entity's term value as $1 and returns
// (document_id, name). Fields are matched in data_json, not their own
// columns: by design the doc_<value> entity view only carries columns that
// every template version shares (a field added in AA_NOTE v2 is absent
// from doc_aa_note unless the template opts in via
// reporting.cross_version_view), while data_json holds every version's data.
const has = (field: string) => `data_json->'${field}' @> jsonb_build_array($1::text)`

const QUERIES: Record<EntityKind, RefQuery[]> = {
  character: [
    { group: 'scenes', to: (id) => `/scenes?id=${id}`, sql: `SELECT document_id, title AS name FROM doc_aa_event WHERE status = 'active' AND ${has('characters')} ORDER BY story_time_sort NULLS LAST, title` },
    { group: 'notes', to: () => '/notes', sql: `SELECT document_id, title AS name FROM doc_aa_note WHERE status = 'active' AND ${has('linked_characters')} ORDER BY title` },
    { group: 'world_rules', to: () => '/world-rules', sql: `SELECT document_id, name FROM doc_aa_world_rule WHERE status = 'active' AND ${has('related_characters')} ORDER BY name` },
  ],
  location: [
    { group: 'scenes', to: (id) => `/scenes?id=${id}`, sql: `SELECT document_id, title AS name FROM doc_aa_event WHERE status = 'active' AND data_json->>'location' = $1 ORDER BY story_time_sort NULLS LAST, title` },
    { group: 'notes', to: () => '/notes', sql: `SELECT document_id, title AS name FROM doc_aa_note WHERE status = 'active' AND ${has('linked_locations')} ORDER BY title` },
    { group: 'world_rules', to: () => '/world-rules', sql: `SELECT document_id, name FROM doc_aa_world_rule WHERE status = 'active' AND ${has('related_locations')} ORDER BY name` },
  ],
  plot_thread: [
    { group: 'scenes', to: (id) => `/scenes?id=${id}`, sql: `SELECT document_id, title AS name FROM doc_aa_event WHERE status = 'active' AND ${has('plot_threads')} ORDER BY story_time_sort NULLS LAST, title` },
    { group: 'notes', to: () => '/notes', sql: `SELECT document_id, title AS name FROM doc_aa_note WHERE status = 'active' AND ${has('linked_plot_threads')} ORDER BY title` },
  ],
}

function RefGroup({ query, value }: { query: RefQuery; value: string }) {
  const { t } = useTranslation()
  // A reporting table only exists once its template has a synced document,
  // so a query against an unused template fails — that just means "none".
  // (The hook's option type wrongly requires queryKey; this is the key the
  // hook would build itself.)
  const { data } = useReportQuery(query.sql, [value], {
    namespace: NAMESPACE,
    retry: false,
    queryKey: wipKeys.reporting.query(query.sql, [value], NAMESPACE),
  })
  const rows = (data?.rows ?? []) as Array<{ document_id: string; name: string }>
  if (!rows.length) return null
  return (
    <div>
      <div className="text-xs font-medium text-text-light uppercase tracking-wide mb-1">
        {t(`cross_refs.${query.group}`, { count: rows.length })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <Link
            key={r.document_id}
            to={query.to(r.document_id)}
            className="px-2 py-0.5 rounded bg-surface text-sm text-text hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {r.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

/**
 * Where an entity is referenced across the book — scenes, notes and world
 * rules — read from the WIP reporting layer. Reporting syncs within
 * seconds, so a just-saved change may take a moment to show.
 */
export default function CrossReferences({ kind, value }: { kind: EntityKind; value: string }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="font-medium text-sm text-primary mb-3 flex items-center gap-2">
        <Link2 className="w-4 h-4" />
        {t('cross_refs.title')}
      </h3>
      <div className="space-y-3 peer">
        {QUERIES[kind].map((q) => (
          <RefGroup key={q.group} query={q} value={value} />
        ))}
      </div>
      <p className="hidden peer-empty:block text-sm text-text-muted">{t('cross_refs.none')}</p>
    </div>
  )
}
