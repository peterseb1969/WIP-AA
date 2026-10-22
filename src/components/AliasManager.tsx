import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTerminologies, useTerms, useWipClient, wipKeys } from '@wip/react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Plus, Tag } from 'lucide-react'
import { NAMESPACE } from '../lib/constants'

interface AliasManagerProps {
  terminologyValue: string
  entityTermValue: string
}

export default function AliasManager({ terminologyValue, entityTermValue }: AliasManagerProps) {
  const { t } = useTranslation()
  const [newAlias, setNewAlias] = useState('')
  const [saving, setSaving] = useState(false)
  // An alias the writer tried to add that another entity already answers
  // to. owners === null means the check itself failed.
  const [conflict, setConflict] = useState<{ alias: string; owners: string[] | null } | null>(null)
  const wipClient = useWipClient()
  const queryClient = useQueryClient()

  // Resolve terminology value → UUID
  const { data: terminologies } = useTerminologies({
    namespace: NAMESPACE,
    page_size: 50,
  })

  const terminologyId = useMemo(() => {
    for (const t of terminologies?.items ?? []) {
      if (t.value === terminologyValue) return t.terminology_id
    }
    return null
  }, [terminologies, terminologyValue])

  // Fetch terms and find the matching one
  const { data: terms } = useTerms(terminologyId ?? '', {
    page_size: 1000,
    status: 'active',
  })

  // The entity's stored name may be the term's value, its label or an alias
  // ("Lady Linora Thalyn" for LADY_LINORA_THALYN) — match all of them.
  const term = useMemo(() => {
    if (!terms?.items) return null
    const name = entityTermValue.toLowerCase()
    const items = terms.items
    return items.find((t) => t.value.toLowerCase() === name)
      ?? items.find((t) => (t.label ?? '').toLowerCase() === name || (t.aliases ?? []).some((a: string) => a.toLowerCase() === name))
      ?? null
  }, [terms, entityTermValue])

  const aliases: string[] = term?.aliases ?? []
  const termId: string | null = term?.term_id ?? null

  const updateAliases = useCallback(async (newAliases: string[]) => {
    if (!termId) return
    setSaving(true)
    try {
      await wipClient.defStore.updateTerm(termId, { aliases: newAliases })
      queryClient.invalidateQueries({ queryKey: wipKeys.terms.all })
    } finally {
      setSaving(false)
    }
  }, [termId, wipClient, queryClient])

  const addAlias = useCallback((alias: string) => {
    updateAliases([...aliases, alias])
    setNewAlias('')
    setConflict(null)
  }, [aliases, updateAliases])

  // Scene validation matches prose against every term's value, label and
  // aliases, so an alias another entity already answers to would make the
  // same text match both. Check the whole terminology first (exact,
  // case-insensitive, all matches) and let the writer decide.
  const handleAdd = useCallback(async () => {
    const trimmed = newAlias.trim()
    if (!trimmed || aliases.includes(trimmed)) return
    setSaving(true)
    let owners: string[] | null
    try {
      const hits = await wipClient.defStore.searchTerms(trimmed, {
        terminology: terminologyValue,
        namespace: NAMESPACE,
        mode: 'exact',
        limit: 100,
      })
      owners = [...new Set(
        hits.items
          .filter((h) => h.term.term_id !== termId)
          .map((h) => h.term.label || h.term.value),
      )]
    } catch {
      owners = null
    } finally {
      setSaving(false)
    }
    if (owners && owners.length === 0) addAlias(trimmed)
    else setConflict({ alias: trimmed, owners })
  }, [newAlias, aliases, wipClient, terminologyValue, termId, addAlias])

  const handleRemove = useCallback((alias: string) => {
    updateAliases(aliases.filter((a) => a !== alias))
  }, [aliases, updateAliases])

  if (!termId) return null

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Tag className="w-3 h-3 text-text-light" />
        <span className="text-xs font-medium text-text-light uppercase tracking-wide">
          {t('alias_manager.also_known_as')}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {aliases.map((alias) => (
          <span
            key={alias}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-sm rounded-full"
          >
            {alias}
            <button
              onClick={() => handleRemove(alias)}
              disabled={saving}
              className="hover:text-red-500 transition-colors disabled:opacity-50"
              title={t('alias_manager.remove_title', { alias })}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd()
          }}
          className="inline-flex items-center gap-1"
        >
          <input
            value={newAlias}
            onChange={(e) => {
              setNewAlias(e.target.value)
              setConflict(null)
            }}
            placeholder={t('alias_manager.add_placeholder')}
            disabled={saving}
            className="w-28 px-2.5 py-0.5 text-sm border border-gray-200 rounded-full focus:border-primary focus:outline-none disabled:opacity-50"
          />
          {newAlias.trim() && (
            <button
              type="submit"
              disabled={saving}
              className="text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
              title={t('alias_manager.add_title')}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
      {conflict && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            {conflict.owners
              ? t('alias_manager.collision', { alias: conflict.alias, owners: conflict.owners.join(', ') })
              : t('alias_manager.collision_check_failed', { alias: conflict.alias })}
          </span>
          <button
            onClick={() => addAlias(conflict.alias)}
            disabled={saving}
            className="font-medium underline hover:text-amber-900 disabled:opacity-50"
          >
            {t('alias_manager.add_anyway')}
          </button>
          <button
            onClick={() => setConflict(null)}
            className="text-amber-700 hover:text-amber-900"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}
    </div>
  )
}
