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
  const wipClient = useWipClient()
  const queryClient = useQueryClient()

  // Resolve terminology value → UUID
  const { data: terminologies } = useTerminologies({
    namespace: NAMESPACE,
    page_size: 50,
  } as any)

  const terminologyId = useMemo(() => {
    for (const t of terminologies?.items ?? []) {
      if ((t as any).value === terminologyValue) return (t as any).terminology_id
    }
    return null
  }, [terminologies, terminologyValue])

  // Fetch terms and find the matching one
  const { data: terms } = useTerms(terminologyId ?? '', {
    page_size: 100,
  } as any)

  const term = useMemo(() => {
    if (!terms?.items) return null
    const upper = entityTermValue.toUpperCase()
    return (terms.items as any[]).find(
      (t) => t.value.toUpperCase() === upper
    ) ?? null
  }, [terms, entityTermValue])

  const aliases: string[] = term?.aliases ?? []
  const termId: string | null = term?.term_id ?? null

  const updateAliases = useCallback(async (newAliases: string[]) => {
    if (!termId) return
    setSaving(true)
    try {
      await (wipClient as any).defStore.updateTerm(termId, { aliases: newAliases })
      queryClient.invalidateQueries({ queryKey: wipKeys.terms.all })
    } finally {
      setSaving(false)
    }
  }, [termId, wipClient, queryClient])

  const handleAdd = useCallback(() => {
    const trimmed = newAlias.trim()
    if (!trimmed || aliases.includes(trimmed)) return
    updateAliases([...aliases, trimmed])
    setNewAlias('')
  }, [newAlias, aliases, updateAliases])

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
            onChange={(e) => setNewAlias(e.target.value)}
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
    </div>
  )
}
