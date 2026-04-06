import { useState, useMemo } from 'react'
import { useCreateDocument, useTerms, useWipClient } from '@wip/react'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import { NAMESPACE, TEMPLATES, TERMINOLOGIES } from '../lib/constants'

// ── Field Definition Types ───────────────────────────────

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'tags'

interface FieldDef {
  name: string
  type: FieldType
  required?: boolean
  terminologyId?: string   // for select/multi-select — fetches terms as options
  options?: string[]        // static options (alternative to terminology)
  autoCreateTermIn?: string // for text fields — auto-create term in this terminology before saving
}

interface EntityConfig {
  templateId: string
  fields: FieldDef[]
}

// ── Entity Configurations ────────────────────────────────

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  character: {
    templateId: TEMPLATES.CHARACTER,
    fields: [
      { name: 'name', type: 'text', required: true, autoCreateTermIn: TERMINOLOGIES.CHARACTERS },
      { name: 'role', type: 'select', required: true, terminologyId: TERMINOLOGIES.CHARACTER_ROLE },
      { name: 'age', type: 'text' },
      { name: 'description', type: 'textarea' },
      { name: 'personality', type: 'textarea' },
      { name: 'backstory', type: 'textarea' },
      { name: 'goals', type: 'textarea' },
      { name: 'flaws', type: 'textarea' },
      { name: 'voice_notes', type: 'textarea' },
    ],
  },
  location: {
    templateId: TEMPLATES.LOCATION,
    fields: [
      { name: 'name', type: 'text', required: true, autoCreateTermIn: TERMINOLOGIES.LOCATIONS },
      { name: 'type', type: 'select', terminologyId: TERMINOLOGIES.LOCATION_TYPE },
      { name: 'description', type: 'textarea' },
      { name: 'atmosphere', type: 'textarea' },
      { name: 'rules', type: 'textarea' },
      { name: 'significance', type: 'textarea' },
    ],
  },
  chapter: {
    templateId: TEMPLATES.CHAPTER,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'summary', type: 'textarea' },
      { name: 'status', type: 'select', terminologyId: TERMINOLOGIES.CHAPTER_STATUS },
      { name: 'pov_character', type: 'select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'themes', type: 'tags' },
      { name: 'notes', type: 'textarea' },
    ],
  },
  scene: {
    templateId: TEMPLATES.EVENT,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'event_type', type: 'select', required: true, terminologyId: TERMINOLOGIES.EVENT_TYPE },
      { name: 'story_time_raw', type: 'text' },
      { name: 'story_time_sort', type: 'number', required: true },
      { name: 'location', type: 'select', terminologyId: TERMINOLOGIES.LOCATIONS },
      { name: 'characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'summary', type: 'textarea', required: true },
      { name: 'plot_threads', type: 'multi-select', terminologyId: TERMINOLOGIES.PLOT_THREADS },
      { name: 'emotional_beat', type: 'text' },
    ],
  },
  plot_thread: {
    templateId: TEMPLATES.PLOT_THREAD,
    fields: [
      { name: 'title', type: 'text', required: true, autoCreateTermIn: TERMINOLOGIES.PLOT_THREADS },
      { name: 'status', type: 'select', required: true, terminologyId: TERMINOLOGIES.PLOT_THREAD_STATUS },
      { name: 'description', type: 'textarea' },
      { name: 'opened_chapter', type: 'number' },
      { name: 'characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'notes', type: 'textarea' },
    ],
  },
  note: {
    templateId: TEMPLATES.NOTE,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'note_type', type: 'select', required: true, terminologyId: TERMINOLOGIES.NOTE_TYPE },
      { name: 'content', type: 'textarea', required: true },
      { name: 'tags', type: 'tags' },
      { name: 'linked_characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'linked_locations', type: 'multi-select', terminologyId: TERMINOLOGIES.LOCATIONS },
      { name: 'linked_plot_threads', type: 'multi-select', terminologyId: TERMINOLOGIES.PLOT_THREADS },
    ],
  },
  world_rule: {
    templateId: TEMPLATES.WORLD_RULE,
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'domain', type: 'text' },
      { name: 'rule', type: 'textarea', required: true },
      { name: 'implications', type: 'textarea' },
      { name: 'exceptions', type: 'textarea' },
      { name: 'related_characters', type: 'multi-select', terminologyId: TERMINOLOGIES.CHARACTERS },
      { name: 'related_locations', type: 'multi-select', terminologyId: TERMINOLOGIES.LOCATIONS },
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
  const { t } = useTranslation()
  const { data: terms } = useTerms(terminologyId, { page_size: 100, namespace: NAMESPACE } as any)

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
          <option value="">{placeholder || t('common.add')}</option>
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
      <option value="">{placeholder || t('common.none_dash')}</option>
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
  mode = 'create',
  existingData,
}: {
  entityType: string
  onClose: () => void
  onCreated?: () => void
  defaults?: Record<string, unknown>
  mode?: 'create' | 'edit'
  existingData?: Record<string, unknown>
}) {
  const { t } = useTranslation()
  const config = ENTITY_CONFIGS[entityType]!
  const wipClient = useWipClient()
  const createDoc = useCreateDocument()
  const [submitting, setSubmitting] = useState(false)

  // For edit mode, merge existingData as the initial values
  const initialData = mode === 'edit' && existingData ? existingData : defaults

  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (!config) return {}
    const initial: Record<string, unknown> = {}
    config.fields.forEach((f) => {
      if (f.type === 'multi-select' || f.type === 'tags') {
        initial[f.name] = initialData?.[f.name] ?? []
      } else if (f.type === 'number') {
        const val = initialData?.[f.name]
        initial[f.name] = val != null ? String(val) : ''
      } else {
        initial[f.name] = initialData?.[f.name] ?? ''
      }
    })
    return initial
  })

  const setField = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const toTermValue = (text: string): string =>
    text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
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

      // Auto-create terms in index terminologies before creating the document
      // In edit mode, skip auto-term-creation for fields whose value hasn't changed
      for (const field of config.fields) {
        if (field.autoCreateTermIn && data[field.name]) {
          const rawValue = String(data[field.name])
          const existingValue = existingData?.[field.name]
          // If editing and the value hasn't changed, keep it as-is (already a term value)
          if (mode === 'edit' && rawValue === String(existingValue ?? '')) {
            continue
          }
          const termValue = toTermValue(rawValue)
          try {
            await wipClient.defStore.createTerm(field.autoCreateTermIn, {
              value: termValue,
              label: rawValue,
              aliases: rawValue !== termValue ? [rawValue] : [],
            }, { namespace: NAMESPACE })
          } catch {
            // Term may already exist — that's fine, continue
          }
          // Use the UPPER_SNAKE_CASE value in the document data
          data[field.name] = termValue
        }
      }

      createDoc.mutate(
        { template_id: config.templateId, namespace: 'aa', data },
        {
          onSuccess: () => {
            onCreated?.()
            onClose()
          },
          onSettled: () => setSubmitting(false),
        }
      )
    } catch {
      setSubmitting(false)
    }
  }

  if (!config) return null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-text">
            {mode === 'edit' ? t('entities.edit_title', { entity: t(`entities.${entityType}.label`) }) : t('entities.new_title', { entity: t(`entities.${entityType}.label`) })}
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
                {t(`entities.${entityType}.fields.${field.name}.label`)}
                {field.required ? <span className="text-danger ml-0.5">*</span> : null}
              </label>

              {field.type === 'text' ? (
                <input
                  type="text"
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={t(`entities.${entityType}.fields.${field.name}.placeholder`, { defaultValue: '' })}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              ) : null}

              {field.type === 'number' ? (
                <input
                  type="number"
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={t(`entities.${entityType}.fields.${field.name}.placeholder`, { defaultValue: '' })}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              ) : null}

              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={t(`entities.${entityType}.fields.${field.name}.placeholder`, { defaultValue: '' })}
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
                />
              ) : null}

              {field.type === 'select' && field.options ? (
                <select
                  value={formData[field.name] as string}
                  onChange={(e) => setField(field.name, e.target.value)}
                  required={field.required}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:border-primary"
                >
                  <option value="">{t('common.select')}</option>
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
                  multiple
                />
              ) : null}

              {field.type === 'tags' ? (
                <TagsInput
                  value={formData[field.name] as string[]}
                  onChange={(val) => setField(field.name, val)}
                  placeholder={t(`entities.${entityType}.fields.${field.name}.placeholder`, { defaultValue: '' })}
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
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={submitting || createDoc.isPending}
            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {submitting || createDoc.isPending
              ? t(mode === 'edit' ? 'common.saving' : 'common.creating')
              : (mode === 'edit' ? t('common.save_changes') : t('entities.create_btn', { entity: t(`entities.${entityType}.label`) }))}
          </button>
        </div>
      </div>
    </div>
  )
}
