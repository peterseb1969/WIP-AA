import { useState, useMemo } from 'react'
import { useCreateDocument, useTerms } from '@wip/react'
import { X, Plus } from 'lucide-react'
import { TEMPLATES, TERMINOLOGIES } from '../lib/constants'

// ── Field Definition Types ───────────────────────────────

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'tags'

interface FieldDef {
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  terminologyId?: string   // for select/multi-select — fetches terms as options
  options?: string[]        // static options (alternative to terminology)
}

interface EntityConfig {
  templateId: string
  label: string
  fields: FieldDef[]
}

// ── Entity Configurations ────────────────────────────────

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  character: {
    templateId: TEMPLATES.CHARACTER,
    label: 'Character',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Character name' },
      { name: 'role', label: 'Role', type: 'select', required: true, terminologyId: TERMINOLOGIES.CHARACTER_ROLE },
      { name: 'age', label: 'Age', type: 'text', placeholder: 'e.g. Late 20s, 42' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Physical appearance, distinguishing features' },
      { name: 'personality', label: 'Personality', type: 'textarea', placeholder: 'Key personality traits' },
      { name: 'backstory', label: 'Backstory', type: 'textarea', placeholder: 'Background and history' },
      { name: 'goals', label: 'Goals', type: 'textarea', placeholder: 'What drives this character?' },
      { name: 'flaws', label: 'Flaws', type: 'textarea', placeholder: 'Weaknesses, blind spots' },
      { name: 'voice_notes', label: 'Voice Notes', type: 'textarea', placeholder: 'How they speak, verbal tics' },
    ],
  },
  location: {
    templateId: TEMPLATES.LOCATION,
    label: 'Location',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Location name' },
      { name: 'type', label: 'Type', type: 'select', terminologyId: TERMINOLOGIES.LOCATION_TYPE },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What does it look like?' },
      { name: 'atmosphere', label: 'Atmosphere', type: 'textarea', placeholder: 'Mood, sounds, smells' },
      { name: 'rules', label: 'Rules', type: 'textarea', placeholder: 'What rules apply here?' },
      { name: 'significance', label: 'Significance', type: 'textarea', placeholder: 'Why does this place matter?' },
    ],
  },
  chapter: {
    templateId: TEMPLATES.CHAPTER,
    label: 'Chapter',
    fields: [
      { name: 'number', label: 'Chapter Number', type: 'number', required: true, placeholder: '1' },
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Chapter title' },
      { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'What happens in this chapter?' },
      { name: 'status', label: 'Status', type: 'select', terminologyId: TERMINOLOGIES.CHAPTER_STATUS },
      { name: 'pov_character', label: 'POV Character', type: 'select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'themes', label: 'Themes', type: 'tags', placeholder: 'Add theme...' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Chapter notes' },
    ],
  },
  scene: {
    templateId: TEMPLATES.EVENT,
    label: 'Scene',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Scene title' },
      { name: 'event_type', label: 'Event Type', type: 'select', required: true, terminologyId: TERMINOLOGIES.EVENT_TYPE },
      { name: 'chapter_number', label: 'Chapter', type: 'number', placeholder: '1' },
      { name: 'scene_order', label: 'Scene Order', type: 'number', placeholder: '1' },
      { name: 'story_time_raw', label: 'Story Time', type: 'text', placeholder: 'e.g. Day 1, Morning after the battle' },
      { name: 'story_time_sort', label: 'Sort Order (numeric)', type: 'number', placeholder: '10' },
      { name: 'location', label: 'Location', type: 'select', terminologyId: TERMINOLOGIES.LOCATIONS },
      { name: 'characters', label: 'Characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'summary', label: 'Summary', type: 'textarea', placeholder: 'What happens in this scene?' },
      { name: 'plot_threads', label: 'Plot Threads', type: 'multi-select', terminologyId: TERMINOLOGIES.PLOT_THREADS },
      { name: 'emotional_beat', label: 'Emotional Beat', type: 'text', placeholder: 'The emotional tone' },
    ],
  },
  plot_thread: {
    templateId: TEMPLATES.PLOT_THREAD,
    label: 'Plot Thread',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Thread title' },
      { name: 'status', label: 'Status', type: 'select', required: true, terminologyId: TERMINOLOGIES.PLOT_THREAD_STATUS },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What is this thread about?' },
      { name: 'opened_chapter', label: 'Opened In Chapter', type: 'number', placeholder: '1' },
      { name: 'characters', label: 'Characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Notes about this thread' },
    ],
  },
  note: {
    templateId: TEMPLATES.NOTE,
    label: 'Note',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Note title' },
      { name: 'note_type', label: 'Type', type: 'select', required: true, terminologyId: TERMINOLOGIES.NOTE_TYPE },
      { name: 'content', label: 'Content', type: 'textarea', required: true, placeholder: 'Note content...' },
      { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'Add tag...' },
      { name: 'linked_characters', label: 'Linked Characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'linked_locations', label: 'Linked Locations', type: 'multi-select', terminologyId: TERMINOLOGIES.LOCATIONS },
    ],
  },
  world_rule: {
    templateId: TEMPLATES.WORLD_RULE,
    label: 'World Rule',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Rule name' },
      { name: 'domain', label: 'Domain', type: 'text', placeholder: 'e.g. Magic, Physics, Social' },
      { name: 'rule', label: 'Rule', type: 'textarea', required: true, placeholder: 'Describe the rule' },
      { name: 'implications', label: 'Implications', type: 'textarea', placeholder: 'What does this mean for the story?' },
      { name: 'exceptions', label: 'Exceptions', type: 'textarea', placeholder: 'When does this rule not apply?' },
      { name: 'related_characters', label: 'Related Characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'related_locations', label: 'Related Locations', type: 'multi-select', terminologyId: TERMINOLOGIES.LOCATIONS },
    ],
  },
}

