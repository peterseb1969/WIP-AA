import { useDocuments } from '@wip/react'
import { Globe } from 'lucide-react'
import { TEMPLATES } from '../lib/constants'

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
  const { data: rules, isLoading } = useDocuments({
    template_id: TEMPLATES.WORLD_RULE,
    status: 'active',
    page_size: 50,
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading world rules...</div>
      </div>
    )
  }

  // Group by domain
  const byDomain = new Map<string, Array<{ id: string; data: WorldRuleData }>>()
  rules?.items?.forEach((r) => {
    const d = r.data as unknown as WorldRuleData
    const domain = d.domain || 'General'
    if (!byDomain.has(domain)) byDomain.set(domain, [])
    byDomain.get(domain)!.push({ id: r.document_id, data: d })
  })

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-text">World Rules</h1>
        <span className="text-sm text-text-muted">({rules?.total ?? 0})</span>
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
                    <h3 className="font-semibold text-text mb-2">{rule.data.name}</h3>
                    <p className="text-sm text-text mb-3">{rule.data.rule}</p>

                    {rule.data.implications ? (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-primary">Implications: </span>
                        <span className="text-sm text-text-muted">{rule.data.implications}</span>
                      </div>
                    ) : null}

                    {rule.data.exceptions ? (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-accent">Exceptions: </span>
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
        <p className="text-text-muted">No world rules yet. Use the AskBar to create one.</p>
      )}
    </div>
  )
}
