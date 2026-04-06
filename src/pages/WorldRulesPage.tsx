import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments, useDeleteDocument } from '@wip/react'
import { Globe, Plus, Pencil, Trash2 } from 'lucide-react'
import { NAMESPACE, TEMPLATES } from '../lib/constants'
import CreateEntityModal from '../components/CreateEntityModal'
import BackLink from '../components/BackLink'

interface WorldRuleData {
  name: string
  domain?: string
  rule: string
  implications?: string
  exceptions?: string
  related_characters?: string[]
  related_locations?: string[]
}

export default function WorldRulesPage() {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const deleteDoc = useDeleteDocument()
  const { data: rules, isLoading } = useDocuments({
    template_id: TEMPLATES.WORLD_RULE,
    status: 'active',
    page_size: 50,
    namespace: NAMESPACE,
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">{t('world_rules.loading')}</div>
      </div>
    )
  }

  // Group by domain
  const byDomain = new Map<string, Array<{ id: string; data: WorldRuleData }>>()
  rules?.items?.forEach((r) => {
    const d = r.data as unknown as WorldRuleData
    const domain = d.domain || t('world_rules.general')
    if (!byDomain.has(domain)) byDomain.set(domain, [])
    byDomain.get(domain)!.push({ id: r.document_id, data: d })
  })

  return (
    <div className="p-6 max-w-4xl">
      <BackLink />
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">{t('world_rules.title')}</h1>
        <span className="text-sm text-text-muted">({rules?.total ?? 0})</span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('world_rules.new')}
        </button>
      </div>

      {rules?.items?.length ? (
        <div className="space-y-6">
          {[...byDomain.entries()].map(([domain, items]) => (
            <div key={domain}>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                {domain}
              </h2>
              <div className="space-y-3">
                {items.map((rule) => (
                  <div key={rule.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text">{rule.data.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditData(rule.data as unknown as Record<string, unknown>)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-primary hover:border-primary border border-transparent rounded transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          {t('common.edit')}
                        </button>
                        {confirmDelete === rule.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-red-600">{t('world_rules.delete_confirm')}</span>
                            <button
                              onClick={() => deleteDoc.mutate({ id: rule.id }, { onSuccess: () => setConfirmDelete(null) })}
                              disabled={deleteDoc.isPending}
                              className="px-1.5 py-0.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {t('common.yes')}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-text-muted rounded hover:bg-gray-200 transition-colors"
                            >
                              {t('common.no')}
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(rule.id)}
                            className="text-text-muted hover:text-red-600 p-1 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-text mb-3">{rule.data.rule}</p>

                    {rule.data.implications ? (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-primary">{t('world_rules.implications')}: </span>
                        <span className="text-sm text-text-muted">{rule.data.implications}</span>
                      </div>
                    ) : null}

                    {rule.data.exceptions ? (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-accent">{t('world_rules.exceptions')}: </span>
                        <span className="text-sm text-text-muted">{rule.data.exceptions}</span>
                      </div>
                    ) : null}

                    {(rule.data.related_characters?.length || rule.data.related_locations?.length) ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.data.related_characters?.map((c, i) => (
                          <span key={`c-${i}`} className="px-2 py-0.5 bg-primary/5 rounded text-xs text-primary">
                            {String(c)}
                          </span>
                        ))}
                        {rule.data.related_locations?.map((l, i) => (
                          <span key={`l-${i}`} className="px-2 py-0.5 bg-accent/5 rounded text-xs text-accent">
                            {String(l)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-text-muted">{t('world_rules.empty')}</p>
      )}

      {showCreate ? (
        <CreateEntityModal
          entityType="world_rule"
          onClose={() => setShowCreate(false)}
        />
      ) : null}

      {editData ? (
        <CreateEntityModal
          entityType="world_rule"
          mode="edit"
          existingData={editData}
          onClose={() => setEditData(null)}
          onCreated={() => setEditData(null)}
        />
      ) : null}
    </div>
  )
}