// ── Terminology Dropdown ─────────────────────────────────

function TermSelect({
  terminologyId,
  value,
  onChange,
  placeholder,
  multiple,
}: {
  terminologyId: string
  value: string | string[]
  onChange: (val: string | string[]) => void
  placeholder?: string
  multiple?: boolean
}) {
  const { data: terms } = useTerms(terminologyId, { page_size: 100 })

  const options = useMemo(
    () =>
      (terms?.items ?? []).map((t) => ({
        value: t.value,
        label: t.label || t.value.replace(/_/g, ' '),
      })),
    [terms]
  )

  if (multiple) {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v)
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
              >
                {opt?.label ?? v}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((s) => s !== v))}
                  className="hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && !selected.includes(e.target.value)) {
              onChange([...selected, e.target.value])
            }
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:border-primary"
        >
          <option value="">{placeholder ?? 'Add...'}</option>
          {options
            .filter((o) => !selected.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      </div>
    )
  }

  return (
    <select
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:border-primary"
    >
      <option value="">{placeholder ?? 'Select...'}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ── Tags Input ───────────────────────────────────────────

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (val: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
      setInput('')
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface rounded text-xs text-text-muted"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:text-danger"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-2 py-2 text-primary hover:bg-primary/5 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main Modal Component ─────────────────────────────────

export default function CreateEntityModal({
  entityType,
  onClose,
  onCreated,
  defaults,
}: {
  entityType: string
  onClose: () => void
  onCreated?: () => void
  defaults?: Record<string, unknown>
}) {
  const config = ENTITY_CONFIGS[entityType]!
  const createDoc = useCreateDocument()

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (!config) return {}
    const initial: Record<string, unknown> = {}
    config.fields.forEach((f) => {
      if (f.type === 'multi-select' || f.type === 'tags') {
        initial[f.name] = defaults?.[f.name] ?? []
      } else if (f.type === 'number') {
        initial[f.name] = defaults?.[f.name] ?? ''
      } else {
        initial[f.name] = defaults?.[f.name] ?? ''
      }
    })
    return initial
  })

  const setField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build data — strip empty strings, convert numbers
    const data: Record<string, unknown> = {}
    config.fields.forEach((f) => {
      const val = formData[f.name]
      if (f.type === 'number') {
        const num = Number(val)
        if (!isNaN(num) && val !== '') data[f.name] = num
      } else if (f.type === 'multi-select' || f.type === 'tags') {
        const arr = val as string[]
        if (arr.length > 0) data[f.name] = arr
      } else {
        if (val !== '' && val != null) data[f.name] = val
      }
    })

    createDoc.mutate(
      { template_id: config.templateId, namespace: 'aa', data },
      {
        onSuccess: () => {
          onCreated?.()
          onClose()
        },
      }
    )
  }

  if (!config) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-text">
            New {config.label}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {config.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-text mb-1">
                {field.label}
                {field.required ? <span className="text-danger ml-0.5">*</span> : null}
              </label>

              {field.type === 'text' ? (
                <input
                  type="text"
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              ) : null}

              {field.type === 'number' ? (
                <input
                  type="number"
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              ) : null}

              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-y"
                />
              ) : null}

              {field.type === 'select' && field.terminologyId ? (
                <TermSelect
                  terminologyId={field.terminologyId}
                  value={formData[field.name] as string}
                  onChange={(val) => setField(field.name, val)}
                  placeholder={field.placeholder}
                />
              ) : null}

              {field.type === 'select' && field.options ? (
                <select
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:border-primary"
                >
                  <option value="">Select...</option>
                  {field.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : null}

              {field.type === 'multi-select' && field.terminologyId ? (
                <TermSelect
                  terminologyId={field.terminologyId}
                  value={formData[field.name] as string[]}
                  onChange={(val) => setField(field.name, val)}
                  placeholder={field.placeholder}
                  multiple
                />
              ) : null}

              {field.type === 'tags' ? (
                <TagsInput
                  value={formData[field.name] as string[]}
                  onChange={(val) => setField(field.name, val)}
                  placeholder={field.placeholder}
                />
              ) : null}
            </div>
          ))}

          {/* Error display */}
          {createDoc.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {createDoc.error.message}
            </div>
          ) : null}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={createDoc.isPending}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {createDoc.isPending ? 'Creating...' : `Create ${config.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
