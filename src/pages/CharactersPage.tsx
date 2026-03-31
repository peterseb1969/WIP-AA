import { useState } from 'react'
import { useDocuments, useTerms } from '@wip/react'
import { Users, ArrowLeft, Heart } from 'lucide-react'
import { TEMPLATES, TERMINOLOGIES, ROLE_COLORS } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'

interface CharacterData {
  name: string
  role: string
  age?: string
  description?: string
  personality?: string
  backstory?: string
  goals?: string
  flaws?: string
  voice_notes?: string
  arc_summary?: string
  relationships?: Array<{
    character: string
    relationship_type: string
    start_time?: number
    end_time?: number
    description?: string
  }>
}

function CharacterCard({ data, onClick }: { data: CharacterData; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-text">{data.name}</h3>
        <StatusBadge label={data.role} colorClass={ROLE_COLORS[data.role]} />
      </div>
      {data.age ? <div className="text-xs text-text-muted mb-1">Age: {data.age}</div> : null}
      {data.description ? (
        <p className="text-sm text-text-muted line-clamp-2">{data.description}</p>
      ) : null}
      {data.relationships?.length ? (
        <div className="mt-2 flex items-center gap-1 text-xs text-text-light">
          <Heart className="w-3 h-3" />
          {data.relationships.length} relationship{data.relationships.length > 1 ? 's' : ''}
        </div>
      ) : null}
    </button>
  )
}

function CharacterDetail({ data, onBack }: { data: CharacterData; onBack: () => void }) {
  // Resolve character names from terms
  const { data: charTerms } = useTerms(TERMINOLOGIES.CHARACTERS, { page_size: 50 })
  const termLookup = new Map(charTerms?.items?.map((t) => [t.value, t.label]) ?? [])

  const sections = [
    { label: 'Personality', value: data.personality },
    { label: 'Backstory', value: data.backstory },
    { label: 'Goals', value: data.goals },
    { label: 'Flaws', value: data.flaws },
    { label: 'Voice Notes', value: data.voice_notes },
    { label: 'Arc Summary', value: data.arc_summary },
  ].filter((s) => s.value)

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-primary mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All characters
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
          {data.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">{data.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge label={data.role} colorClass={ROLE_COLORS[data.role]} />
            {data.age ? <span className="text-sm text-text-muted">Age: {data.age}</span> : null}
          </div>
          {data.description ? (
            <p className="text-sm text-text-muted mt-2 max-w-xl">{data.description}</p>
          ) : null}
        </div>
      </div>

      {/* Character bible sections */}
      {sections.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {sections.map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-sm text-primary mb-2">{s.label}</h3>
              <p className="text-sm text-text whitespace-pre-wrap">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Relationships */}
      {data.relationships?.length ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-sm text-primary mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Relationships ({data.relationships.length})
          </h3>
          <div className="space-y-2">
            {data.relationships.map((rel, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded bg-surface">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {(termLookup.get(rel.character) ?? rel.character).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text">
                    {termLookup.get(rel.character) ?? rel.character}
                  </div>
                  <div className="text-xs text-text-muted">
                    {rel.relationship_type.replace(/_/g, ' ').toLowerCase()}
                    {rel.start_time != null ? ` (from ${rel.start_time})` : ''}
                    {rel.end_time != null ? ` to ${rel.end_time}` : ''}
                  </div>
                </div>
                {rel.description ? (
                  <div className="text-xs text-text-light max-w-48 truncate">{rel.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CharactersPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: characters, isLoading } = useDocuments({
    template_id: TEMPLATES.CHARACTER,
    status: 'active',
    page_size: 50,
  })

  const selected = characters?.items?.find((c) => c.document_id === selectedId)
  const selectedData = selected?.data as unknown as CharacterData | undefined

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-text-muted">Loading characters...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      {selectedData ? (
        <CharacterDetail data={selectedData} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold text-text">Characters</h1>
            <span className="text-sm text-text-muted">({characters?.total ?? 0})</span>
          </div>

          {characters?.items?.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.items.map((ch) => (
                <CharacterCard
                  key={ch.document_id}
                  data={ch.data as unknown as CharacterData}
                  onClick={() => setSelectedId(ch.document_id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-text-muted">No characters yet. Use the AskBar to create one.</p>
          )}
        </>
      )}
    </div>
  )
}
